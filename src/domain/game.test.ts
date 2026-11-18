import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BIOMES,
  DECORATIONS,
  purchaseDecoration,
  STARTER_EGGS,
  createStarterGame,
  getEggPattern,
  MATERIALS,
  RECIPES,
  LIFECYCLE,
  EXPEDITION_SECONDS,
  EXPEDITION_COOLDOWN_HOURS,
  EXPEDITIONS_PER_DAY,
  getExplorationAvailability,
  MAX_OFFLINE_HOURS,
  createGame,
  advanceTime,
  applyCare,
  changeBiome,
  renamePet,
  releaseAdult,
  craftFood,
  selectFood,
  startExpedition,
  completeExpedition,
  interactPets,
  getLifeProgress,
  getLevelProgress,
  getMood,
  rewardMiniGame,
  parseSave,
  serializeSave,
  type GameState,
} from './game.ts';

const NOW = 1_800_000_000_000;
const HOUR = 3_600_000;
const YOUNG_SECONDS = LIFECYCLE.eggSeconds + LIFECYCLE.babySeconds;
const ADULT_SECONDS = YOUNG_SECONDS + LIFECYCLE.youngSeconds;
const baby = () => advanceTime(createGame(NOW), NOW + LIFECYCLE.eggSeconds * 1000);
const young = () => advanceTime(createGame(NOW), NOW + YOUNG_SECONDS * 1000);
const adult = () => advanceTime(createGame(NOW), NOW + ADULT_SECONDS * 1000);
function collection(count: number): GameState {
  let state = adult();
  for (let index = 0; index < count; index++) {
    state = releaseAdult(state, state.lastUpdated).state;
    state = advanceTime(state, state.lastUpdated + ADULT_SECONDS * 1000);
  }
  return state;
}

test('new games begin with an egg, no points or ingredients and one prepared meal', () => {
  const state = createGame(NOW);
  assert.equal(state.version, 3);
  assert.equal(state.pet.name, 'Nubi');
  assert.equal(state.pet.stage, 'egg');
  assert.equal(state.currentBiome, 'forest');
  assert.equal(state.pet.biome, 'forest');
  assert.equal(state.inventory.food['fruit-bowl'], 1);
  assert.equal(state.coins, 0);
  assert.ok(Object.values(state.inventory.materials).every((amount) => amount === 0));
  assert.deepEqual(state.explorationStarts, []);
  assert.equal(BIOMES.length, 3);
  assert.equal(MATERIALS.length, 5);
  assert.equal(RECIPES.length, 3);
  assert.deepEqual(parseSave(serializeSave(state), NOW), state);
});

test('life stages take five hours, twenty hours and three days with relative progress', () => {
  const egg = createGame(NOW);
  assert.equal(LIFECYCLE.eggSeconds, 5 * 3600);
  assert.equal(LIFECYCLE.babySeconds, 20 * 3600);
  assert.equal(LIFECYCLE.youngSeconds, 72 * 3600);
  for (const [seconds, beforeStage, nextStage] of [
    [LIFECYCLE.eggSeconds, 'egg', 'baby'],
    [YOUNG_SECONDS, 'baby', 'young'],
    [ADULT_SECONDS, 'young', 'adult'],
  ] as const) {
    assert.equal(advanceTime(egg, NOW + seconds * 1000 - 1).pet.stage, beforeStage);
    assert.equal(advanceTime(egg, NOW + seconds * 1000).pet.stage, nextStage);
  }
  assert.deepEqual(getLifeProgress(egg.pet), {
    stage: 'egg',
    label: 'Huevo',
    percent: 0,
    remainingSeconds: 18000,
    nextStage: 'Bebé',
  });
  assert.equal(getLifeProgress(baby().pet).percent, 0);
  assert.equal(getLifeProgress(baby().pet).nextStage, 'Joven');
  assert.equal(getLifeProgress(young().pet).percent, 0);
  assert.equal(getLifeProgress(adult().pet).percent, 100);
  assert.equal(getLifeProgress(adult().pet).nextStage, null);
  assert.equal(egg.pet.growthSeconds, 0);
});

test('egg affection never skips incubation or farms bond, experience or resources', () => {
  const egg = createGame(NOW);
  const before = serializeSave(egg);
  for (const action of ['feed', 'clean', 'rest'] as const) {
    const result = applyCare(egg, action, NOW);
    assert.equal(result.success, false);
    assert.equal(result.state.inventory.food['fruit-bowl'], 1);
  }
  let state = egg;
  for (let index = 0; index < 100; index++) {
    const result = applyCare(state, 'pet', NOW);
    assert.equal(result.success, true);
    state = result.state;
  }
  assert.equal(state.pet.stage, 'egg');
  assert.equal(state.pet.growthSeconds, 0);
  assert.equal(state.pet.bond, egg.pet.bond);
  assert.equal(state.xp, 0);
  assert.equal(state.activities, 0);
  assert.equal(state.coins, 0);
  assert.equal(serializeSave(egg), before);
});

test('age follows a long absence while deterioration stays bounded to eight waking hours', () => {
  const state = young();
  const before = serializeSave(state);
  const short = advanceTime(state, state.lastUpdated + MAX_OFFLINE_HOURS * HOUR);
  const long = advanceTime(state, state.lastUpdated + 1000 * HOUR);
  assert.deepEqual(short.pet.needs, long.pet.needs);
  assert.equal(short.pet.stage, 'young');
  assert.equal(long.pet.stage, 'adult');
  assert.equal(long.pet.growthSeconds, state.pet.growthSeconds + 1000 * 3600);
  assert.equal(long.lastUpdated, state.lastUpdated + 1000 * HOUR);
  assert.equal(serializeSave(state), before);
  assert.ok(Object.values(long.pet.needs).every((value) => value >= 0 && value <= 100));
  assert.ok(long.pet.needs.appetite < state.pet.needs.appetite);
  assert.ok(long.pet.needs.energy < state.pet.needs.energy);
});

test('a backwards or invalid clock neither rewinds age nor restores needs', () => {
  const state = young();
  assert.deepEqual(advanceTime(state, NOW - HOUR), state);
  assert.deepEqual(advanceTime(state, Number.NaN), state);
  assert.deepEqual(advanceTime(state, Infinity), state);
  assert.notEqual(advanceTime(state, NOW), state);
});

test('travel changes the visited biome and care rates without changing appearance or origin', () => {
  const state = young();
  const coast = changeBiome(state, 'coast', state.lastUpdated);
  const tundra = changeBiome(state, 'tundra', state.lastUpdated);
  assert.equal(coast.currentBiome, 'coast');
  assert.equal(tundra.currentBiome, 'tundra');
  assert.deepEqual(coast.pet, state.pet);
  assert.equal(coast.pet.biome, 'forest');
  assert.equal(coast.pet.seed, state.pet.seed);
  assert.ok(
    advanceTime(coast, coast.lastUpdated + HOUR).pet.needs.hygiene <
      advanceTime(state, state.lastUpdated + HOUR).pet.needs.hygiene,
  );
  assert.ok(
    advanceTime(tundra, tundra.lastUpdated + HOUR).pet.needs.energy <
      advanceTime(state, state.lastUpdated + HOUR).pet.needs.energy,
  );
});

test('feeding raises appetite, consumes cooked food and records diet without costing points', () => {
  const state = young();
  const before = serializeSave(state);
  const result = applyCare(state, 'feed', state.lastUpdated);
  assert.equal(result.success, true);
  assert.equal(result.state.coins, state.coins);
  assert.equal(result.state.inventory.food['fruit-bowl'], 0);
  assert.equal(result.state.pet.needs.appetite, Math.min(100, state.pet.needs.appetite + 32));
  assert.equal(result.state.pet.diet['fruit-bowl'], 1);
  assert.equal(result.state.pet.growthSeconds, state.pet.growthSeconds);
  assert.equal(result.state.pet.biome, state.pet.biome);
  assert.equal(result.state.pet.seed, state.pet.seed);
  assert.equal(result.state.xp, 5);
  assert.equal(serializeSave(state), before);
  assert.equal(applyCare(result.state, 'feed', state.lastUpdated).success, false);
});

test('a meal is not consumed when hunger is already satisfied or food is unavailable', () => {
  const state = young();
  state.pet.needs.appetite = 100;
  const full = applyCare(state, 'feed', state.lastUpdated);
  assert.equal(full.success, false);
  assert.equal(full.state.inventory.food['fruit-bowl'], 1);
  state.pet.needs.appetite = 10;
  state.inventory.food['fruit-bowl'] = 0;
  const missing = applyCare(state, 'feed', state.lastUpdated);
  assert.equal(missing.success, false);
  assert.equal(missing.state.pet.needs.appetite, 10);
  assert.equal(missing.state.pet.diet['fruit-bowl'], 0);
});

test('care remains bounded without skipping real growth or mutating the original state', () => {
  const state = young();
  state.pet.needs.hygiene = 97;
  const before = serializeSave(state);
  const result = applyCare(state, 'clean', state.lastUpdated);
  assert.equal(result.success, true);
  assert.equal(result.state.pet.needs.hygiene, 100);
  assert.equal(result.state.pet.growthSeconds, state.pet.growthSeconds);
  assert.equal(serializeSave(state), before);
  assert.equal(applyCare(result.state, 'clean', state.lastUpdated).success, false);
});

test('only adults can live free and release creates a unique egg in the current biome', () => {
  assert.equal(releaseAdult(young(), NOW + 60_000).success, false);
  const state = renamePet(changeBiome(adult(), 'coast', NOW + ADULT_SECONDS * 1000), 'Luna');
  const before = serializeSave(state);
  const result = releaseAdult(state, state.lastUpdated);
  assert.equal(result.success, true);
  assert.equal(result.state.freePets.length, 1);
  const free = result.state.freePets[0];
  assert.equal(free.id, state.pet.id);
  assert.equal(free.name, 'Luna');
  assert.equal(free.biome, 'forest');
  assert.equal(free.habitatBiome, 'coast');
  assert.equal(result.state.pet.stage, 'egg');
  assert.equal(result.state.pet.biome, 'coast');
  assert.notEqual(result.state.pet.id, free.id);
  assert.equal(result.state.pet.growthSeconds, 0);
  assert.equal(result.state.currentBiome, 'coast');
  assert.equal(serializeSave(state), before);
  const duplicate = releaseAdult(result.state, result.state.lastUpdated);
  assert.equal(duplicate.success, false);
  assert.equal(duplicate.state.freePets.length, 1);
});

test('several generations retain distinct identities and survive saving and visits', () => {
  const state = collection(4);
  assert.equal(state.freePets.length, 4);
  assert.equal(new Set([state.pet.id, ...state.freePets.map((pet) => pet.id)]).size, 5);
  const visited = changeBiome(state, 'tundra', state.lastUpdated);
  assert.deepEqual(visited.freePets, state.freePets);
  assert.equal(visited.pet.biome, 'forest');
  assert.deepEqual(parseSave(serializeSave(visited), visited.lastUpdated), visited);
});

test('cooking spends exact ingredients atomically and selects the resulting dish', () => {
  const state = young();
  state.inventory.materials = { berries: 2, grain: 1, kelp: 0, root: 0, herb: 1 };
  const before = serializeSave(state);
  const missing = craftFood(state, 'sea-soup', state.lastUpdated);
  assert.equal(missing.success, false);
  assert.deepEqual(missing.state.inventory, state.inventory);
  const cooked = craftFood(state, 'fruit-bowl', state.lastUpdated);
  assert.equal(cooked.success, true);
  assert.equal(cooked.state.inventory.materials.berries, 0);
  assert.equal(cooked.state.inventory.materials.grain, 0);
  assert.equal(cooked.state.inventory.materials.herb, 1);
  assert.equal(cooked.state.inventory.food['fruit-bowl'], 2);
  assert.equal(cooked.state.selectedFood, 'fruit-bowl');
  assert.equal(serializeSave(state), before);
  const twice = craftFood(cooked.state, 'fruit-bowl', cooked.state.lastUpdated);
  assert.equal(twice.success, false);
  assert.deepEqual(twice.state.inventory, cooked.state.inventory);
});

test('selecting food requires an available dish and feeding records that recipe', () => {
  const state = young();
  assert.equal(selectFood(state, 'sea-soup').selectedFood, 'fruit-bowl');
  state.inventory.food['sea-soup'] = 1;
  const selected = selectFood(state, 'sea-soup');
  assert.equal(selected.selectedFood, 'sea-soup');
  assert.equal(state.selectedFood, 'fruit-bowl');
  const fed = applyCare(selected, 'feed', selected.lastUpdated);
  assert.equal(fed.state.pet.diet['sea-soup'], 1);
  assert.equal(fed.state.pet.diet['fruit-bowl'], 0);
  assert.equal(fed.state.inventory.food['sea-soup'], 0);
});

test('exploration rejects unknown, duplicate or more than three free companions', () => {
  const state = collection(4);
  const ids = state.freePets.map((pet) => pet.id);
  assert.equal(startExpedition(state, ['unknown'], state.lastUpdated).success, false);
  assert.equal(startExpedition(state, [ids[0], ids[0]], state.lastUpdated).success, false);
  assert.equal(startExpedition(state, ids, state.lastUpdated).success, false);
  assert.equal(startExpedition(state, [state.pet.id], state.lastUpdated).success, false);
  assert.equal(startExpedition(state, ids.slice(0, 3), state.lastUpdated).success, true);
});

test('up to three companions increase materials and lock the destination and party snapshot', () => {
  const state = changeBiome(collection(3), 'coast');
  const alone = startExpedition(state, [], state.lastUpdated).state;
  const ids = state.freePets.map((pet) => pet.id);
  const group = startExpedition(state, ids, state.lastUpdated).state;
  const expectedIds = [...ids];
  ids.pop();
  assert.deepEqual(group.expedition!.companionIds, expectedIds);
  assert.equal(group.expedition!.endsAt - group.expedition!.startedAt, EXPEDITION_SECONDS * 1000);
  assert.equal(group.expedition!.rewards.kelp, alone.expedition!.rewards.kelp * 4);
  assert.equal(group.expedition!.rewards.grain, 4);
  assert.equal(group.expedition!.rewards.berries, 0);
  const traveled = changeBiome(group, 'tundra', group.lastUpdated);
  assert.equal(traveled.currentBiome, 'tundra');
  assert.deepEqual(traveled.expedition, group.expedition);
  assert.equal(startExpedition(group, [], group.lastUpdated).success, false);
  assert.equal(releaseAdult(group, group.lastUpdated).success, false);
});

test('exploration materials arrive after the timer, survive reload and can be claimed once', () => {
  const state = startExpedition(createGame(NOW), [], NOW).state;
  assert.equal(state.pet.stage, 'egg');
  const early = completeExpedition(state, NOW + EXPEDITION_SECONDS * 1000 - 1);
  assert.equal(early.success, false);
  assert.deepEqual(early.state.inventory, state.inventory);
  const restored = parseSave(serializeSave(state), NOW + EXPEDITION_SECONDS * 1000)!;
  const completed = completeExpedition(restored, restored.lastUpdated);
  assert.equal(completed.success, true);
  assert.equal(completed.state.expedition, null);
  assert.equal(
    completed.state.inventory.materials.berries,
    state.inventory.materials.berries + completed.rewards.berries,
  );
  const second = completeExpedition(completed.state, completed.state.lastUpdated);
  assert.equal(second.success, false);
  assert.deepEqual(second.state.inventory, completed.state.inventory);
  assert.deepEqual(
    parseSave(serializeSave(completed.state), completed.state.lastUpdated),
    completed.state,
  );
});

test('every biome yields its own materials and inventory counters remain capped', () => {
  for (const biome of BIOMES) {
    let state = changeBiome(createGame(NOW), biome.id, NOW);
    state.inventory.materials.grain = 1_000_000_000;
    state = startExpedition(state, [], NOW).state;
    const result = completeExpedition(state, NOW + EXPEDITION_SECONDS * 1000);
    const primary = biome.id === 'forest' ? 'berries' : biome.id === 'coast' ? 'kelp' : 'root';
    assert.ok(result.rewards[primary] >= 2);
    assert.equal(result.state.inventory.materials.grain, 1_000_000_000);
  }
});

test('born companions interact in their shared biome while eggs and absent friends cannot', () => {
  let state = releaseAdult(adult(), NOW + ADULT_SECONDS * 1000).state;
  const friendId = state.freePets[0].id;
  assert.equal(interactPets(state, friendId, state.lastUpdated).success, false);
  state = advanceTime(state, state.lastUpdated + LIFECYCLE.eggSeconds * 1000);
  state.pet.needs.joy = 40;
  state.freePets[0].needs.joy = 40;
  const before = serializeSave(state);
  const played = interactPets(state, friendId, state.lastUpdated);
  assert.equal(played.success, true);
  assert.equal(played.state.pet.needs.joy, 52);
  assert.equal(played.state.freePets[0].needs.joy, 52);
  assert.equal(serializeSave(state), before);
  const traveled = changeBiome(state, 'coast', state.lastUpdated);
  assert.equal(interactPets(traveled, friendId, state.lastUpdated).success, false);
  assert.equal(interactPets(state, 'missing', state.lastUpdated).success, false);
});

test('v1 saves migrate without losing identity, achievements, points or original satiety', () => {
  const legacy = {
    version: 1,
    pet: {
      id: 'xis-test-123',
      name: 'Luna',
      seed: 42,
      biome: 'coast',
      needs: { hunger: 78, energy: 84, hygiene: 73, joy: 88 },
      bond: 30,
    },
    coins: 123,
    level: 1,
    xp: 35,
    lastUpdated: NOW,
    activities: 7,
    miniGameBest: 11,
  };
  const raw = JSON.stringify(legacy);
  const next = parseSave(raw, NOW)!;
  assert.equal(next.version, 3);
  assert.equal(next.pet.id, legacy.pet.id);
  assert.equal(next.pet.name, 'Luna');
  assert.equal(next.pet.stage, 'adult');
  assert.equal(next.pet.growthSeconds, ADULT_SECONDS);
  assert.equal(next.pet.needs.appetite, 78);
  assert.equal(next.pet.biome, 'coast');
  assert.equal(next.currentBiome, 'coast');
  assert.equal(next.coins, 123);
  assert.equal(next.xp, 35);
  assert.equal(next.activities, 7);
  assert.equal(next.miniGameBest, 11);
  assert.equal(next.freePets.length, 0);
  assert.deepEqual(parseSave(serializeSave(next), NOW), next);
  assert.equal(JSON.stringify(legacy), raw);
});

test('save validation rejects unsupported, inconsistent or corrupt nested data', () => {
  assert.equal(parseSave(null, NOW), null);
  assert.equal(parseSave('{broken', NOW), null);
  assert.equal(parseSave('[]', NOW), null);
  const mutations: ((state: any) => void)[] = [
    (state) => {
      state.version = 4;
    },
    (state) => {
      state.pet.stage = 'young';
    },
    (state) => {
      state.pet.growthSeconds = -1;
    },
    (state) => {
      state.pet.needs.appetite = 101;
    },
    (state) => {
      state.pet.needs = null;
    },
    (state) => {
      state.pet.diet = null;
    },
    (state) => {
      state.pet.id = '<script>';
    },
    (state) => {
      state.pet.seed = 0.5;
    },
    (state) => {
      state.pet.name = ' ';
    },
    (state) => {
      state.pet.biome = 'volcano';
    },
    (state) => {
      state.currentBiome = 'volcano';
    },
    (state) => {
      state.inventory.materials.berries = -1;
    },
    (state) => {
      state.inventory.food = {};
    },
    (state) => {
      state.selectedFood = 'missing';
    },
    (state) => {
      state.coins = '80';
    },
    (state) => {
      state.level = 999;
    },
    (state) => {
      state.lastUpdated = -1;
    },
    (state) => {
      state.expedition = {};
    },
  ];
  for (const mutate of mutations) {
    const state = createGame(NOW);
    mutate(state);
    assert.equal(parseSave(JSON.stringify(state), NOW), null);
  }
});

test('save validation rejects duplicate pet IDs and malformed expedition parties or timers', () => {
  const state = startExpedition(collection(2), [], NOW + ADULT_SECONDS * 3000).state;
  const raw = serializeSave(state);
  for (const mutate of [
    (data: any) => {
      data.freePets[0].id = data.pet.id;
    },
    (data: any) => {
      data.freePets[1].id = data.freePets[0].id;
    },
    (data: any) => {
      data.freePets[0].habitatBiome = 'missing';
    },
    (data: any) => {
      data.expedition.companionIds = ['missing'];
    },
    (data: any) => {
      data.expedition.companionIds = [data.freePets[0].id, data.freePets[0].id];
    },
    (data: any) => {
      data.expedition.endsAt += 1;
    },
    (data: any) => {
      data.expedition.rewards.grain = -1;
    },
    (data: any) => {
      data.expedition.rewards = { berries: 0, grain: 0, kelp: 0, root: 0, herb: 0 };
    },
  ]) {
    const corrupted = JSON.parse(raw);
    mutate(corrupted);
    assert.equal(parseSave(JSON.stringify(corrupted), state.lastUpdated), null);
  }
});

test('restoration reconciles time once and discards unknown properties', () => {
  const state = young();
  const raw = JSON.stringify({ ...state, unexpected: 'ignore me' });
  const restored = parseSave(raw, state.lastUpdated + HOUR)!;
  assert.ok(Math.abs(restored.pet.needs.appetite - (state.pet.needs.appetite - 0.8)) < 1e-9);
  assert.equal(restored.lastUpdated, state.lastUpdated + HOUR);
  assert.equal('unexpected' in restored, false);
  assert.deepEqual(parseSave(serializeSave(restored), restored.lastUpdated), restored);
});

test('minigame records preserve real scores while local rewards remain bounded', () => {
  const state = young();
  const result = rewardMiniGame(state, 125.8, state.lastUpdated);
  assert.equal(result.state.miniGameBest, 125);
  assert.equal(result.reward, 5);
  assert.equal(result.state.xp, 25);
  assert.equal(state.coins, 0);
  assert.equal(rewardMiniGame(state, -1, state.lastUpdated).reward, 0);
  assert.equal(rewardMiniGame(state, Number.NaN, state.lastUpdated).reward, 0);
  assert.equal(
    rewardMiniGame(state, Number.MAX_SAFE_INTEGER, state.lastUpdated).state.miniGameBest,
    1_000_000_000,
  );
  assert.equal(parseSave(serializeSave(result.state), state.lastUpdated)?.miniGameBest, 125);
});

test('experience, appetite mood and bounded renaming retain their semantics', () => {
  const state = young();
  state.xp = 95;
  assert.equal(applyCare(state, 'clean', state.lastUpdated).state.level, 2);
  assert.deepEqual(getLevelProgress(state), { current: 95, required: 100, percent: 95 });
  state.pet.needs = { appetite: 1, energy: 90, hygiene: 90, joy: 90 };
  assert.equal(getMood(state), 'Tiene hambre');
  state.pet.needs.appetite = 100;
  assert.equal(getMood(state), 'Radiante');
  assert.equal(getMood(createGame(NOW)), 'Incubando');
  assert.equal(renamePet(state, '  Luna   Azul ').pet.name, 'Luna Azul');
  assert.equal(renamePet(state, ' ').pet.name, 'Nubi');
  assert.equal(renamePet(state, 'a'.repeat(40)).pet.name.length, 24);
});

test('unknown care actions cannot introduce invalid needs or consume resources', () => {
  for (const current of [createGame(NOW), young()]) {
    const before = serializeSave(current);
    for (const action of ['unknown', '__proto__', 'toString']) {
      const result = applyCare(
        current,
        action as Parameters<typeof applyCare>[1],
        current.lastUpdated,
      );
      assert.equal(result.success, false);
      assert.equal(serializeSave(result.state), before);
      assert.ok(parseSave(serializeSave(result.state), current.lastUpdated));
    }
  }
});

test('saved expedition rewards must match the immutable destination and party snapshot', () => {
  const state = startExpedition(collection(3), [], NOW + ADULT_SECONDS * 5000).state;
  assert.ok(state.expedition);
  assert.ok(parseSave(serializeSave(state), state.lastUpdated));
  const mutations: ((saved: GameState) => void)[] = [
    (saved) => {
      saved.expedition!.rewards.grain++;
    },
    (saved) => {
      saved.expedition!.rewards.root = 1;
    },
    (saved) => {
      saved.expedition!.biome = 'coast';
    },
    (saved) => {
      saved.expedition!.companionIds = [saved.freePets[0].id];
    },
  ];
  for (const mutate of mutations) {
    const saved: GameState = JSON.parse(serializeSave(state));
    mutate(saved);
    assert.equal(parseSave(serializeSave(saved), state.lastUpdated), null);
  }
  // Travel cannot reroll an already-created route or invalidate its legitimate reward.
  const traveled = changeBiome(state, 'tundra', state.lastUpdated);
  assert.deepEqual(traveled.expedition, state.expedition);
  assert.deepEqual(parseSave(serializeSave(traveled), traveled.lastUpdated), traveled);
});

test('a backwards clock cannot complete a pending expedition early', () => {
  const state = startExpedition(collection(1), [], NOW + ADULT_SECONDS * 3000).state;
  const before = serializeSave(state);
  const restored = parseSave(before, state.lastUpdated - HOUR)!;
  assert.deepEqual(restored, state);
  const early = completeExpedition(restored, state.lastUpdated - HOUR);
  assert.equal(early.success, false);
  assert.deepEqual(early.state, state);
  const finished = completeExpedition(restored, state.expedition!.endsAt);
  assert.equal(finished.success, true);
  assert.equal(completeExpedition(finished.state, finished.state.lastUpdated).success, false);
});

test('all nine first-visit choices create the selected egg in its chosen birth biome', () => {
  for (const egg of STARTER_EGGS) {
    for (const biome of BIOMES) {
      const state = createStarterGame(egg.id, biome.id, NOW);
      assert.equal(state.version, 3);
      assert.equal(state.pet.stage, 'egg');
      assert.equal(state.pet.growthSeconds, 0);
      assert.equal(state.lastUpdated, NOW);
      assert.equal(state.currentBiome, biome.id);
      assert.equal(state.pet.biome, biome.id);
      assert.equal(state.pet.seed % 3, egg.pattern);
      assert.equal(getEggPattern(state.pet.seed), egg.id);
      assert.equal(state.pet.id, `xis-${NOW.toString(36)}-${state.pet.seed.toString(36)}-0`);
      assert.deepEqual(parseSave(serializeSave(state), NOW), state);
    }
  }
});

test('starter shell patterns remain inside UInt32 at the random range boundaries', (context) => {
  for (const random of [0, 0.5, 1 - Number.EPSILON]) {
    context.mock.method(Math, 'random', () => random);
    try {
      for (const egg of STARTER_EGGS) {
        const state = createStarterGame(egg.id, 'tundra', NOW);
        assert.ok(Number.isInteger(state.pet.seed));
        assert.ok(state.pet.seed >= 0 && state.pet.seed <= 0xffff_ffff);
        assert.equal(getEggPattern(state.pet.seed), egg.id);
        assert.ok(parseSave(serializeSave(state), NOW));
      }
    } finally {
      context.mock.restoreAll();
    }
  }
  assert.equal(getEggPattern(0xffff_ffff), 'speckled');
});

test('invalid starter choices and invalid seeds fail without silently choosing a default', () => {
  for (const value of ['', 'unknown', '__proto__', null, undefined]) {
    assert.throws(
      () => createStarterGame(value as Parameters<typeof createStarterGame>[0], 'forest', NOW),
      RangeError,
    );
    assert.throws(
      () => createStarterGame('speckled', value as Parameters<typeof createStarterGame>[1], NOW),
      RangeError,
    );
  }
  for (const seed of [-1, 0.25, NaN, Infinity, 0x1_0000_0000])
    assert.throws(() => getEggPattern(seed), RangeError);
});

test('the selected shell pattern and origin survive growth, travel, release and restoration', () => {
  for (const choice of STARTER_EGGS) {
    const egg = createStarterGame(choice.id, 'coast', NOW);
    const grown = advanceTime(egg, NOW + ADULT_SECONDS * 1000);
    const traveled = changeBiome(grown, 'tundra', grown.lastUpdated);
    assert.equal(traveled.pet.stage, 'adult');
    assert.equal(traveled.pet.biome, 'coast');
    assert.equal(traveled.pet.seed, egg.pet.seed);
    assert.equal(traveled.pet.id, egg.pet.id);
    assert.equal(getEggPattern(traveled.pet.seed), choice.id);
    const released = releaseAdult(traveled, traveled.lastUpdated);
    assert.equal(released.success, true);
    assert.equal(released.state.freePets[0].biome, 'coast');
    assert.equal(released.state.freePets[0].habitatBiome, 'tundra');
    assert.equal(getEggPattern(released.state.freePets[0].seed), choice.id);
    assert.deepEqual(
      parseSave(serializeSave(released.state), traveled.lastUpdated),
      released.state,
    );
  }
});

test('starter choices preserve the same care resources and progression as ordinary new games', () => {
  const baseline = createGame(NOW);
  for (const choice of STARTER_EGGS) {
    const state = createStarterGame(choice.id, 'coast', NOW);
    assert.deepEqual(state.inventory, baseline.inventory);
    assert.deepEqual(state.pet.needs, baseline.pet.needs);
    assert.deepEqual(state.pet.diet, baseline.pet.diet);
    assert.equal(state.coins, baseline.coins);
    assert.equal(state.xp, baseline.xp);
    assert.equal(state.level, baseline.level);
    assert.equal(state.pet.bond, baseline.pet.bond);
    const youngPet = advanceTime(state, NOW + LIFECYCLE.eggSeconds * 1000);
    const fed = applyCare(youngPet, 'feed', youngPet.lastUpdated);
    assert.equal(fed.success, true);
    assert.equal(fed.state.inventory.food['fruit-bowl'], 0);
    assert.equal(fed.state.coins, 0);
    assert.equal(fed.state.pet.diet['fruit-bowl'], 1);
    const played = rewardMiniGame(fed.state, 2, fed.state.lastUpdated);
    assert.equal(played.reward, 1);
    assert.equal(played.state.coins, 1);
  }
});

test('baby, young and adult needs decay gently at their own stage rate', () => {
  const losses = [baby(), young(), adult()].map((state) => {
    state.pet.needs = { appetite: 90, energy: 90, hygiene: 90, joy: 90 };
    const after = advanceTime(state, state.lastUpdated + HOUR);
    return 90 - after.pet.needs.appetite;
  });
  assert.ok(Math.abs(losses[0] - 0.6) < 1e-9);
  assert.ok(Math.abs(losses[1] - 0.8) < 1e-9);
  assert.ok(Math.abs(losses[2] - 0.45) < 1e-9);
  assert.ok(losses.every((loss) => loss < 1));
});

test('need deterioration integrates the exact time spent on either side of a stage boundary', () => {
  for (const [age, stage, expectedLoss] of [
    [LIFECYCLE.eggSeconds - 3600, 'egg', 0.6],
    [YOUNG_SECONDS - 3600, 'baby', 1.4],
    [ADULT_SECONDS - 3600, 'young', 1.25],
  ] as const) {
    const state = createGame(NOW);
    state.pet.stage = stage;
    state.pet.growthSeconds = age;
    state.pet.needs = { appetite: 90, energy: 90, hygiene: 90, joy: 90 };
    const after = advanceTime(state, NOW + 2 * HOUR);
    assert.ok(Math.abs(after.pet.needs.appetite - (90 - expectedLoss)) < 1e-9);
    const split = advanceTime(advanceTime(state, NOW + HOUR), NOW + 2 * HOUR);
    assert.deepEqual(split, after);
  }
});

test('born pets accept endless affection at full joy without increasing bond or progression', () => {
  for (const initial of [baby(), young(), adult()]) {
    initial.pet.needs.joy = 100;
    const before = serializeSave(initial);
    let state = initial;
    for (let index = 0; index < 100; index++) {
      const result = applyCare(state, 'pet', state.lastUpdated);
      assert.equal(result.success, true);
      state = result.state;
    }
    assert.equal(serializeSave(state), before);
    assert.equal(serializeSave(initial), before);
  }
});

test('food, expeditions and minigames never shorten the real lifecycle', () => {
  const state = baby();
  const fed = applyCare(state, 'feed', state.lastUpdated).state;
  assert.equal(fed.pet.growthSeconds, state.pet.growthSeconds);
  const played = rewardMiniGame(fed, 100, fed.lastUpdated).state;
  assert.equal(played.pet.growthSeconds, state.pet.growthSeconds);
  const expedition = startExpedition(played, [], played.lastUpdated).state;
  const completed = completeExpedition(expedition, expedition.expedition!.endsAt).state;
  assert.equal(completed.pet.growthSeconds, state.pet.growthSeconds + EXPEDITION_SECONDS);
  assert.equal(rewardMiniGame(createGame(NOW), 100, NOW).reward, 0);
});

test('v2 migration keeps each earned stage, relative growth, appetite and pet identity', () => {
  for (const [oldAge, stage, newAge] of [
    [30, 'egg', LIFECYCLE.eggSeconds / 2],
    [60, 'young', YOUNG_SECONDS],
    [360, 'young', YOUNG_SECONDS + LIFECYCLE.youngSeconds / 2],
    [660, 'adult', ADULT_SECONDS],
    [700, 'adult', ADULT_SECONDS + 40],
  ] as const) {
    const current = createGame(NOW);
    const old = {
      ...current,
      version: 2,
      pet: {
        ...current.pet,
        stage,
        growthSeconds: oldAge,
        needs: { hunger: 73, energy: 84, hygiene: 73, joy: 88 },
      },
    };
    delete (old as any).decorations;
    const migrated = parseSave(JSON.stringify(old), NOW)!;
    assert.ok(migrated);
    assert.equal(migrated.version, 3);
    assert.equal(migrated.pet.id, current.pet.id);
    assert.equal(migrated.pet.seed, current.pet.seed);
    assert.equal(migrated.pet.stage, stage);
    assert.equal(migrated.pet.growthSeconds, newAge);
    assert.equal(migrated.pet.needs.appetite, 27);
    assert.deepEqual(migrated.decorations, []);
    assert.deepEqual(parseSave(serializeSave(migrated), NOW), migrated);
  }
});

test('v2 migration retains free adults and in-flight expeditions without altering rewards', () => {
  const current = startExpedition(collection(2), [], NOW + ADULT_SECONDS * 4000).state;
  const oldPet = (pet: typeof current.pet) => ({
    ...pet,
    stage: 'adult',
    growthSeconds: 700,
    needs: { hunger: 35, energy: pet.needs.energy, hygiene: pet.needs.hygiene, joy: pet.needs.joy },
  });
  const old = {
    ...current,
    version: 2,
    pet: oldPet(current.pet),
    freePets: current.freePets.map((pet) => ({
      ...oldPet(pet),
      habitatBiome: pet.habitatBiome,
      releasedAt: pet.releasedAt,
    })),
  };
  delete (old as any).decorations;
  const migrated = parseSave(JSON.stringify(old), current.lastUpdated)!;
  assert.ok(migrated);
  assert.deepEqual(migrated.expedition, current.expedition);
  assert.deepEqual(
    migrated.freePets.map((pet) => pet.id),
    current.freePets.map((pet) => pet.id),
  );
  assert.ok(migrated.freePets.every((pet) => pet.stage === 'adult' && pet.needs.appetite === 65));
  (old.pet as any).stage = 'young';
  assert.equal(parseSave(JSON.stringify(old), current.lastUpdated), null);
});

test('decoration purchases spend points atomically, survive saving and reject duplicates', () => {
  const state = createGame(NOW);
  const item = DECORATIONS.find((item) => item.id === 'lantern')!;
  state.coins = item.price;
  const before = serializeSave(state);
  const bought = purchaseDecoration(state, item.id, NOW);
  assert.equal(bought.success, true);
  assert.equal(bought.state.coins, 0);
  assert.deepEqual(bought.state.decorations, ['lantern']);
  assert.deepEqual(state.decorations, []);
  assert.equal(serializeSave(state), before);
  assert.deepEqual(parseSave(serializeSave(bought.state), NOW), bought.state);
  for (const id of ['lantern', 'arch', '__proto__'] as const) {
    const rejected = purchaseDecoration(
      bought.state,
      id as Parameters<typeof purchaseDecoration>[1],
      NOW,
    );
    assert.equal(rejected.success, false);
    assert.deepEqual(rejected.state, bought.state);
  }
});

test('decoration saves reject unknown, duplicated or malformed ownership', () => {
  for (const decorations of [null, ['unknown'], ['lantern', 'lantern'], {}, 'lantern']) {
    const state = createGame(NOW);
    (state as any).decorations = decorations;
    assert.equal(parseSave(serializeSave(state), NOW), null);
  }
});

test('minigames grant at most five earned points and never supply food or ingredients', () => {
  const state = baby();
  for (const [score, expected] of [
    [0, 0],
    [1, 1],
    [5, 1],
    [6, 2],
    [20, 4],
    [25, 5],
    [125, 5],
    [1_000_000_000, 5],
  ]) {
    const before = serializeSave(state);
    const result = rewardMiniGame(state, score, state.lastUpdated);
    assert.equal(result.reward, expected);
    assert.equal(result.state.coins - state.coins, expected);
    assert.deepEqual(result.state.inventory, state.inventory);
    assert.equal(serializeSave(state), before);
  }
  const stateWithEarnedPoints = { ...state, coins: 137 };
  assert.equal(rewardMiniGame(stateWithEarnedPoints, 100, state.lastUpdated).state.coins, 142);
});

test('exploration has two departure slots per rolling day and an eight-hour cooldown', () => {
  assert.equal(EXPEDITIONS_PER_DAY, 2);
  assert.equal(EXPEDITION_COOLDOWN_HOURS, 8);
  const initial = createGame(NOW);
  assert.deepEqual(getExplorationAvailability(initial, NOW), {
    remaining: 2,
    nextAvailableAt: NOW,
    canStart: true,
  });
  const before = serializeSave(initial);
  const first = startExpedition(initial, [], NOW);
  assert.equal(first.success, true);
  assert.equal(serializeSave(initial), before);
  assert.deepEqual(first.state.explorationStarts, [NOW]);
  assert.equal(getExplorationAvailability(first.state, NOW + 8 * HOUR).canStart, false);
  const claimed = completeExpedition(first.state, NOW + EXPEDITION_SECONDS * 1000).state;
  assert.deepEqual(getExplorationAvailability(claimed, claimed.lastUpdated), {
    remaining: 1,
    nextAvailableAt: NOW + 8 * HOUR,
    canStart: false,
  });
  assert.equal(startExpedition(claimed, [], NOW + 8 * HOUR - 1).success, false);
  assert.deepEqual(claimed.explorationStarts, [NOW]);
  const second = startExpedition(claimed, [], NOW + 8 * HOUR);
  assert.equal(second.success, true);
  assert.deepEqual(second.state.explorationStarts, [NOW, NOW + 8 * HOUR]);
  const secondClaimed = completeExpedition(second.state, second.state.expedition!.endsAt).state;
  assert.deepEqual(getExplorationAvailability(secondClaimed, NOW + 16 * HOUR), {
    remaining: 0,
    nextAvailableAt: NOW + 24 * HOUR,
    canStart: false,
  });
  assert.equal(startExpedition(secondClaimed, [], NOW + 24 * HOUR - 1).success, false);
  const third = startExpedition(secondClaimed, [], NOW + 24 * HOUR);
  assert.equal(third.success, true);
  assert.deepEqual(third.state.explorationStarts, [NOW + 8 * HOUR, NOW + 24 * HOUR]);
  const thirdClaimed = completeExpedition(third.state, third.state.expedition!.endsAt).state;
  assert.equal(getExplorationAvailability(thirdClaimed, NOW + 32 * HOUR).canStart, true);
});

test('exploration restrictions survive saving, travel, pet release and a backwards clock', () => {
  const initial = adult();
  const at = initial.lastUpdated;
  const first = startExpedition(initial, [], at).state;
  const claimed = completeExpedition(first, first.expedition!.endsAt).state;
  const traveled = changeBiome(claimed, 'coast', claimed.lastUpdated);
  const released = releaseAdult(traveled, traveled.lastUpdated).state;
  const restored = parseSave(serializeSave(released), released.lastUpdated)!;
  assert.deepEqual(restored.explorationStarts, [at]);
  assert.deepEqual(getExplorationAvailability(restored, at - HOUR), {
    remaining: 1,
    nextAvailableAt: at + 8 * HOUR,
    canStart: false,
  });
  assert.equal(startExpedition(restored, [], at - HOUR).success, false);
  assert.equal(startExpedition(restored, [], at + 8 * HOUR).success, true);
  assert.equal(getExplorationAvailability(advanceTime(restored, at + 48 * HOUR)).remaining, 2);
});

test('older saves preserve points and resources while adopting exploration restrictions', () => {
  const state = createGame(NOW);
  state.coins = 115;
  state.inventory.materials.berries = 9;
  const old = JSON.parse(serializeSave(state));
  delete old.explorationStarts;
  const restored = parseSave(JSON.stringify(old), NOW)!;
  assert.equal(restored.coins, 115);
  assert.equal(restored.inventory.materials.berries, 9);
  assert.deepEqual(restored.explorationStarts, []);
  const active = startExpedition(state, [], NOW).state;
  const oldActive = JSON.parse(serializeSave(active));
  delete oldActive.explorationStarts;
  const resumed = parseSave(JSON.stringify(oldActive), NOW)!;
  assert.deepEqual(resumed.explorationStarts, [NOW]);
  const claimed = completeExpedition(resumed, resumed.expedition!.endsAt).state;
  assert.equal(getExplorationAvailability(claimed, claimed.lastUpdated).remaining, 1);
  assert.equal(startExpedition(claimed, [], NOW + HOUR).success, false);
});

test('invalid exploration histories are rejected without accepting arbitrary timestamps', () => {
  for (const history of [
    null,
    {},
    'none',
    [NOW + 1],
    [-1],
    [NOW, NOW],
    [NOW, NOW - 1],
    [NOW - 2, NOW - 1, NOW],
  ]) {
    const state = createGame(NOW);
    (state as any).explorationStarts = history;
    assert.equal(parseSave(serializeSave(state), NOW), null);
  }
});
