import { test, expect, type Page } from '@playwright/test';

const SAVE_KEY = 'xisverso.save.v1';

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

test('selecciona una herramienta sin gastar y cuida tocando a su mascota', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tu refugio en Xisverso' })).toBeAttached();
  await expect(page.locator('#pet-name')).toHaveText('Nubi');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Comida', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Comida', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('#coins')).toHaveText('80');
  await touchPet(page);
  await expect(page.locator('#coins')).toHaveText('75');
  await page.getByRole('button', { name: 'Cómo está Nubi', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Cómo está Nubi' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Saciedad' })).toHaveAttribute(
    'aria-valuenow',
    '100',
  );
  await page.getByRole('button', { name: 'Cambiar nombre' }).click();
  await page.getByLabel('Su nombre', { exact: true }).fill('Menta');
  await page.getByRole('button', { name: 'Guardar nombre' }).click();
  await expect(page.locator('#pet-name')).toHaveText('Menta');
  await page.reload();
  await expect(page.locator('#pet-name')).toHaveText('Menta');
  await expect(page.locator('#coins')).toHaveText('75');
  const pixels = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!;
    return Array.from(ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data);
  });
  expect(pixels[3]).toBe(255);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'artifacts/xisverso-desktop.png' });
});

test('tocar el suelo hace caminar sin aplicar la herramienta seleccionada', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Comida', exact: true }).click();
  const initial = await petCenter(page);
  const world = await page.locator('canvas').boundingBox();
  await page.mouse.click(world!.x + world!.width * 0.76, world!.y + world!.height * 0.64);
  await expect
    .poll(async () => (await petCenter(page)).x, { timeout: 5000 })
    .toBeGreaterThan(initial.x + 15);
  await expect(page.locator('#coins')).toHaveText('80');
});

test('puede llevar la comida desde la herramienta hasta la mascota', async ({ page }) => {
  await page.goto('/');
  const source = await page.getByRole('button', { name: 'Comida', exact: true }).boundingBox();
  const target = await petCenter(page);
  await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator('#coins')).toHaveText('75');
  const state = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
  expect(state.activities).toBe(1);
});

test('explora tres biomas conservando la identidad y consulta los recuerdos y la comunidad pendiente', async ({
  page,
}) => {
  await page.goto('/');
  const id = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).pet.id, SAVE_KEY);
  await page.getByRole('button', { name: 'Explorar biomas', exact: true }).click();
  await page.locator('[data-biome="coast"]').click();
  await expect(page.locator('#biome-name')).toHaveText('Costa Nácar');
  await expect(page.locator('#travel-dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Explorar biomas', exact: true }).click();
  await page.locator('[data-biome="tundra"]').click();
  await expect(page.locator('#biome-name')).toHaveText('Tundra Aurora');
  await page.reload();
  await expect(page.locator('#biome-name')).toHaveText('Tundra Aurora');
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).pet.id, SAVE_KEY),
  ).toBe(id);
  await page.getByRole('button', { name: 'Menú', exact: true }).click();
  await page.getByRole('button', { name: 'Comunidad' }).click();
  await expect(page.getByText('En la ruta de desarrollo', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Menú', exact: true }).click();
  await page.getByRole('button', { name: 'Mi bitácora' }).click();
  await expect(page.locator('#journal-events')).toContainText('se alegra de verte');
});

test('completa el minijuego y liquida una sola recompensa', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.getByRole('button', { name: 'Atrapar luciérnaga 1', exact: true }).click();
  await page.getByRole('button', { name: 'Atrapar luciérnaga 2', exact: true }).click();
  await expect(page.locator('#game-score')).toHaveText('2');
  await expect(page.getByRole('heading', { name: '¡Un recuerdo más juntos!' })).toBeVisible({
    timeout: 25000,
  });
  await expect(page.locator('#coins')).toHaveText('87');
  await page.waitForTimeout(500);
  await expect(page.locator('#coins')).toHaveText('87');
  await page.getByRole('button', { name: 'Volver al refugio', exact: true }).click();
  await page.reload();
  await expect(page.locator('#coins')).toHaveText('87');
  await page.getByRole('button', { name: 'Cómo está Nubi', exact: true }).click();
  await expect(page.locator('#best-score')).toHaveText('Su mejor aventura: 2 luciérnagas');
});

test('salir del minijuego no otorga premios y la interacción admite teclado', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('2');
  await expect(page.getByRole('button', { name: 'Comida', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const proxy = page.getByRole('button', { name: 'Interactuar con Nubi', exact: true });
  await proxy.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#coins')).toHaveText('75');
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.getByRole('button', { name: 'Atrapar luciérnaga 1', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#game-score')).toHaveText('1');
  await page.keyboard.press('Escape');
  await expect(page.locator('#game-dialog')).not.toBeVisible();
  await expect(page.locator('#coins')).toHaveText('75');
});

for (const height of [844, 667]) {
  test(`el refugio móvil de 390x${height} cabe sin scroll y conserva sus controles`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
      true,
    );
    for (const name of ['Caricias', 'Comida', 'Burbujas', 'Siesta', 'Jugar']) {
      const control = page.getByRole('button', { name, exact: true });
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }
    await feedPet(page);
    await expect(page.locator('#coins')).toHaveText('75');
    await expect(page.locator('#toast')).not.toHaveClass(/visible/, { timeout: 5000 });
    await page.screenshot({ path: `artifacts/xisverso-mobile-${height}.png` });
    await page.getByRole('button', { name: 'Explorar biomas', exact: true }).click();
    await expect(page.locator('[data-biome=coast]')).toBeVisible();
  });
}

test('guardado dañado y almacenamiento bloqueado no impiden jugar', async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript((key) => localStorage.setItem(key, '{invalido'), SAVE_KEY);
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#pet-name')).toHaveText('Nubi');
  await expect(page.locator('#toast')).toContainText('guardado anterior estaba dañado');
  await context.close();
  const blockedContext = await browser.newContext();
  await blockedContext.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
    Storage.prototype.getItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
  });
  const blockedPage = await blockedContext.newPage();
  await blockedPage.goto('/');
  await expect(blockedPage.locator('.local-status')).toContainText('Sin guardar');
  await feedPet(blockedPage);
  await expect(blockedPage.locator('#coins')).toHaveText('75');
  await blockedContext.close();
});

test('otra pestaña recibe los cuidados y no sobrescribe el progreso al recargar', async ({
  context,
  page,
}) => {
  await page.goto('/');
  const second = await context.newPage();
  await second.goto('/');
  await feedPet(page);
  await expect(page.locator('#coins')).toHaveText('75');
  await expect(second.locator('#coins')).toHaveText('75');
  await second.reload();
  await expect(second.locator('#coins')).toHaveText('75');
  await page.reload();
  await expect(page.locator('#coins')).toHaveText('75');
});

test('el rediseño conserva una partida anterior del esquema v1', async ({ page }) => {
  await page.addInitScript((key) => {
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
    localStorage.setItem(key, JSON.stringify(previousSave));
  }, SAVE_KEY);
  await page.goto('/');
  await expect(page.locator('#pet-name')).toHaveText('Luna');
  await expect(page.locator('#biome-name')).toHaveText('Costa Nácar');
  await expect(page.locator('#coins')).toHaveText('123');
  await page.getByRole('button', { name: 'Cómo está Luna', exact: true }).click();
  await expect(page.locator('#xp-label')).toHaveText('35 / 100 XP');
  await expect(page.locator('#best-score')).toHaveText('Su mejor aventura: 11 luciérnagas');
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).pet.id, SAVE_KEY),
  ).toBe('xis-test-123');
});

test('el refugio horizontal mantiene la mascota jugable y admite movimiento reducido', async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const initial = await petCenter(page);
  expect(initial.y).toBeGreaterThan(165);
  const belt = await page
    .getByRole('navigation', { name: 'Herramientas del refugio' })
    .boundingBox();
  expect(initial.y + 65).toBeLessThan(belt!.y);
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await petCenter(page)).x).toBeGreaterThan(initial.x + 30);
  await feedPet(page);
  await expect(page.locator('#coins')).toHaveText('75');
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
    true,
  );
  await page.mouse.move(0, 0);
  await page.screenshot({ path: 'artifacts/xisverso-landscape.png' });
});
