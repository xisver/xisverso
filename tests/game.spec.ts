import { test, expect } from '@playwright/test';

const SAVE_KEY = 'xisverso.save.v1';

test('cuida, cambia el nombre y restaura el progreso al recargar', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tu lugar feliz.' })).toBeVisible();
  await expect(page.locator('#pet-name')).toHaveText('Nubi');
  await page.getByRole('button', { name: 'Dar de comer' }).click();
  await expect(page.locator('#coins')).toHaveText('75');
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
  await page.screenshot({ path: 'artifacts/xisverso-desktop.png', fullPage: true });
});

test('explora tres biomas conservando la identidad y expone la comunidad pendiente', async ({
  page,
}) => {
  await page.goto('/');
  const id = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).pet.id, SAVE_KEY);
  await page.getByRole('button', { name: 'Explorar biomas', exact: true }).click();
  await page.locator('[data-biome="coast"]').click();
  await expect(page.locator('#biome-name')).toHaveText('Costa Nácar');
  await page.getByRole('button', { name: 'Explorar biomas', exact: true }).click();
  await page.locator('[data-biome="tundra"]').click();
  await expect(page.locator('#biome-name')).toHaveText('Tundra Aurora');
  await page.reload();
  await expect(page.locator('#biome-name')).toHaveText('Tundra Aurora');
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).pet.id, SAVE_KEY),
  ).toBe(id);
  await page.getByRole('button', { name: 'Comunidad', exact: true }).click();
  await expect(page.getByText('En la ruta de desarrollo', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mi bitácora', exact: true }).click();
  await expect(page.locator('#journal-events')).toContainText('se alegra de verte');
});

test('completa el minijuego y liquida una sola recompensa', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Vamos a jugar' }).click();
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
  await expect(page.locator('#best-score')).toHaveText('Tu mejor aventura: 2 luciérnagas');
});

test('salir del minijuego no otorga premios y funciona con teclado', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Vamos a jugar' }).click();
  const fly = page.getByRole('button', { name: 'Atrapar luciérnaga 1', exact: true });
  await fly.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#game-score')).toHaveText('1');
  await page.keyboard.press('Escape');
  await expect(page.locator('#game-dialog')).not.toBeVisible();
  await expect(page.locator('#coins')).toHaveText('80');
});

test('el diseño móvil no desborda y los controles siguen accesibles', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Dar de comer' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Dar de comer' }).click();
  await expect(page.locator('#coins')).toHaveText('75');
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('#toast')).not.toHaveClass(/visible/, { timeout: 5000 });
  await page.screenshot({ path: 'artifacts/xisverso-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Explorar biomas', exact: true }).click();
  await expect(page.locator('[data-biome=coast]')).toBeVisible();
});

test('guardado dañado y almacenamiento bloqueado no impiden jugar', async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript((key) => localStorage.setItem(key, '{invalido'), SAVE_KEY);
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#pet-name')).toHaveText('Nubi');
  await expect(page.getByRole('status')).toContainText('guardado anterior estaba dañado');
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
  await blockedPage.getByRole('button', { name: 'Dar de comer' }).click();
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
  await page.getByRole('button', { name: 'Dar de comer' }).click();
  await expect(page.locator('#coins')).toHaveText('75');
  await expect(second.locator('#coins')).toHaveText('75');
  await second.reload();
  await expect(second.locator('#coins')).toHaveText('75');
  await page.reload();
  await expect(page.locator('#coins')).toHaveText('75');
});
