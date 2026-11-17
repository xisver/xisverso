import { test, expect, type Page } from '@playwright/test';
import { createGame, type GameState, type MaterialId, type PetStage } from '../src/domain/game';

const SAVE_KEY = 'xisverso.save.v2';
const LEGACY_KEY = 'xisverso.save.v1';
const MATERIAL_IDS: MaterialId[] = ['berries', 'grain', 'kelp', 'root', 'herb'];

function bornState(stage: PetStage = 'adult', freeCount = 0): GameState {
  const state = createGame();
  state.pet.stage = stage;
  state.pet.growthSeconds = stage === 'egg' ? 0 : stage === 'young' ? 120 : 700;
  state.pet.needs = { hunger: 55, energy: 64, hygiene: 65, joy: 65 };
  state.freePets = Array.from({ length: freeCount }, (_, index) => ({
    ...structuredClone(state.pet),
    id: `xis-free-${index + 1}`,
    name: ['Menta', 'Brisa', 'Copo', 'Lumi'][index] ?? `Amigo ${index + 1}`,
    seed: 101 + index,
    biome: (['forest', 'coast', 'tundra'] as const)[index % 3],
    stage: 'adult' as const,
    growthSeconds: 700,
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
  await page.getByRole('button', { name: 'Comida', exact: true }).click();
  await touchPet(page);
}

async function visitBiome(page: Page, biome: 'forest' | 'coast' | 'tundra') {
  await page.getByRole('button', { name: 'Explorar biomas', exact: true }).click();
  await page.locator(`[data-biome="${biome}"]`).click();
}

async function openCollection(page: Page) {
  await page.getByRole('button', { name: 'Menú', exact: true }).click();
  await page.getByRole('button', { name: 'Mis mascotas', exact: true }).click();
}

test('un huevo recibe calor, conserva el crecimiento y nace como joven', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-stage', 'egg');
  await expect(page.locator('#pet-name')).toHaveText('Nubi');
  const initial = await readState(page);
  await page.getByRole('button', { name: 'Caricias', exact: true }).click();
  for (let index = 0; index < 3; index++) {
    await touchPet(page);
    await page.waitForTimeout(900);
  }
  const warmed = await readState(page);
  expect(warmed.pet.growthSeconds).toBeGreaterThan(initial.pet.growthSeconds + 25);
  await page.reload();
  expect((await readState(page)).pet.id).toBe(initial.pet.id);
  expect((await readState(page)).pet.growthSeconds).toBeGreaterThanOrEqual(
    warmed.pet.growthSeconds,
  );
  for (let index = 0; index < 3; index++) {
    await touchPet(page);
    await page.waitForTimeout(900);
  }
  await expect(page.locator('canvas')).toHaveAttribute('data-stage', 'young');
  await page.locator('#open-pet').click();
  await expect(page.locator('#life-label')).toHaveText('Joven');
  expect(errors).toEqual([]);
  await page.keyboard.press('Escape');
  await page.mouse.move(5, 5);
  await page.screenshot({ path: 'artifacts/xisverso-young.png' });
});

test('comer reduce Hambre y consume una porción, sin cobrar semillas al elegir la herramienta', async ({
  page,
}) => {
  await seedState(page, bornState());
  await page.goto('/');
  const before = await readState(page);
  await page.getByRole('button', { name: 'Comida', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Comida', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect((await readState(page)).inventory.food['fruit-bowl']).toBe(1);
  await expect(page.locator('#coins')).toHaveText('80');
  await touchPet(page);
  const fed = await readState(page);
  expect(fed.pet.needs.hunger).toBeLessThan(before.pet.needs.hunger);
  expect(fed.inventory.food['fruit-bowl']).toBe(0);
  expect(fed.pet.diet['fruit-bowl']).toBe(1);
  await expect(page.locator('#coins')).toHaveText('80');
  await page.locator('#open-pet').click();
  await expect(page.getByRole('progressbar', { name: 'Hambre', exact: true })).toBeVisible();
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
  await page.goto('/');
  await page.getByRole('button', { name: 'Comida', exact: true }).click();
  const initial = await petCenter(page);
  const world = await page.locator('canvas').boundingBox();
  await page.mouse.click(world!.x + world!.width * 0.76, world!.y + world!.height * 0.64);
  await expect.poll(async () => (await petCenter(page)).x).toBeGreaterThan(initial.x + 15);
  expect((await readState(page)).inventory.food['fruit-bowl']).toBe(1);
});

test('arrastrar comida hasta la mascota aplica un solo cuidado', async ({ page }) => {
  await seedState(page, bornState());
  await page.goto('/');
  const source = await page.getByRole('button', { name: 'Comida', exact: true }).boundingBox();
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
  await page.goto('/');
  await visitBiome(page, 'coast');
  await expect(page.locator('canvas')).toHaveAttribute('data-world-biome', 'coast');
  await expect(page.locator('canvas')).toHaveAttribute('data-origin-biome', 'forest');
  await expect(page.locator('#biome-name')).toHaveText('Costa Nácar');
  await page.screenshot({ path: 'artifacts/xisverso-coast-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/xisverso-coast-mobile.png' });
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
  initial.pet.growthSeconds = 650;
  await seedState(page, initial);
  await page.goto('/');
  await touchPet(page);
  await expect(page.locator('canvas')).toHaveAttribute('data-stage', 'adult');
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
  await page.screenshot({ path: 'artifacts/xisverso-collection.png' });
  await page.locator(`[data-visit-pet="${initial.pet.id}"]`).click();
  await expect(page.locator('#biome-name')).toHaveText('Costa Nácar');
  expect((await readState(page)).freePets).toHaveLength(1);
});

test('dos mascotas propias pueden jugar juntas en el bioma del adulto libre', async ({ page }) => {
  const initial = bornState('young', 1);
  await seedState(page, initial);
  await page.goto('/');
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
  await page.goto('/');
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
  await page.screenshot({ path: 'artifacts/xisverso-expedition-party.png' });
  await page.locator('#start-expedition').click();
  await page.screenshot({ path: 'artifacts/xisverso-exploration.png' });
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
  await page.getByRole('button', { name: 'Cocina y mochila', exact: true }).click();
  await page.screenshot({ path: 'artifacts/xisverso-kitchen.png' });
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

test('las cinco luciérnagas están dentro del campo, se ven y entregan una sola recompensa', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  const field = await page.locator('#game-field').boundingBox();
  expect(field!.width).toBeGreaterThan(200);
  const flies = page.locator('.firefly');
  await expect(flies).toHaveCount(5);
  for (let index = 0; index < 5; index++) {
    const fly = flies.nth(index);
    await expect(fly).toBeVisible();
    const bounds = await fly.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.x).toBeGreaterThanOrEqual(field!.x);
    expect(bounds!.y).toBeGreaterThanOrEqual(field!.y);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(field!.x + field!.width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(field!.y + field!.height);
    const body = await fly.locator('.fly-body').evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.backgroundColor, shadow: style.boxShadow, opacity: style.opacity };
    });
    expect(body.color).not.toBe('rgba(0, 0, 0, 0)');
    expect(body.shadow).not.toBe('none');
    expect(Number(body.opacity)).toBeGreaterThan(0);
    expect(
      await fly.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const top = document.elementFromPoint(
          bounds.x + bounds.width / 2,
          bounds.y + bounds.height / 2,
        );
        return top === element || (top !== null && element.contains(top));
      }),
    ).toBe(true);
  }
  await page.screenshot({ path: 'artifacts/xisverso-fireflies.png' });
  await page.getByRole('button', { name: 'Atrapar luciérnaga 1', exact: true }).click();
  await page.getByRole('button', { name: 'Atrapar luciérnaga 2', exact: true }).click();
  await expect(page.locator('#game-score')).toHaveText('2');
  await expect(page.getByRole('heading', { name: '¡Un recuerdo más juntos!' })).toBeVisible({
    timeout: 25000,
  });
  await expect(page.locator('#coins')).toHaveText('87');
  await page.waitForTimeout(400);
  await expect(page.locator('#coins')).toHaveText('87');
  await page.getByRole('button', { name: 'Volver al refugio', exact: true }).click();
  await page.reload();
  await expect(page.locator('#coins')).toHaveText('87');
});

test('los cuidados y el minijuego conservan alternativas de teclado y salir no entrega premios', async ({
  page,
}) => {
  await seedState(page, bornState());
  await page.goto('/');
  await page.keyboard.press('2');
  const proxy = page.getByRole('button', { name: 'Interactuar con Nubi', exact: true });
  await proxy.focus();
  await page.keyboard.press('Enter');
  expect((await readState(page)).inventory.food['fruit-bowl']).toBe(0);
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.getByRole('button', { name: 'Atrapar luciérnaga 1', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#game-score')).toHaveText('1');
  await page.keyboard.press('Escape');
  await expect(page.locator('#game-dialog')).not.toBeVisible();
  await expect(page.locator('#coins')).toHaveText('80');
});

for (const height of [844, 667]) {
  test(`el refugio móvil de 390x${height} mantiene el cuidado, los viajes y la cocina sin desbordar`, async ({
    page,
  }) => {
    await seedState(page, bornState());
    await page.setViewportSize({ width: 390, height });
    await page.goto('/');
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
    for (const name of ['Caricias', 'Comida', 'Burbujas', 'Siesta', 'Jugar']) {
      const box = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height);
    }
    await feedPet(page);
    expect((await readState(page)).inventory.food['fruit-bowl']).toBe(0);
    await page.mouse.move(5, 5);
    await page.screenshot({ path: `artifacts/xisverso-mobile-${height}.png` });
    await page.getByRole('button', { name: 'Cocina y mochila', exact: true }).click();
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
  await expect(page.locator('canvas')).toHaveAttribute('data-stage', 'egg');
  await expect(page.locator('#toast')).toContainText('guardado anterior estaba dañado');
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
  await blockedPage.goto('/');
  await expect(blockedPage.locator('.local-status')).toContainText('Sin guardar');
  await blockedPage.locator('#open-pet').click();
  const before = Number(await blockedPage.locator('#life-progress').getAttribute('aria-valuenow'));
  await blockedPage.keyboard.press('Escape');
  await touchPet(blockedPage);
  await blockedPage.locator('#open-pet').click();
  expect(
    Number(await blockedPage.locator('#life-progress').getAttribute('aria-valuenow')),
  ).toBeGreaterThan(before);
  await blocked.close();
});

test('otra pestaña recibe el alimento consumido y no revierte el progreso al recargar', async ({
  context,
  page,
}) => {
  await seedState(page, bornState());
  await page.goto('/');
  const second = await context.newPage();
  await second.goto('/');
  await feedPet(page);
  await second.locator('#open-pet').click();
  await expect
    .poll(async () =>
      Number(
        await second
          .getByRole('progressbar', { name: 'Hambre', exact: true })
          .getAttribute('aria-valuenow'),
      ),
    )
    .toBeLessThan(55);
  await second.reload();
  expect((await readState(second)).inventory.food['fruit-bowl']).toBe(0);
  await page.reload();
  expect((await readState(page)).inventory.food['fruit-bowl']).toBe(0);
});

test('migra v1 a v2 como adulta, invierte el hambre y conserva el respaldo anterior', async ({
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
  await page.goto('/');
  await expect(page.locator('#pet-name')).toHaveText('Luna');
  await expect(page.locator('#biome-name')).toHaveText('Costa Nácar');
  const state = await readState(page);
  expect(state.version).toBe(2);
  expect(state.pet.stage).toBe('adult');
  expect(state.pet.id).toBe('xis-test-123');
  expect(state.pet.needs.hunger).toBeGreaterThanOrEqual(34);
  expect(state.pet.needs.hunger).toBeLessThan(35);
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
  await page.goto('/');
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
  await page.screenshot({ path: 'artifacts/xisverso-landscape.png' });
});

test('recupera el respaldo v1 válido si el guardado v2 está dañado', async ({ page }) => {
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
  await page.goto('/');
  await expect(page.locator('#pet-name')).toHaveText('Azul');
  await expect(page.locator('#toast')).toContainText('Recuperamos la copia');
  await expect(page.locator('canvas')).toHaveAttribute('data-origin-biome', 'tundra');
  const recovered = await readState(page);
  expect(recovered.version).toBe(2);
  expect(recovered.pet.id).toBe(previousSave.pet.id);
  expect(recovered.pet.stage).toBe('adult');
  expect(recovered.pet.needs.hunger).toBeGreaterThanOrEqual(10);
  expect(recovered.pet.needs.hunger).toBeLessThan(11);
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
