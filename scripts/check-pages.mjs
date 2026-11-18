import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { chromium, expect } from '@playwright/test';

const root = resolve('dist');
const prefix = '/xisverso/';
const html = await readFile(resolve(root, 'index.html'), 'utf8');
assert.match(html, /src="\/xisverso\/assets\/[^" ]+\.js"/);
assert.match(html, /href="\/xisverso\/assets\/[^" ]+\.css"/);
assert.match(html, /href="\/xisverso\/favicon\.svg"/);
assert.doesNotMatch(html, /\/src\/main\.ts/);
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (!pathname.startsWith(prefix)) {
      response.writeHead(404).end();
      return;
    }
    const file = resolve(root, pathname.slice(prefix.length) || 'index.html');
    if (!file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    const contents = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    response.end(contents);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolveListen, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolveListen);
});
let browser;
try {
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().startsWith(origin) && response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(origin + prefix);
  await expect(page.locator('#welcome-dialog')).toBeVisible();
  assert.equal(await page.evaluate(() => localStorage.getItem('xisverso.save.v3')), null);
  await page.locator('input[name="starter-egg"][value="starry"]').check();
  await page.locator('input[name="starter-biome"][value="coast"]').check();
  await page.getByRole('button', { name: 'Comenzar nuestra historia', exact: true }).click();
  await expect(page.locator('#welcome-dialog')).not.toBeVisible();
  await expect(page.locator('#pet-name')).toHaveText('Nubi');
  assert.equal((await page.request.get(origin + prefix + 'favicon.svg')).status(), 200);
  const music = page.locator('#background-music');
  await expect
    .poll(() => music.evaluate((element) => !element.paused && element.currentTime > 0))
    .toBe(true);
  const musicPath = await music.evaluate((element) => new URL(element.currentSrc).pathname);
  assert.ok(musicPath.startsWith(prefix + 'audio/'));
  for (const filename of [
    'pixel-peace.mp3',
    'pixel-peace-alternativa.mp3',
    'lofi-christmas-remix.mp3',
    'morning-nap-in-the-garden.mp3',
  ]) {
    const response = await page.request.get(origin + prefix + 'audio/' + filename);
    assert.equal(response.status(), 200);
    assert.match(response.headers()['content-type'], /^audio\/mpeg/);
    assert.ok((await response.body()).length > 1000);
  }
  const saveKey = 'xisverso.save.v3';
  const before = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
  assert.equal(before.version, 3);
  assert.equal(before.pet.stage, 'egg');
  assert.equal(before.pet.biome, 'coast');
  assert.equal(before.currentBiome, 'coast');
  assert.equal(before.pet.seed % 3, 2);
  assert.equal(before.coins, 0);
  assert.ok(Object.values(before.inventory.materials).every((amount) => amount === 0));
  assert.equal(Object.keys(before.inventory.materials).length, 12);
  assert.equal(before.cooking.xp, 0);
  await page.getByRole('button', { name: 'Caricias', exact: true }).click();
  const pet = await page.locator('#pet-interact').boundingBox();
  assert.ok(pet);
  await page.mouse.click(pet.x + pet.width / 2, pet.y + pet.height / 2);
  await expect(page.locator('#pet-thought')).toContainText('calor');
  const warmed = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
  assert.equal(warmed.pet.bond, before.pet.bond);
  assert.ok(warmed.pet.growthSeconds - before.pet.growthSeconds < 5);
  await page.getByRole('button', { name: 'Alimentar', exact: true }).click();
  await expect(page.locator('#food-options')).toBeVisible();
  await expect(page.locator('#selected-food-name')).toHaveText('Cuenco de bayas');
  await expect(page.locator('#selected-food-recovery')).toHaveText('+32 Apetito');
  await page
    .locator('#food-options')
    .getByRole('button', { name: 'Cambiar alimento', exact: true })
    .click();
  await page
    .locator('#food-dialog')
    .getByRole('button', { name: 'Cocinar más raciones', exact: true })
    .click();
  await expect(page.locator('#kitchen-dialog')).toBeVisible();
  const kitchenBounds = await page.locator('#kitchen-dialog').boundingBox();
  assert.ok(kitchenBounds);
  assert.equal(kitchenBounds.x, 0);
  assert.equal(kitchenBounds.y, 0);
  assert.equal(kitchenBounds.width, page.viewportSize().width);
  assert.equal(kitchenBounds.height, page.viewportSize().height);
  await expect(page.locator('#cooking-level')).toHaveText('1');
  await expect(page.locator('#material-inventory [data-add-ingredient]')).toHaveCount(12);
  await expect(page.locator('#explore-button')).toHaveAttribute('data-locked', 'true');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Explorar', exact: true }).click();
  await expect(page.locator('#start-expedition')).toBeDisabled();
  await expect(page.locator('#exploration-wait')).toContainText(/adult[oa]/i);
  const waiting = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
  assert.equal(waiting.expedition, null);
  assert.deepEqual(waiting.explorationStarts, []);
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.locator('#welcome-dialog')).not.toBeVisible();
  const restored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
  assert.equal(restored.version, 3);
  assert.equal(restored.pet.id, before.pet.id);
  assert.ok(restored.pet.growthSeconds >= warmed.pet.growthSeconds);
  assert.deepEqual(errors, []);
  console.log(
    'PAGES_OK: recursos, cuatro MP3 con reproducción, bienvenida, cocina inmersiva, guardado v3 y exploración bloqueada sin adultos funcionan bajo /xisverso/.',
  );
} finally {
  await browser?.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
