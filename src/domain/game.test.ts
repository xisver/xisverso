import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BIOMES,
  MAX_OFFLINE_HOURS,
  advanceTime,
  applyCare,
  changeBiome,
  createGame,
  getLevelProgress,
  getMood,
  parseSave,
  renamePet,
  rewardMiniGame,
  serializeSave,
} from './game.ts';

const NOW = 1_800_000_000_000;
const HOUR = 3_600_000;

test('new games have stable identity, valid bounds and a round-trippable save', () => {
  const state = createGame(NOW);
  assert.equal(state.pet.name, 'Nubi');
  assert.equal(state.level, 1);
  assert.equal(state.coins, 80);
  assert.equal(BIOMES.length, 3);
  assert.deepEqual(parseSave(serializeSave(state), NOW), state);
});

test('elapsed simulation is pure and its absence cost is capped at eight hours', () => {
  const state = createGame(NOW);
  const before = serializeSave(state);
  const short = advanceTime(state, NOW + MAX_OFFLINE_HOURS * HOUR);
  const long = advanceTime(state, NOW + 1000 * HOUR);
  assert.deepEqual(short.pet.needs, long.pet.needs);
  assert.equal(long.lastUpdated, NOW + 1000 * HOUR);
  assert.equal(serializeSave(state), before);
  assert.notEqual(short.pet.needs, state.pet.needs);
  assert.ok(Object.values(long.pet.needs).every((value) => value >= 0 && value <= 100));
});

test('moving the clock backwards neither restores needs nor rewinds lastUpdated', () => {
  const state = createGame(NOW);
  const next = advanceTime(state, NOW - HOUR);
  assert.deepEqual(next, state);
  assert.notEqual(next, state);
  assert.deepEqual(advanceTime(state, Number.NaN), state);
});

test('biomes preserve identity and introduce different care needs', () => {
  const state = createGame(NOW);
  const coast = changeBiome(state, 'coast', NOW);
  const tundra = changeBiome(state, 'tundra', NOW);
  assert.equal(coast.pet.id, state.pet.id);
  assert.equal(coast.pet.seed, state.pet.seed);
  assert.equal(state.pet.biome, 'forest');
  assert.ok(
    advanceTime(coast, NOW + HOUR).pet.needs.hygiene <
      advanceTime(state, NOW + HOUR).pet.needs.hygiene,
  );
  assert.ok(
    advanceTime(tundra, NOW + HOUR).pet.needs.energy <
      advanceTime(state, NOW + HOUR).pet.needs.energy,
  );
});

test('care costs seeds, restores bounded needs and grants experience without mutation', () => {
  const state = createGame(NOW);
  const before = serializeSave(state);
  const result = applyCare(state, 'feed', NOW);
  assert.equal(result.success, true);
  assert.equal(result.state.coins, 75);
  assert.equal(result.state.pet.needs.hunger, 100);
  assert.equal(result.state.xp, 5);
  assert.equal(result.state.activities, 1);
  assert.equal(serializeSave(state), before);
  assert.equal(applyCare(result.state, 'feed', NOW).success, false);
});

test('feeding without seeds fails while free care remains available', () => {
  const state = createGame(NOW);
  state.coins = 0;
  const feed = applyCare(state, 'feed', NOW);
  assert.equal(feed.success, false);
  assert.equal(feed.state.pet.needs.hunger, state.pet.needs.hunger);
  assert.equal(feed.state.coins, 0);
  assert.equal(applyCare(state, 'clean', NOW).success, true);
  assert.equal(applyCare(state, 'rest', NOW).success, true);
  assert.equal(applyCare(state, 'pet', NOW).success, true);
});

test('minigame scores are normalized, rewards bounded and records preserved', () => {
  const state = createGame(NOW);
  const result = rewardMiniGame(state, 9999, NOW);
  assert.equal(result.reward, 35);
  assert.equal(result.state.coins, 115);
  assert.equal(result.state.miniGameBest, 9999);
  assert.equal(result.state.xp, 25);
  assert.equal(state.coins, 80);
  assert.equal(rewardMiniGame(state, -10, NOW).reward, 0);
  assert.equal(rewardMiniGame(state, Number.NaN, NOW).reward, 0);
  assert.equal(rewardMiniGame(result.state, 2, NOW).state.miniGameBest, 9999);
});

test('scores above 100 preserve their real record while rewards and experience remain capped', () => {
  const state = createGame(NOW);
  const result = rewardMiniGame(state, 125, NOW);
  assert.equal(result.state.miniGameBest, 125);
  assert.equal(result.reward, 35);
  assert.equal(result.state.xp, 25);
  assert.equal(parseSave(serializeSave(result.state), NOW)?.miniGameBest, 125);
  assert.equal(rewardMiniGame(state, 125.8, NOW).state.miniGameBest, 125);
  assert.equal(
    rewardMiniGame(state, Number.MAX_SAFE_INTEGER, NOW).state.miniGameBest,
    1_000_000_000,
  );
});
test('levels and progress derive from accumulated experience', () => {
  const state = createGame(NOW);
  state.xp = 95;
  const next = applyCare(state, 'clean', NOW).state;
  assert.equal(next.level, 2);
  assert.deepEqual(getLevelProgress(next), { current: 0, required: 100, percent: 0 });
  next.xp = 149;
  assert.deepEqual(getLevelProgress(next), { current: 49, required: 100, percent: 49 });
});

test('renaming trims whitespace, bounds length and retains the previous name on empty input', () => {
  const state = createGame(NOW);
  assert.equal(renamePet(state, '  Luna   Azul  ').pet.name, 'Luna Azul');
  assert.equal(renamePet(state, ' ').pet.name, 'Nubi');
  assert.equal(renamePet(state, 'a'.repeat(40)).pet.name.length, 24);
  assert.equal(state.pet.name, 'Nubi');
});

test('save parsing rejects malformed, unsupported and inconsistent nested state', () => {
  assert.equal(parseSave(null, NOW), null);
  assert.equal(parseSave('{broken', NOW), null);
  assert.equal(parseSave('[]', NOW), null);
  for (const mutate of [
    (state: Record<string, any>) => {
      state.version = 2;
    },
    (state: Record<string, any>) => {
      state.pet.needs.energy = -1;
    },
    (state: Record<string, any>) => {
      state.pet.needs = null;
    },
    (state: Record<string, any>) => {
      state.pet.seed = 0.5;
    },
    (state: Record<string, any>) => {
      state.pet.biome = 'volcano';
    },
    (state: Record<string, any>) => {
      state.coins = '80';
    },
    (state: Record<string, any>) => {
      state.level = 999;
    },
    (state: Record<string, any>) => {
      state.pet.name = ' ';
    },
    (state: Record<string, any>) => {
      state.pet.id = '<script>';
    },
    (state: Record<string, any>) => {
      state.miniGameBest = 1_000_000_001;
    },
    (state: Record<string, any>) => {
      state.lastUpdated = -1;
    },
  ]) {
    const state = createGame(NOW);
    mutate(state);
    assert.equal(parseSave(JSON.stringify(state), NOW), null);
  }
});

test('restoration reconciles offline time once and discards unknown properties', () => {
  const raw = JSON.stringify({ ...createGame(NOW), unexpected: 'ignore me' });
  const restored = parseSave(raw, NOW + HOUR)!;
  assert.equal(restored.pet.needs.hunger, 73);
  assert.equal(restored.lastUpdated, NOW + HOUR);
  assert.equal('unexpected' in restored, false);
  assert.deepEqual(parseSave(serializeSave(restored), NOW + HOUR), restored);
});

test('mood reflects the most urgent needs', () => {
  const state = createGame(NOW);
  state.pet.needs.energy = 5;
  assert.equal(getMood(state), 'Con sueño');
  for (const need of ['hunger', 'energy', 'hygiene', 'joy'] as const) state.pet.needs[need] = 100;
  assert.equal(getMood(state), 'Radiante');
});
