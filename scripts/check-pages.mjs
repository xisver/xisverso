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
  assert.equal(await page.evaluate(() => localStorage.getItem('xisverso.save.v2')), null);
  await page.locator('input[name="starter-egg"][value="starry"]').check();
  await page.locator('input[name="starter-biome"][value="coast"]').check();
  await page.getByRole('button', { name: 'Comenzar nuestra historia', exact: true }).click();
  await expect(page.locator('#welcome-dialog')).not.toBeVisible();
  await expect(page.locator('#pet-name')).toHaveText('Nubi');
  assert.equal((await page.request.get(origin + prefix + 'favicon.svg')).status(), 200);
  const saveKey = 'xisverso.save.v2';
  const before = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
  assert.equal(before.version, 2);
  assert.equal(before.pet.stage, 'egg');
  assert.equal(before.pet.biome, 'coast');
  assert.equal(before.currentBiome, 'coast');
  assert.equal(before.pet.seed % 3, 2);
  await page.getByRole('button', { name: 'Caricias', exact: true }).click();
  const pet = await page.locator('#pet-interact').boundingBox();
  assert.ok(pet);
  await page.mouse.click(pet.x + pet.width / 2, pet.y + pet.height / 2);
  await expect
    .poll(async () =>
      page.evaluate((key) => JSON.parse(localStorage.getItem(key)).pet.growthSeconds, saveKey),
    )
    .toBeGreaterThan(before.pet.growthSeconds + 8);
  const warmed = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
  await page.reload();
  await expect(page.locator('#welcome-dialog')).not.toBeVisible();
  const restored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
  assert.equal(restored.version, 2);
  assert.equal(restored.pet.id, before.pet.id);
  assert.ok(restored.pet.growthSeconds >= warmed.pet.growthSeconds);
  assert.deepEqual(errors, []);
  console.log(
    'PAGES_OK: JavaScript, CSS, favicon, bienvenida, huevo elegido, bioma, calor y guardado v2 funcionan bajo /xisverso/.',
  );
} finally {
  await browser?.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
