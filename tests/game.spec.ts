import { test, expect, type Page } from '@playwright/test';
import {
  createGame,
  LIFECYCLE,
  type GameState,
  type MaterialId,
  type PetStage,
} from '../src/domain/game';

const SAVE_KEY = 'xisverso.save.v3';
const V2_KEY = 'xisverso.save.v2';
const LEGACY_KEY = 'xisverso.save.v1';
const ADULT_SECONDS = LIFECYCLE.eggSeconds + LIFECYCLE.babySeconds + LIFECYCLE.youngSeconds;
const MATERIAL_IDS: MaterialId[] = ['berries', 'grain', 'kelp', 'root', 'herb'];

function bornState(stage: PetStage = 'adult', freeCount = 0): GameState {
  const state = createGame();
  // Care and kitchen fixtures bring their own supplies; new games are tested separately.
  state.inventory.materials = { berries: 2, grain: 1, kelp: 0, root: 0, herb: 1 };
  state.inventory.food = { 'fruit-bowl': 1, 'sea-soup': 0, 'root-stew': 0 };
  state.pet.stage = stage;
  state.pet.growthSeconds = {
    egg: 0,
    baby: LIFECYCLE.eggSeconds + 60,
    young: LIFECYCLE.eggSeconds + LIFECYCLE.babySeconds + 60,
    adult: ADULT_SECONDS + 60,
  }[stage];
  state.pet.needs = { appetite: 45, energy: 64, hygiene: 65, joy: 65 };
  state.freePets = Array.from({ length: freeCount }, (_, index) => ({
    ...structuredClone(state.pet),
    id: `xis-free-${index + 1}`,
    name: ['Menta', 'Brisa', 'Copo', 'Lumi'][index] ?? `Amigo ${index + 1}`,
    seed: 101 + index,
    biome: (['forest', 'coast', 'tundra'] as const)[index % 3],
    stage: 'adult' as const,
    growthSeconds: ADULT_SECONDS + 60,
    habitatBiome: 'forest' as const,
    releasedAt: state.lastUpdated - 1000,
  }));
  return state;
}

async function seedState(page: Page, state: GameState) {
  await page.addInitScript(
    ({ key, raw }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, raw);
    },
    { key: SAVE_KEY, raw: JSON.stringify(state) },
  );
}

async function gotoGame(page: Page) {
  await page.goto('/');
  await expect(page.locator('#pet-name')).toBeAttached();
  if (await page.locator('#welcome-dialog').isVisible()) {
    await page.getByRole('button', { name: 'Comenzar nuestra historia', exact: true }).click();
  }
}
async function readState(page: Page): Promise<GameState> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
}

async function petCenter(page: Page) {
  const box = await page.locator('#pet-interact').boundingBox();
  expect(box).not.toBeNull();
  return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
}

async function touchPet(page: Page) {
  const center = await petCenter(page);
  await page.mouse.click(center.x, center.y);
}

async function feedPet(page: Page) {
  await page.getByRole('button', { name: 'Alimentar', exact: true }).click();
  await page
    .locator('#food-options')
    .getByRole('button', { name: 'Cambiar alimento', exact: true })
    .click();
  await page.locator('#food-choice-list [data-select-food="fruit-bowl"]').click();
  await touchPet(page);
}

async function openKitchen(page: Page) {
  await page.getByRole('button', { name: 'Alimentar', exact: true }).click();
  await page
    .locator('#food-options')
    .getByRole('button', { name: 'Cambiar alimento', exact: true })
    .click();
  await page
    .locator('#food-dialog')
    .getByRole('button', { name: 'Cocinar más raciones', exact: true })
    .click();
}

async function openActivity(page: Page, kind: string) {
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await expect(page.locator('#games-dialog [data-minigame]')).toHaveCount(6);
  await page.locator(`[data-minigame="${kind}"]`).click();
  await expect(page.locator('#game-dialog')).toBeVisible();
  await expect(page.locator('#game-field canvas')).toHaveAttribute('aria-label', /Nubi participa/);
}

async function visitBiome(page: Page, biome: 'forest' | 'coast' | 'tundra') {
  await page.getByRole('button', { name: 'Explorar biomas', exact: true }).click();
  await page.locator(`[data-biome="${biome}"]`).click();
}

async function openCollection(page: Page) {
  await page.getByRole('button', { name: 'Menú', exact: true }).click();
  await page.getByRole('button', { name: 'Mis mascotas', exact: true }).click();
}

for (const [stage, threshold, next, label] of [
  ['egg', LIFECYCLE.eggSeconds, 'baby', 'Bebé'],
  ['baby', LIFECYCLE.eggSeconds + LIFECYCLE.babySeconds, 'young', 'Joven'],
  ['young', ADULT_SECONDS, 'adult', 'Adulto'],
] as const) {
  test(`la etapa ${stage} cambia a ${next} por tiempo real y persiste`, async ({ page }) => {
    const initial = bornState(stage);
    initial.pet.growthSeconds = threshold - 60;
    await page.clock.install({ time: new Date(initial.lastUpdated) });
    await seedState(page, initial);
    await gotoGame(page);
    await expect(page.locator('#pet-scene')).toHaveAttribute('data-stage', stage);
    await page.clock.fastForward(61000);
    await expect(page.locator('#pet-scene')).toHaveAttribute('data-stage', next);
    await page.locator('#open-pet').click();
    await expect(page.locator('#life-label')).toHaveText(label);
    await page.reload();
    expect((await readState(page)).pet.stage).toBe(next);
    expect((await readState(page)).pet.id).toBe(initial.pet.id);
  });
}

test('las caricias siguen funcionando con ánimo lleno sin generar vínculo ni crecimiento adicional', async ({
  page,
}) => {
  const initial = bornState('baby');
  initial.pet.needs.joy = 100;
  await page.clock.install({ time: new Date(initial.lastUpdated) });
  await seedState(page, initial);
  await gotoGame(page);
  const eventsBefore = await page.locator('#journal-events .journal-event').count();
  await page.locator('#pet-interact').focus();
  for (let index = 0; index < 3; index++) await page.keyboard.press('Enter');
  await expect(page.locator('#journal-events .journal-event')).toHaveCount(eventsBefore + 3);
  const after = await readState(page);
  expect(after.pet.bond).toBe(initial.pet.bond);
  expect(after.xp).toBe(initial.xp);
  expect(after.coins).toBe(initial.coins);
  expect(after.pet.growthSeconds - initial.pet.growthSeconds).toBeLessThan(3);
  await expect(page.locator('#pet-thought')).toContainText('Contigo');
});

test('acariciar con ánimo bajo mejora el vínculo una vez y luego permite seguir sin acumularlo', async ({
  page,
}) => {
  const initial = bornState('baby');
  initial.pet.needs.joy = 29;
  await page.clock.install({ time: new Date(initial.lastUpdated) });
  await seedState(page, initial);
  await gotoGame(page);
  await touchPet(page);
  const comforted = await readState(page);
  expect(comforted.pet.needs.joy).toBeGreaterThan(50);
  expect(comforted.pet.bond).toBe(initial.pet.bond + 2);
  expect(comforted.xp).toBe(initial.xp);
  expect(comforted.coins).toBe(initial.coins);
  await touchPet(page);
  const repeated = await readState(page);
  expect(repeated.pet.needs.joy).toBeGreaterThan(comforted.pet.needs.joy);
  expect(repeated.pet.bond).toBe(comforted.pet.bond);
  expect(repeated.xp).toBe(initial.xp);
  expect(repeated.coins).toBe(initial.coins);
});
test('comer aumenta Apetito y consume una porción, sin cobrar puntos al elegir la herramienta', async ({
  page,
}) => {
  await seedState(page, bornState());
  await gotoGame(page);
  const before = await readState(page);
  await page.getByRole('button', { name: 'Alimentar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Alimentar', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect((await readState(page)).inventory.food['fruit-bowl']).toBe(1);
  await expect(page.locator('#coins')).toHaveText('0');
  await touchPet(page);
  const fed = await readState(page);
  expect(fed.pet.needs.appetite).toBeGreaterThan(before.pet.needs.appetite);
  expect(fed.inventory.food['fruit-bowl']).toBe(0);
  expect(fed.pet.diet['fruit-bowl']).toBe(1);
  await expect(page.locator('#coins')).toHaveText('0');
  await page.locator('#open-pet').click();
  await expect(page.getByRole('progressbar', { name: 'Apetito', exact: true })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Saciedad', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cambiar nombre' }).click();
  await page.getByLabel('Su nombre', { exact: true }).fill('Menta');
  await page.getByRole('button', { name: 'Guardar nombre' }).click();
  await page.reload();
  await expect(page.locator('#pet-name')).toHaveText('Menta');
  expect((await readState(page)).inventory.food['fruit-bowl']).toBe(0);
});

test('una mascota nacida camina al tocar el suelo sin gastar la comida seleccionada', async ({
  page,
}) => {
  await seedState(page, bornState('young'));
  await gotoGame(page);
  await page.getByRole('button', { name: 'Alimentar', exact: true }).click();
  const initial = await petCenter(page);
  const world = await page.locator('#pet-scene').boundingBox();
  await page.mouse.click(world!.x + world!.width * 0.76, world!.y + world!.height * 0.64);
  await expect.poll(async () => (await petCenter(page)).x).toBeGreaterThan(initial.x + 15);
  expect((await readState(page)).inventory.food['fruit-bowl']).toBe(1);
});

test('arrastrar comida hasta la mascota aplica un solo cuidado', async ({ page }) => {
  await seedState(page, bornState());
  await gotoGame(page);
  const source = await page.getByRole('button', { name: 'Alimentar', exact: true }).boundingBox();
  const target = await petCenter(page);
  await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 12 });
  await page.mouse.up();
  const state = await readState(page);
  expect(state.inventory.food['fruit-bowl']).toBe(0);
  expect(state.pet.diet['fruit-bowl']).toBe(1);
  expect(state.activities).toBe(1);
});

test('viajar cambia el paisaje y conserva el origen, la identidad y la dieta', async ({ page }) => {
  const initial = bornState();
  initial.pet.diet['fruit-bowl'] = 3;
  await seedState(page, initial);
  await gotoGame(page);
  await visitBiome(page, 'coast');
  await expect(page.locator('#pet-scene')).toHaveAttribute('data-world-biome', 'coast');
  await expect(page.locator('#pet-scene')).toHaveAttribute('data-origin-biome', 'forest');
  await expect(page.locator('#biome-name')).toHaveText('Costa Nácar');
  await page.setViewportSize({ width: 390, height: 844 });
  await visitBiome(page, 'tundra');
  await page.reload();
  const state = await readState(page);
  expect(state.currentBiome).toBe('tundra');
  expect(state.pet.biome).toBe('forest');
  expect(state.pet.id).toBe(initial.pet.id);
  expect(state.pet.seed).toBe(initial.pet.seed);
  expect(state.pet.diet).toEqual(initial.pet.diet);
  await page.locator('#open-pet').click();
  await expect(page.locator('#origin-biome')).toContainText('Bosque Susurro');
});

test('un joven crece a adulto y queda libre sin desaparecer al criar otro huevo', async ({
  page,
}) => {
  const initial = bornState('young');
  initial.pet.growthSeconds = ADULT_SECONDS - 60;
  await page.clock.install({ time: new Date(initial.lastUpdated) });
  await seedState(page, initial);
  await gotoGame(page);
  await page.clock.fastForward(61000);
  await expect(page.locator('#pet-scene')).toHaveAttribute('data-stage', 'adult');
  await visitBiome(page, 'coast');
  await page.locator('#open-pet').click();
  await page.locator('#release-pet').click();
  await expect(page.locator('#release-dialog')).toBeVisible();
  await page.locator('#confirm-release').click();
  const next = await readState(page);
  expect(next.pet.id).not.toBe(initial.pet.id);
  expect(next.pet.stage).toBe('egg');
  expect(next.pet.biome).toBe('coast');
  expect(next.freePets).toHaveLength(1);
  expect(next.freePets[0].id).toBe(initial.pet.id);
  expect(next.freePets[0].biome).toBe('forest');
  expect(next.freePets[0].habitatBiome).toBe('coast');
  await visitBiome(page, 'forest');
  await openCollection(page);
  await expect(page.locator('#free-pet-count')).toContainText('1');
  await page.locator(`[data-visit-pet="${initial.pet.id}"]`).click();
  await expect(page.locator('#biome-name')).toHaveText('Costa Nácar');
  expect((await readState(page)).freePets).toHaveLength(1);
});

test('dos mascotas propias pueden jugar juntas en el bioma del adulto libre', async ({ page }) => {
  const initial = bornState('young', 1);
  await seedState(page, initial);
  await gotoGame(page);
  await openCollection(page);
  await page.locator('[data-socialize="xis-free-1"]').click();
  const after = await readState(page);
  expect(after.pet.bond).toBeGreaterThan(initial.pet.bond);
  expect(after.freePets[0].bond).toBeGreaterThan(initial.freePets[0].bond);
  expect(after.pet.needs.joy).toBeGreaterThan(initial.pet.needs.joy);
  expect(after.freePets[0].needs.joy).toBeGreaterThan(initial.freePets[0].needs.joy);
  expect(after.pet.biome).toBe(initial.pet.biome);
  expect(after.coins).toBe(initial.coins);
});

test('explora con tres compañeros, reclama una vez, cocina y alimenta con los materiales', async ({
  page,
}) => {
  test.setTimeout(50000);
  const initial = bornState('adult', 4);
  await seedState(page, initial);
  await gotoGame(page);
  await page.getByRole('button', { name: 'Explorar', exact: true }).click();
  const companions = page.locator('#expedition-party input[data-companion]');
  await expect(companions).toHaveCount(4);
  for (let index = 0; index < 3; index++) await companions.nth(index).check();
  await expect(page.locator('#party-count')).toContainText('3');
  await expect(companions.nth(3)).toBeDisabled();
  await companions.nth(0).uncheck();
  await expect(companions.nth(3)).toBeEnabled();
  await companions.nth(3).check();
  await expect(companions.nth(0)).toBeDisabled();
  await page.locator('#start-expedition').click();
  const departure = await readState(page);
  expect(departure.expedition?.companionIds).toHaveLength(3);
  expect(departure.expedition?.biome).toBe('forest');
  const reward = departure.expedition!.rewards;
  expect(reward.berries).toBeGreaterThanOrEqual(8);
  await page.keyboard.press('Escape');
  await visitBiome(page, 'coast');
  await page.reload();
  expect((await readState(page)).expedition?.biome).toBe('forest');
  await page.getByRole('button', { name: 'Explorar', exact: true }).click();
  await expect(page.locator('#claim-expedition')).toBeEnabled({ timeout: 25000 });
  await page.locator('#claim-expedition').click();
  const collected = await readState(page);
  expect(collected.expedition).toBeNull();
  for (const material of MATERIAL_IDS)
    expect(collected.inventory.materials[material]).toBe(
      initial.inventory.materials[material] + reward[material],
    );
  await page.keyboard.press('Escape');
  await openKitchen(page);
  await page.locator('[data-craft="fruit-bowl"]').click();
  const cooked = await readState(page);
  expect(cooked.inventory.food['fruit-bowl']).toBe(collected.inventory.food['fruit-bowl'] + 1);
  expect(cooked.inventory.materials.berries).toBe(collected.inventory.materials.berries - 2);
  expect(cooked.inventory.materials.grain).toBe(collected.inventory.materials.grain - 1);
  await page.keyboard.press('Escape');
  await feedPet(page);
  const fed = await readState(page);
  expect(fed.inventory.food['fruit-bowl']).toBe(cooked.inventory.food['fruit-bowl'] - 1);
  expect(fed.pet.diet['fruit-bowl']).toBe(1);
  await page.reload();
  expect((await readState(page)).inventory.materials).toEqual(cooked.inventory.materials);
  expect((await readState(page)).expedition).toBeNull();
});

for (const stage of ['egg', 'baby', 'young'] as const) {
  test(`la mascota principal ${stage} no puede explorar aunque tenga adultos libres`, async ({
    page,
  }) => {
    const initial = bornState(stage, 3);
    await seedState(page, initial);
    await gotoGame(page);
    await page.getByRole('button', { name: 'Explorar', exact: true }).click();
    await expect(page.locator('#start-expedition')).toBeDisabled();
    await expect(page.locator('#explore-dialog')).toContainText(/adult/i);
    await page.reload();
    await page.getByRole('button', { name: 'Explorar', exact: true }).click();
    await expect(page.locator('#start-expedition')).toBeDisabled();
    const saved = await readState(page);
    expect(saved.pet.stage).toBe(stage);
    expect(saved.freePets).toHaveLength(3);
    expect(saved.expedition).toBeNull();
    expect(saved.explorationStarts).toHaveLength(0);
  });
}

test('el adulto conserva la espera de ocho horas y el límite diario al recargar', async ({
  page,
}) => {
  const initial = bornState('adult');
  // A game day starts at midnight in the configured Mexico City calendar.
  initial.lastUpdated = Date.parse('2026-11-18T06:00:00.000Z');
  await page.clock.install({ time: new Date(initial.lastUpdated) });
  await seedState(page, initial);
  await gotoGame(page);
  await page.getByRole('button', { name: 'Explorar', exact: true }).click();
  await expect(page.locator('#start-expedition')).toBeEnabled();
  await page.locator('#start-expedition').click();
  const first = await readState(page);
  expect(first.explorationStarts).toHaveLength(1);
  const firstStart = first.explorationStarts[0];
  await page.clock.fastForward(21000);
  await expect(page.locator('#claim-expedition')).toBeEnabled();
  await page.locator('#claim-expedition').click();
  await expect(page.locator('#start-expedition')).toBeDisabled();
  await expect(page.locator('#exploration-remaining')).toContainText('1');
  await expect(page.locator('#exploration-wait')).not.toBeEmpty();
  await page.reload();
  await page.getByRole('button', { name: 'Explorar', exact: true }).click();
  await expect(page.locator('#start-expedition')).toBeDisabled();
  expect((await readState(page)).explorationStarts).toHaveLength(1);
  const now = await page.evaluate(() => Date.now());
  await page.clock.fastForward(firstStart + 8 * 3600000 + 1000 - now);
  await expect(page.locator('#start-expedition')).toBeEnabled();
  await page.locator('#start-expedition').click();
  expect((await readState(page)).explorationStarts).toHaveLength(2);
  await page.clock.fastForward(21000);
  await page.locator('#claim-expedition').click();
  await expect(page.locator('#start-expedition')).toBeDisabled();
  await expect(page.locator('#exploration-remaining')).toContainText('0');
  await page.reload();
  await page.getByRole('button', { name: 'Explorar', exact: true }).click();
  await expect(page.locator('#start-expedition')).toBeDisabled();
  const afterSecond = await page.evaluate(() => Date.now());
  await page.clock.fastForward(Date.parse('2026-11-19T06:00:01.000Z') - afterSecond);
  await expect(page.locator('#start-expedition')).toBeEnabled();
  await expect(page.locator('#exploration-remaining')).toContainText('2');
});

test('el huevo espera a nacer antes de jugar las seis aventuras', async ({ page }) => {
  await gotoGame(page);
  const fresh = await readState(page);
  expect(fresh.coins).toBe(0);
  expect(Object.values(fresh.inventory.materials)).toEqual([0, 0, 0, 0, 0]);
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await expect(page.locator('#minigame-list [data-minigame]')).toHaveCount(6);
  await expect(page.locator('#games-notice')).toContainText('nazca');
  for (const button of await page.locator('#minigame-list [data-minigame]').all())
    await expect(button).toBeDisabled();
});

test('jugar sube el ánimo y entrega puntos una sola vez que permiten comprar decoración', async ({
  page,
}) => {
  const initial = bornState('baby');
  // Previous savings plus this completed round must unlock the first decoration.
  initial.coins = 39;
  initial.pet.needs.joy = 40;
  await page.clock.install({ time: new Date(initial.lastUpdated) });
  await seedState(page, initial);
  await gotoGame(page);
  await openActivity(page, 'fireflies');
  const flies = page.locator('#game-field .firefly');
  await expect(flies).toHaveCount(5);
  const field = await page.locator('#game-field').boundingBox();
  for (const fly of await flies.all()) {
    const bounds = await fly.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.x).toBeGreaterThanOrEqual(field!.x);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(field!.x + field!.width);
  }
  const beforeX = await page.locator('#game-field canvas').getAttribute('data-pet-x');
  await flies.first().click();
  await expect(page.locator('#game-score')).toHaveText('0');
  await expect(page.locator('#game-score')).toHaveText('1', { timeout: 6000 });
  expect(await page.locator('#game-field canvas').getAttribute('data-pet-x')).not.toBe(beforeX);
  expect((await readState(page)).coins).toBe(initial.coins);
  await page.clock.fastForward(21000);
  const completed = await readState(page);
  const reward = completed.coins - initial.coins;
  expect(reward).toBeGreaterThanOrEqual(1);
  expect(reward).toBeLessThanOrEqual(5);
  expect(completed.inventory).toEqual(initial.inventory);
  expect(completed.pet.needs.joy).toBeGreaterThan(initial.pet.needs.joy);
  await expect(page.locator('#game-result')).toContainText(`+${reward} puntos`);
  await page.clock.fastForward(1000);
  expect((await readState(page)).coins).toBe(completed.coins);
  await page.getByRole('button', { name: 'Volver al refugio', exact: true }).click();
  await page.reload();
  expect((await readState(page)).coins).toBe(completed.coins);
  await page.getByRole('button', { name: 'Menú', exact: true }).click();
  await page.getByRole('button', { name: 'Decoraciones', exact: true }).click();
  await page.locator('[data-buy-decoration="flowers"]').click();
  const decorated = await readState(page);
  expect(decorated.decorations).toContain('flowers');
  expect(decorated.coins).toBe(completed.coins - 40);
  expect(decorated.inventory).toEqual(initial.inventory);
  await page.reload();
  expect((await readState(page)).decorations).toContain('flowers');
  expect((await readState(page)).coins).toBe(decorated.coins);
});

for (const kind of ['fruit', 'puddles', 'rhythm', 'memory', 'ball'] as const) {
  test(`la mascota consigue un acierto en ${kind}; salir antes no entrega puntos`, async ({
    page,
  }) => {
    if (kind === 'puddles') await page.clock.install({ time: new Date() });
    await page.addInitScript(() => {
      Math.random = () => 0.5;
    });
    await seedState(page, bornState('baby'));
    await gotoGame(page);
    await openActivity(page, kind);
    const field = page.locator('#game-field');
    const pet = field.locator('canvas');
    if (kind === 'fruit') {
      await expect(page.locator('#game-score')).not.toHaveText('0', { timeout: 7000 });
    } else if (kind === 'puddles') {
      // Freeze the browser clock before targeting the jump. CI latency must not
      // move the puddle between observing it and pressing the jump button.
      const pauseAt = await page.evaluate(() => Date.now() + 100);
      await page.clock.pauseAt(new Date(pauseAt));
      for (let step = 0; step < 35; step++) {
        if (Number(await field.getAttribute('data-puddle-x')) <= 0.47) break;
        await page.clock.runFor(100);
      }
      const puddleX = Number(await field.getAttribute('data-puddle-x'));
      expect(puddleX).toBeGreaterThan(0.41);
      expect(puddleX).toBeLessThanOrEqual(0.47);
      await page.getByRole('button', { name: 'Saltar', exact: true }).click();
      await page.clock.runFor(650);
      await expect(page.locator('#game-score')).toHaveText('1');
    } else if (kind === 'rhythm') {
      await expect
        .poll(async () => Number(await field.getAttribute('data-rhythm-phase')), {
          intervals: [50],
        })
        .toBeGreaterThan(900);
      const direction = Number(await field.getAttribute('data-rhythm-direction'));
      await page.keyboard.press(['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'][direction]);
      await expect(page.locator('#game-score')).toHaveText('1');
    } else if (kind === 'memory') {
      const observed = await field.evaluate(async (element) => {
        const canvas = element.querySelector('canvas')!;
        const ctx = canvas.getContext('2d')!;
        const points = [
          { x: 0.25, y: 0.47 },
          { x: 0.43, y: 0.6 },
          { x: 0.62, y: 0.47 },
          { x: 0.78, y: 0.64 },
        ];
        const sequence: number[] = [];
        let last = -1;
        const start = performance.now();
        return await new Promise<number[]>((resolve) => {
          function sample() {
            const active = points.findIndex((point) => {
              const pixel = ctx.getImageData(
                point.x * canvas.width - (14 * canvas.width) / canvas.clientWidth,
                (point.y + 0.015) * canvas.height,
                1,
                1,
              ).data;
              return pixel[0] > 235 && pixel[1] > 220 && pixel[2] < 195;
            });
            if (active >= 0 && active !== last) sequence.push(active);
            last = active;
            if (
              (element as HTMLElement).dataset.memoryPhase === 'answer' ||
              performance.now() - start > 4000
            )
              resolve(sequence);
            else requestAnimationFrame(sample);
          }
          sample();
        });
      });
      expect(observed.length).toBeGreaterThanOrEqual(2);
      for (const [index, stone] of observed.entries()) {
        await page.getByRole('button', { name: `Piedra ${stone + 1}`, exact: true }).click();
        if (index < observed.length - 1)
          await expect(field.locator('.activity-status')).toContainText('Qué piedra sigue');
      }
      await expect(page.locator('#game-score')).toHaveText('1', { timeout: 4000 });
    } else {
      const bounds = await pet.boundingBox();
      // Go around the ball before approaching from the left; crossing diagonally pushes it sideways.
      await page.mouse.click(bounds!.x + bounds!.width * 0.2, bounds!.y + bounds!.height * 0.75);
      await expect
        .poll(async () => Number(await pet.getAttribute('data-pet-x')))
        .toBeLessThan(0.22);
      await page.mouse.click(bounds!.x + bounds!.width * 0.2, bounds!.y + bounds!.height * 0.61);
      await expect
        .poll(async () => Number(await pet.getAttribute('data-pet-y')))
        .toBeCloseTo(0.61, 2);
      await page.mouse.click(bounds!.x + bounds!.width * 0.94, bounds!.y + bounds!.height * 0.61);
      await expect(page.locator('#game-score')).toHaveText('1', { timeout: 7000 });
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('#game-dialog')).not.toBeVisible();
    expect((await readState(page)).coins).toBe(0);
  });
}

test('el teclado permite alimentar y cancelar un minijuego sin obtener puntos', async ({
  page,
}) => {
  await seedState(page, bornState());
  await gotoGame(page);
  await page.keyboard.press('2');
  await page.locator('#pet-interact').focus();
  await page.keyboard.press('Enter');
  expect((await readState(page)).inventory.food['fruit-bowl']).toBe(0);
  await openActivity(page, 'fireflies');
  await page.getByRole('button', { name: 'Atrapar luciérnaga 1', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#game-score')).toHaveText('1', { timeout: 6000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('#game-dialog')).not.toBeVisible();
  expect((await readState(page)).coins).toBe(0);
});
for (const height of [844, 667]) {
  test(`el refugio móvil de 390x${height} mantiene el cuidado, los viajes y la cocina sin desbordar`, async ({
    page,
  }) => {
    await seedState(page, bornState());
    await page.setViewportSize({ width: 390, height });
    await gotoGame(page);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
    for (const name of ['Caricias', 'Alimentar', 'Burbujas', 'Siesta', 'Jugar']) {
      const box = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height);
    }
    await feedPet(page);
    expect((await readState(page)).inventory.food['fruit-bowl']).toBe(0);
    await page.mouse.move(5, 5);
    await openKitchen(page);
    await expect(page.locator('[data-craft="fruit-bowl"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await visitBiome(page, 'coast');
    await expect(page.locator('#biome-name')).toHaveText('Costa Nácar');
  });
}

test('un guardado dañado o el almacenamiento bloqueado no impiden incubar', async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript((key) => localStorage.setItem(key, '{invalido'), SAVE_KEY);
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#welcome-dialog')).toBeVisible();
  await expect(page.locator('#toast')).toContainText('guardado anterior estaba dañado');
  await page.getByRole('button', { name: 'Comenzar nuestra historia', exact: true }).click();
  await expect(page.locator('#pet-scene')).toHaveAttribute('data-stage', 'egg');
  await context.close();
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
    Storage.prototype.getItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
  });
  const blockedPage = await blocked.newPage();
  await gotoGame(blockedPage);
  await expect(blockedPage.locator('.local-status')).toContainText('Sin guardar');
  await blockedPage.locator('#open-pet').click();
  await blockedPage.locator('#rename-button').click();
  await blockedPage.getByLabel('Su nombre', { exact: true }).fill('Una sesión');
  await blockedPage.getByRole('button', { name: 'Guardar nombre', exact: true }).click();
  await blockedPage.waitForTimeout(1200);
  await expect(blockedPage.locator('#pet-name')).toHaveText('Una sesión');
  await blocked.close();
});

test('otra pestaña recibe el alimento consumido y no revierte el progreso al recargar', async ({
  context,
  page,
}) => {
  await seedState(page, bornState());
  await gotoGame(page);
  const second = await context.newPage();
  await gotoGame(second);
  await feedPet(page);
  await second.locator('#open-pet').click();
  await expect
    .poll(async () =>
      Number(
        await second
          .getByRole('progressbar', { name: 'Apetito', exact: true })
          .getAttribute('aria-valuenow'),
      ),
    )
    .toBeGreaterThan(70);
  await second.reload();
  expect((await readState(second)).inventory.food['fruit-bowl']).toBe(0);
  await page.reload();
  expect((await readState(page)).inventory.food['fruit-bowl']).toBe(0);
});

test('migra v1 a v3 como adulta, conserva apetito y mantiene el respaldo anterior', async ({
  page,
}) => {
  const previousSave = {
    version: 1,
    pet: {
      id: 'xis-test-123',
      name: 'Luna',
      seed: 42,
      biome: 'coast',
      needs: { hunger: 66, energy: 74, hygiene: 81, joy: 63 },
      bond: 30,
    },
    coins: 123,
    level: 1,
    xp: 35,
    lastUpdated: Date.now(),
    activities: 4,
    miniGameBest: 11,
  };
  const raw = JSON.stringify(previousSave);
  await page.addInitScript(
    ({ key, raw }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
    },
    { key: LEGACY_KEY, raw },
  );
  await gotoGame(page);
  await expect(page.locator('#pet-name')).toHaveText('Luna');
  await expect(page.locator('#biome-name')).toHaveText('Costa Nácar');
  const state = await readState(page);
  expect(state.version).toBe(3);
  expect(state.pet.stage).toBe('adult');
  expect(state.pet.id).toBe('xis-test-123');
  expect(state.pet.needs.appetite).toBeGreaterThan(65);
  expect(state.pet.needs.appetite).toBeLessThanOrEqual(66);
  expect(state.coins).toBe(123);
  expect(state.xp).toBe(35);
  expect(state.miniGameBest).toBe(11);
  expect(await page.evaluate((key) => localStorage.getItem(key), LEGACY_KEY)).toBe(raw);
  await page.reload();
  expect((await readState(page)).pet.id).toBe('xis-test-123');
});

test('el refugio horizontal mantiene una mascota nacida y respeta movimiento reducido', async ({
  page,
}) => {
  await seedState(page, bornState());
  await page.setViewportSize({ width: 844, height: 390 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoGame(page);
  const initial = await petCenter(page);
  expect(initial.y).toBeGreaterThan(155);
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await petCenter(page)).x).toBeGreaterThan(initial.x + 30);
  await feedPet(page);
  expect((await readState(page)).inventory.food['fruit-bowl']).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
    true,
  );
  await page.mouse.move(5, 5);
});

test('recupera el respaldo v1 válido si el guardado v3 está dañado', async ({ page }) => {
  const previousSave = {
    version: 1,
    pet: {
      id: 'xis-backup-123',
      name: 'Azul',
      seed: 55,
      biome: 'tundra',
      needs: { hunger: 90, energy: 84, hygiene: 70, joy: 80 },
      bond: 26,
    },
    coins: 245,
    level: 2,
    xp: 120,
    lastUpdated: Date.now(),
    activities: 7,
    miniGameBest: 14,
  };
  const backup = JSON.stringify(previousSave);
  await page.addInitScript(
    ({ key, legacyKey, backup }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, '{corrupto');
      if (localStorage.getItem(legacyKey) === null) localStorage.setItem(legacyKey, backup);
    },
    { key: SAVE_KEY, legacyKey: LEGACY_KEY, backup },
  );
  await gotoGame(page);
  await expect(page.locator('#pet-name')).toHaveText('Azul');
  await expect(page.locator('#toast')).toContainText('Recuperamos la copia');
  await expect(page.locator('#pet-scene')).toHaveAttribute('data-origin-biome', 'tundra');
  const recovered = await readState(page);
  expect(recovered.version).toBe(3);
  expect(recovered.pet.id).toBe(previousSave.pet.id);
  expect(recovered.pet.stage).toBe('adult');
  expect(recovered.pet.needs.appetite).toBeGreaterThan(89);
  expect(recovered.pet.needs.appetite).toBeLessThanOrEqual(90);
  expect(recovered.coins).toBe(245);
  expect(recovered.xp).toBe(120);
  expect(recovered.level).toBe(2);
  expect(recovered.miniGameBest).toBe(14);
  expect(await page.evaluate((key) => localStorage.getItem(key), LEGACY_KEY)).toBe(backup);
  await page.reload();
  await expect(page.locator('#pet-name')).toHaveText('Azul');
  expect((await readState(page)).pet.id).toBe(previousSave.pet.id);
  expect(await page.evaluate((key) => localStorage.getItem(key), LEGACY_KEY)).toBe(backup);
});

test('la primera visita permite elegir huevo Estelar y criar en la costa, y guarda la elección', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#welcome-dialog')).toBeVisible();
  await expect(page.locator('input[name="starter-egg"]')).toHaveCount(3);
  await expect(page.locator('input[name="starter-biome"]')).toHaveCount(3);
  expect(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.locator('input[name="starter-egg"][value="starry"]').check();
  await page.locator('input[name="starter-biome"][value="coast"]').check();
  await page.getByRole('button', { name: 'Comenzar nuestra historia', exact: true }).click();
  await expect(page.locator('#welcome-dialog')).not.toBeVisible();
  const state = await readState(page);
  expect(state.pet.seed % 3).toBe(2);
  expect(state.pet.stage).toBe('egg');
  expect(state.pet.biome).toBe('coast');
  expect(state.currentBiome).toBe('coast');
  expect(state.pet.growthSeconds).toBeLessThan(2);
  await expect(page.locator('#pet-scene')).toHaveAttribute('data-world-biome', 'coast');
  await expect(page.locator('#pet-scene')).toHaveAttribute('data-origin-biome', 'coast');
  await page.reload();
  await expect(page.locator('#welcome-dialog')).not.toBeVisible();
  const restored = await readState(page);
  expect(restored.pet.id).toBe(state.pet.id);
  expect(restored.pet.seed).toBe(state.pet.seed);
  expect(restored.currentBiome).toBe('coast');
});

test('elegir y esperar en la bienvenida no guarda ni incuba antes de confirmar', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-11-17T18:00:00Z') });
  await page.goto('/');
  await expect(page.locator('#welcome-dialog')).toBeVisible();
  await page.locator('input[name="starter-egg"][value="striped"]').check();
  await page.locator('input[name="starter-biome"][value="tundra"]').check();
  await page.clock.fastForward(65000);
  await page.keyboard.press('Escape');
  await expect(page.locator('#welcome-dialog')).toBeVisible();
  await expect(page.locator('#pet-scene')).toHaveAttribute('data-stage', 'egg');
  expect(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.reload();
  await expect(page.locator('#welcome-dialog')).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.getByRole('button', { name: 'Comenzar nuestra historia', exact: true }).click();
  const created = await readState(page);
  expect(created.pet.stage).toBe('egg');
  expect(created.pet.growthSeconds).toBeLessThan(2);
});

test('una partida v3 válida entra directamente al refugio y conserva su compañero', async ({
  page,
}) => {
  const previous = bornState('adult', 1);
  previous.pet.name = 'Nela';
  previous.currentBiome = 'tundra';
  previous.coins = 321;
  previous.inventory.food['sea-soup'] = 3;
  await seedState(page, previous);
  await page.goto('/');
  await expect(page.locator('#welcome-dialog')).not.toBeVisible();
  await expect(page.locator('#pet-name')).toHaveText('Nela');
  const restored = await readState(page);
  expect(restored.pet.id).toBe(previous.pet.id);
  expect(restored.pet.stage).toBe('adult');
  expect(restored.pet.biome).toBe(previous.pet.biome);
  expect(restored.currentBiome).toBe('tundra');
  expect(restored.coins).toBe(321);
  expect(restored.inventory).toEqual(previous.inventory);
  expect(restored.freePets.map((pet) => pet.id)).toEqual(previous.freePets.map((pet) => pet.id));
});

test('la bienvenida permite escoger y comenzar solo con teclado', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#welcome-dialog')).toBeVisible();
  await page.locator('input[name="starter-egg"][value="speckled"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('input[name="starter-egg"][value="striped"]')).toBeChecked();
  await page.locator('input[name="starter-biome"][value="forest"]').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('input[name="starter-biome"][value="tundra"]')).toBeChecked();
  await page.getByRole('button', { name: 'Comenzar nuestra historia', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#welcome-dialog')).not.toBeVisible();
  const state = await readState(page);
  expect(state.pet.seed % 3).toBe(1);
  expect(state.pet.biome).toBe('tundra');
});

test('la selección inicial cabe en móvil y deja alcanzar el botón para comenzar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const dialog = page.locator('#welcome-dialog');
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('input[name="starter-egg"][value="starry"]').check();
  await page.locator('input[name="starter-biome"][value="tundra"]').check();
  const begin = page.getByRole('button', { name: 'Comenzar nuestra historia', exact: true });
  await begin.scrollIntoViewIfNeeded();
  const button = await begin.boundingBox();
  expect(button!.y).toBeGreaterThanOrEqual(0);
  expect(button!.y + button!.height).toBeLessThanOrEqual(667);
  await begin.click();
  await expect(dialog).not.toBeVisible();
  expect((await readState(page)).pet.biome).toBe('tundra');
});

test('otra pestaña en bienvenida retoma la partida iniciada sin sobrescribirla', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect(page.locator('#welcome-dialog')).toBeVisible();
  const other = await context.newPage();
  await other.goto('/');
  await expect(other.locator('#welcome-dialog')).toBeVisible();
  await other.locator('input[name="starter-egg"][value="striped"]').check();
  await other.locator('input[name="starter-biome"][value="tundra"]').check();
  await page.locator('input[name="starter-egg"][value="starry"]').check();
  await page.locator('input[name="starter-biome"][value="coast"]').check();
  await page.getByRole('button', { name: 'Comenzar nuestra historia', exact: true }).click();
  const first = await readState(page);
  await expect(other.locator('#welcome-dialog')).not.toBeVisible();
  await expect(other.locator('#pet-scene')).toHaveAttribute('data-origin-biome', 'coast');
  const adopted = await readState(other);
  expect(adopted.pet.id).toBe(first.pet.id);
  expect(adopted.pet.seed).toBe(first.pet.seed);
  expect(adopted.currentBiome).toBe('coast');
  await other.reload();
  await expect(other.locator('#welcome-dialog')).not.toBeVisible();
  expect((await readState(other)).pet.id).toBe(first.pet.id);
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`Alimentar muestra una ficha compacta y conserva el cambio de ración en ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const initial = bornState('baby');
    initial.inventory.food['sea-soup'] = 2;
    await seedState(page, initial);
    await gotoGame(page);
    const feed = page.getByRole('button', { name: 'Alimentar', exact: true });
    await feed.click();
    const panel = page.locator('#food-options');
    await expect(panel).toBeVisible();
    await expect(panel.locator('#selected-food-name')).toHaveText('Cuenco de bayas');
    await expect(panel.locator('#selected-food-recovery')).toHaveText('+32 Apetito');
    const change = panel.getByRole('button', { name: 'Cambiar alimento', exact: true });
    await expect(change).toHaveText('>');
    await expect(panel.getByRole('button')).toHaveCount(1);
    const buttonBounds = await feed.boundingBox();
    const panelBounds = await panel.boundingBox();
    expect(panelBounds!.y + panelBounds!.height).toBeLessThanOrEqual(buttonBounds!.y + 1);
    expect(panelBounds!.width).toBeLessThanOrEqual(220);
    expect(panelBounds!.height).toBeLessThanOrEqual(75);
    expect(panelBounds!.x).toBeGreaterThanOrEqual(0);
    expect(panelBounds!.x + panelBounds!.width).toBeLessThanOrEqual(viewport.width);
    await change.click();
    await expect(page.locator('#food-dialog')).toBeVisible();
    await page.locator('#food-choice-list [data-select-food="sea-soup"]').click();
    const selected = await readState(page);
    expect(selected.selectedFood).toBe('sea-soup');
    expect(selected.inventory).toEqual(initial.inventory);
    expect(selected.coins).toBe(initial.coins);
    await page.reload();
    await feed.click();
    await expect(panel.locator('#selected-food-name')).toHaveText('Sopa de la costa');
    await expect(panel.locator('#selected-food-recovery')).toHaveText('+44 Apetito');
    await touchPet(page);
    const fed = await readState(page);
    expect(fed.inventory.food['sea-soup']).toBe(1);
    expect(fed.inventory.food['fruit-bowl']).toBe(1);
    expect(fed.pet.diet['sea-soup']).toBe(1);
    expect(fed.pet.needs.appetite).toBeGreaterThan(selected.pet.needs.appetite);
  });
}

for (const stage of ['egg', 'baby', 'young', 'adult'] as const) {
  test(`el panel de ${stage} conserva progreso y Apetito sin explicaciones de duración ni escala`, async ({
    page,
  }) => {
    await seedState(page, bornState(stage));
    await gotoGame(page);
    const durationText = /\b(?:horas?|días?|minutos?)\b|\b\d+\s*[hd]\b/iu;
    await expect(page.locator('#interaction-hint')).not.toContainText(durationText);
    await page.locator('#open-pet').click();
    await expect(page.locator('#life-progress')).toBeVisible();
    await expect(page.locator('#pet-dialog')).not.toContainText(durationText);
    const appetite = page.getByRole('progressbar', { name: 'Apetito', exact: true });
    await expect(appetite).toBeVisible();
    await expect(appetite).toHaveAttribute('aria-valuemin', '0');
    await expect(appetite).toHaveAttribute('aria-valuemax', '100');
    await expect(appetite).not.toHaveAttribute('aria-valuetext', /lleno|hambre/iu);
    await expect(page.locator('#pet-dialog')).not.toContainText(
      /100\s*=|0\s*=|100 lleno|0 con mucha hambre/iu,
    );
  });
}

test('la profundidad cambia el tamaño sin separar los pies del suelo', async ({ page }) => {
  await seedState(page, bornState('young'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoGame(page);
  const before = await page.locator('#pet-interact').boundingBox();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  const farther = await page.locator('#pet-interact').boundingBox();
  expect(farther!.height).toBeLessThan(before!.height);
  expect(farther!.y + farther!.height).toBeLessThan(before!.y + before!.height);
  const world = await page.locator('#pet-scene').boundingBox();
  const groundY = Number(await page.locator('#pet-scene').getAttribute('data-pet-ground-y'));
  expect(farther!.y + farther!.height).toBeCloseTo(world!.y + groundY * world!.height, 0);
});

test('los adultos visitan de vez en cuando y permanecen en su colección cuando se van', async ({
  page,
}) => {
  const id = 'xis-free-1';
  let hash = 0;
  for (const character of id) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
  const base =
    Math.floor(Date.now() / 180000) * 180000 + (((180 - (hash % 180)) % 180) + 12) * 1000;
  const initial = bornState('baby', 1);
  initial.lastUpdated = base;
  initial.freePets[0].releasedAt = base - 1000;
  await page.clock.install({ time: new Date(base) });
  await seedState(page, initial);
  await gotoGame(page);
  await expect(page.locator('#pet-scene')).toHaveAttribute('data-companions', '1');
  await page.clock.fastForward(35000);
  await expect(page.locator('#pet-scene')).toHaveAttribute('data-companions', '0');
  await openCollection(page);
  await expect(page.locator('#free-pet-count')).toHaveText('1');
  expect((await readState(page)).freePets[0].id).toBe(id);
});

test('comprar decoración descuenta puntos una vez y conserva la compra al recargar', async ({
  page,
}) => {
  const initial = bornState('baby');
  initial.coins = 80;
  await seedState(page, initial);
  await gotoGame(page);
  await page.getByRole('button', { name: 'Menú', exact: true }).click();
  await page
    .locator('#menu-dialog')
    .getByRole('button', { name: 'Decoraciones', exact: true })
    .click();
  await page.locator('[data-buy-decoration="flowers"]').click();
  await expect(page.locator('#shop-points')).toHaveText('40');
  await expect(page.locator('[data-buy-decoration="flowers"]')).toBeDisabled();
  await expect(page.locator('[data-buy-decoration="lantern"]')).toBeDisabled();
  expect((await readState(page)).decorations).toEqual(['flowers']);
  await page.reload();
  expect((await readState(page)).decorations).toEqual(['flowers']);
  expect((await readState(page)).coins).toBe(40);
});

test('música y efectos se silencian por separado y conservan sus volúmenes', async ({ page }) => {
  await gotoGame(page);
  await page.getByRole('button', { name: 'Sonido y música', exact: true }).click();
  await page.locator('#music-enabled').uncheck();
  await expect(page.locator('#effects-enabled')).toBeChecked();
  await page.locator('#effects-enabled').uncheck();
  await page.locator('#music-volume').evaluate((element) => {
    (element as HTMLInputElement).value = '37';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('#effects-volume').evaluate((element) => {
    (element as HTMLInputElement).value = '61';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const settings = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('xisverso.audio.v1')!),
  );
  expect(settings).toEqual({
    music: false,
    effects: false,
    musicVolume: 0.37,
    effectsVolume: 0.61,
  });
  await page.reload();
  await page.getByRole('button', { name: 'Sonido y música', exact: true }).click();
  await expect(page.locator('#music-enabled')).not.toBeChecked();
  await expect(page.locator('#effects-enabled')).not.toBeChecked();
  await expect(page.locator('#music-volume')).toHaveValue('37');
  await expect(page.locator('#effects-volume')).toHaveValue('61');
});

test('la música espera un gesto y reproduce las cuatro canciones sin repetir hasta completar la ronda', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/audio/')) requests.push(request.url());
  });
  await page.goto('/');
  await expect(page.locator('#welcome-dialog')).toBeVisible();
  const music = page.locator('#background-music');
  await expect(music).toHaveCount(1);
  expect(await music.evaluate((element) => (element as HTMLAudioElement).paused)).toBe(true);
  expect(await music.getAttribute('src')).toBeNull();
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: 'Comenzar nuestra historia', exact: true }).click();
  await expect
    .poll(() =>
      music.evaluate(
        (element) =>
          !(element as HTMLAudioElement).paused && (element as HTMLAudioElement).currentTime > 0,
      ),
    )
    .toBe(true);
  const tracks = [
    await music.evaluate((element) => new URL((element as HTMLAudioElement).currentSrc).pathname),
  ];
  for (let index = 0; index < 4; index++) {
    const previous = tracks.at(-1)!;
    await music.evaluate((element) =>
      (element as HTMLAudioElement).dispatchEvent(new Event('ended')),
    );
    await expect
      .poll(() =>
        music.evaluate(
          (element) =>
            new URL((element as HTMLAudioElement).getAttribute('src') ?? '', document.baseURI)
              .pathname,
        ),
      )
      .not.toBe(previous);
    await expect
      .poll(() =>
        music.evaluate(
          (element) =>
            !(element as HTMLAudioElement).paused &&
            (element as HTMLAudioElement).readyState >= 2 &&
            (element as HTMLAudioElement).currentTime > 0,
        ),
      )
      .toBe(true);
    const next = await music.evaluate(
      (element) => new URL((element as HTMLAudioElement).currentSrc).pathname,
    );
    expect(next).not.toBe(previous);
    tracks.push(next);
  }
  expect([...new Set(tracks.slice(0, 4))].sort()).toEqual([
    '/audio/lofi-christmas-remix.mp3',
    '/audio/morning-nap-in-the-garden.mp3',
    '/audio/pixel-peace-alternativa.mp3',
    '/audio/pixel-peace.mp3',
  ]);
  expect(await music.evaluate((element) => (element as HTMLAudioElement).error)).toBeNull();
});

test('la canción conserva su posición al silenciar, cambiar de bioma y ocultar el juego', async ({
  page,
}) => {
  await gotoGame(page);
  const music = page.locator('#background-music');
  await expect
    .poll(() =>
      music.evaluate(
        (element) =>
          !(element as HTMLAudioElement).paused && (element as HTMLAudioElement).readyState >= 2,
      ),
    )
    .toBe(true);
  const track = await music.evaluate((element) => (element as HTMLAudioElement).currentSrc);
  await music.evaluate((element) => {
    (element as HTMLAudioElement).currentTime = 12;
  });
  await page.getByRole('button', { name: 'Sonido y música', exact: true }).click();
  await page.locator('#music-enabled').uncheck();
  await expect
    .poll(() => music.evaluate((element) => (element as HTMLAudioElement).paused))
    .toBe(true);
  await expect(page.locator('#effects-enabled')).toBeChecked();
  const pausedAt = await music.evaluate((element) => (element as HTMLAudioElement).currentTime);
  await page.waitForTimeout(150);
  expect(await music.evaluate((element) => (element as HTMLAudioElement).currentTime)).toBe(
    pausedAt,
  );
  await page.locator('#music-enabled').check();
  await expect
    .poll(() => music.evaluate((element) => !(element as HTMLAudioElement).paused))
    .toBe(true);
  expect(
    await music.evaluate((element) => (element as HTMLAudioElement).currentTime),
  ).toBeGreaterThanOrEqual(pausedAt);
  await page.keyboard.press('Escape');
  await visitBiome(page, 'coast');
  expect(await music.evaluate((element) => (element as HTMLAudioElement).currentSrc)).toBe(track);
  expect(
    await music.evaluate((element) => (element as HTMLAudioElement).currentTime),
  ).toBeGreaterThanOrEqual(pausedAt);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect
    .poll(() => music.evaluate((element) => (element as HTMLAudioElement).paused))
    .toBe(true);
  const hiddenAt = await music.evaluate((element) => (element as HTMLAudioElement).currentTime);
  await page.waitForTimeout(150);
  expect(await music.evaluate((element) => (element as HTMLAudioElement).currentTime)).toBe(
    hiddenAt,
  );
  await page.evaluate(() => {
    delete (document as unknown as Record<string, unknown>).hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect
    .poll(() =>
      music.evaluate(
        (element, resumeFrom) =>
          !(element as HTMLAudioElement).paused &&
          (element as HTMLAudioElement).currentTime > resumeFrom,
        hiddenAt,
      ),
    )
    .toBe(true);
  expect(await music.evaluate((element) => (element as HTMLAudioElement).currentSrc)).toBe(track);
});

test('si una canción no carga la lista continúa con otra pista reproducible', async ({ page }) => {
  let failed = '';
  await page.route('**/audio/*.mp3', async (route) => {
    if (!failed) {
      failed = route.request().url();
      await route.abort('failed');
    } else await route.continue();
  });
  await gotoGame(page);
  const music = page.locator('#background-music');
  await expect
    .poll(() =>
      music.evaluate(
        (element) =>
          !(element as HTMLAudioElement).paused && (element as HTMLAudioElement).currentTime > 0,
      ),
    )
    .toBe(true);
  expect(failed).toContain('/audio/');
  expect(await music.evaluate((element) => (element as HTMLAudioElement).currentSrc)).not.toBe(
    failed,
  );
  expect(await music.evaluate((element) => (element as HTMLAudioElement).error)).toBeNull();
});
test('abrir visitas no inventa amigos ni conecta Firebase sin elegir una acción', async ({
  page,
}) => {
  const remote: string[] = [];
  page.on('request', (request) => {
    if (
      /(?:identitytoolkit|securetoken|firestore)\.googleapis\.com|firebaseio\.com/.test(
        request.url(),
      )
    )
      remote.push(request.url());
  });
  await gotoGame(page);
  await page.getByRole('button', { name: 'Menú', exact: true }).click();
  await page
    .locator('#menu-dialog')
    .getByRole('button', { name: 'Visitar amigos', exact: true })
    .click();
  await expect(page.locator('#community-dialog')).toBeVisible();
  await expect(page.locator('#friend-code')).toHaveValue('');
  await expect(page.locator('#share-code-panel')).not.toBeVisible();
  if ((await page.locator('#firebase-status').textContent())?.includes('esperan')) {
    await expect(page.locator('#connect-visits')).toBeDisabled();
    await expect(page.locator('#publish-world')).toBeDisabled();
  }
  expect(remote).toEqual([]);
});

test('si solo falla escribir, conserva la sesión y vuelve a guardar al recuperarse', async ({
  page,
}) => {
  await seedState(page, bornState('baby'));
  await gotoGame(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as unknown as { restoreWrites: () => void }).restoreWrites = () => {
      Storage.prototype.setItem = original;
    };
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
  });
  await page.locator('#open-pet').click();
  await page.locator('#rename-button').click();
  await page.getByLabel('Su nombre', { exact: true }).fill('Luna sin archivo');
  await page.getByRole('button', { name: 'Guardar nombre', exact: true }).click();
  await expect(page.locator('.local-status')).toContainText('Sin guardar');
  await page.waitForTimeout(2200);
  await expect(page.locator('#pet-name')).toHaveText('Luna sin archivo');
  expect((await readState(page)).pet.name).toBe('Nubi');
  await page.evaluate(() => (window as unknown as { restoreWrites: () => void }).restoreWrites());
  await page.locator('#open-pet').click();
  await page.locator('#rename-button').click();
  await page.getByLabel('Su nombre', { exact: true }).fill('Luna recuperada');
  await page.getByRole('button', { name: 'Guardar nombre', exact: true }).click();
  expect((await readState(page)).pet.name).toBe('Luna recuperada');
});

test('migra v2 conservando al joven y convirtiendo hambre en apetito una sola vez', async ({
  page,
}) => {
  const current = bornState('young');
  const { decorations: _decorations, ...previous } = current;
  const old = {
    ...previous,
    version: 2,
    pet: {
      ...current.pet,
      stage: 'young',
      growthSeconds: 120,
      needs: { hunger: 55, energy: 64, hygiene: 65, joy: 65 },
    },
  };
  const raw = JSON.stringify(old);
  await page.addInitScript(
    ({ key, raw }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
    },
    { key: V2_KEY, raw },
  );
  await page.goto('/');
  await expect(page.locator('#welcome-dialog')).not.toBeVisible();
  const migrated = await readState(page);
  expect(migrated.version).toBe(3);
  expect(migrated.pet.stage).toBe('young');
  expect(migrated.pet.id).toBe(old.pet.id);
  expect(migrated.pet.needs.appetite).toBeCloseTo(45, 1);
  expect(await page.evaluate((key) => localStorage.getItem(key), V2_KEY)).toBe(raw);
  await page.reload();
  expect((await readState(page)).pet.needs.appetite).toBeCloseTo(45, 1);
});
