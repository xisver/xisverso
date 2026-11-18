import assert from 'node:assert/strict';
import { createServer, loadEnv } from 'vite';
import { chromium, expect } from '@playwright/test';

// Explicit integration check: two temporary anonymous users and a temporary postcard.
// The finally block removes their postcards and authentication identities.
const env = loadEnv('development', process.cwd(), 'VITE_');
for (const key of ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'APP_ID'])
  assert.ok(env[`VITE_FIREBASE_${key}`], `Falta VITE_FIREBASE_${key}`);
assert.notEqual(
  env.VITE_FIREBASE_USE_EMULATORS,
  'true',
  'Este comando comprueba el proyecto real.',
);
const server = await createServer({ server: { host: '127.0.0.1', port: 4186, strictPort: true } });
let browser;
const pages = [];
let cleanupFailed = false;
async function openVisits(page) {
  await page.goto('http://127.0.0.1:4186/');
  if (await page.locator('#welcome-dialog').isVisible())
    await page.getByRole('button', { name: 'Comenzar nuestra historia', exact: true }).click();
  await page.getByRole('button', { name: 'Menú', exact: true }).click();
  await page
    .locator('#menu-dialog')
    .getByRole('button', { name: 'Visitar amigos', exact: true })
    .click();
}
try {
  await server.listen();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (let i = 0; i < 2; i++) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    pages.push(await context.newPage());
  }
  const [owner, guest] = pages;
  await openVisits(owner);
  await owner.locator('#world-name').fill('Comprobación temporal de Xisverso');
  await owner.getByRole('button', { name: 'Compartir mi refugio', exact: true }).click();
  await expect(owner.locator('#visit-message')).toContainText('ya se puede visitar', {
    timeout: 45000,
  });
  const code = await owner.locator('#my-visit-code').inputValue();
  assert.match(code, /^[A-Za-z0-9_-]{20,128}$/u);
  await openVisits(guest);
  const before = await guest.evaluate(() => JSON.parse(localStorage.getItem('xisverso.save.v3')));
  await guest.locator('#friend-code').fill(code);
  await guest
    .locator('#visit-form')
    .getByRole('button', { name: 'Visitar refugio', exact: true })
    .click();
  await expect(guest.locator('#visit-dialog')).toBeVisible({ timeout: 45000 });
  await expect(guest.locator('#visit-title')).toHaveText('Comprobación temporal de Xisverso');
  const after = await guest.evaluate(() => JSON.parse(localStorage.getItem('xisverso.save.v3')));
  for (const key of ['coins', 'xp', 'inventory', 'decorations', 'currentBiome'])
    assert.deepEqual(after[key], before[key]);
  for (const key of ['id', 'name', 'seed', 'biome']) assert.equal(after.pet[key], before.pet[key]);
  await guest.getByRole('button', { name: 'Volver a mi refugio', exact: true }).last().click();
  await owner.getByRole('button', { name: 'Retirar mi refugio', exact: true }).click();
  await expect(owner.locator('#visit-message')).toContainText('dejó de estar disponible', {
    timeout: 30000,
  });
  await guest.getByRole('button', { name: 'Menú', exact: true }).click();
  await guest
    .locator('#menu-dialog')
    .getByRole('button', { name: 'Visitar amigos', exact: true })
    .click();
  await guest.locator('#friend-code').fill(code);
  await guest
    .locator('#visit-form')
    .getByRole('button', { name: 'Visitar refugio', exact: true })
    .click();
  await expect(guest.locator('#visit-message')).toContainText('retiró la visita', {
    timeout: 30000,
  });
  console.log(
    `FIREBASE_LIVE_OK: ${env.VITE_FIREBASE_PROJECT_ID}; publicar, visitar desde otra sesión y retirar funcionan sin cambiar la partida del invitado.`,
  );
} finally {
  for (const page of pages) {
    try {
      await page.evaluate(async () => {
        const fixture = await import('/tests/firebase-client.fixture.ts');
        await fixture.removeTestIdentity();
      });
    } catch (error) {
      cleanupFailed = true;
      console.error(
        'No se pudo completar la limpieza de una identidad de comprobación:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  await browser?.close();
  await server.close();
  if (cleanupFailed) process.exitCode = 1;
}
