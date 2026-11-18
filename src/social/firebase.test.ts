import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame } from '../domain/game.ts';
import {
  createVisitWorld,
  describeVisitError,
  firebaseConfigured,
  parseVisitWorld,
  validVisitCode,
} from './firebase.ts';

function postcard() {
  return {
    version: 1,
    name: 'El refugio de Menta',
    biome: 'coast',
    pet: { name: 'Menta', seed: 123, biome: 'forest', stage: 'baby' },
    decorations: ['lantern', 'flowers'],
    updatedAt: 1_000,
  };
}

test('visit postcards retain appearance and decorations without leaking the local save', () => {
  const state = createGame(1_000);
  state.decorations = ['lantern'];
  const world = createVisitWorld(state, '  Mi <refugio>\n bonito  ', 2_000);
  assert.equal(world.name, 'Mi refugio bonito');
  assert.deepEqual(Object.keys(world).sort(), [
    'biome',
    'decorations',
    'name',
    'pet',
    'updatedAt',
    'version',
  ]);
  assert.deepEqual(Object.keys(world.pet).sort(), ['biome', 'name', 'seed', 'stage']);
  assert.equal('coins' in world, false);
  assert.equal('inventory' in world, false);
  assert.equal('needs' in world.pet, false);
  assert.equal('id' in world.pet, false);
  world.decorations.push('flowers');
  assert.deepEqual(state.decorations, ['lantern']);
});

test('remote visit validation accepts every life stage and preserves the origin biome', () => {
  for (const stage of ['egg', 'baby', 'young', 'adult']) {
    const raw = postcard();
    raw.pet.stage = stage;
    const world = parseVisitWorld(raw);
    assert.equal(world?.pet.stage, stage);
    assert.equal(world?.pet.biome, 'forest');
    assert.equal(world?.biome, 'coast');
  }
});

test('remote visit validation rejects extra fields, malformed names and unsupported content', () => {
  const invalid: unknown[] = [
    { ...postcard(), coins: 100 },
    { ...postcard(), version: 2 },
    { ...postcard(), biome: 'space' },
    { ...postcard(), name: '<script>' },
    { ...postcard(), name: 'x'.repeat(37) },
    { ...postcard(), name: '' },
    { ...postcard(), name: ' con espacios ' },
    { ...postcard(), pet: { ...postcard().pet, needs: {} } },
    { ...postcard(), pet: { ...postcard().pet, seed: -1 } },
    { ...postcard(), pet: { ...postcard().pet, seed: 0x1_0000_0000 } },
    { ...postcard(), pet: { ...postcard().pet, seed: 1.5 } },
    { ...postcard(), pet: { ...postcard().pet, stage: 'dragon' } },
    { ...postcard(), decorations: ['lantern', 'lantern'] },
    { ...postcard(), decorations: ['unknown'] },
    { ...postcard(), updatedAt: Number.NaN },
    { ...postcard(), updatedAt: -1 },
    { ...postcard(), updatedAt: 1.2 },
    null,
  ];
  for (const value of invalid) assert.equal(parseVisitWorld(value), null, JSON.stringify(value));
});

test('shared codes allow one opaque document key and reject paths and short guesses', () => {
  assert.equal(validVisitCode('Abcdefghijklmnopqrstuvwxyz12'), true);
  assert.equal(validVisitCode('  Abcdefghijklmnopqrstuvwxyz12  '), true);
  for (const code of ['', 'amigo', '../worlds/owner', 'a'.repeat(129), 'a'.repeat(20) + '/other']) {
    assert.equal(validVisitCode(code), false);
  }
});

test('visit errors give actionable messages without exposing backend details', () => {
  assert.match(describeVisitError({ code: 'visits/not-found' }), /no se ha compartido/);
  assert.match(describeVisitError({ code: 'resource-exhausted' }), /límite gratuito/);
  assert.match(describeVisitError({ code: 'auth/operation-not-allowed' }), /acceso anónimo/);
  assert.match(describeVisitError({ code: 'visits/publish-too-soon' }), /30 segundos/);
  assert.doesNotMatch(describeVisitError(new Error('secret-token-value')), /secret-token/);
});

test('a normal Node test process has visits disconnected without configuration', () => {
  assert.equal(firebaseConfigured(), false);
});
