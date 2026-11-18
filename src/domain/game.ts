/** Pure local simulation. Rendering and persistence adapters live outside this module. */
export type BiomeId = 'forest' | 'coast' | 'tundra';
export type Need = 'appetite' | 'energy' | 'hygiene' | 'joy';
export type Action = 'feed' | 'clean' | 'rest' | 'pet';
export type PetStage = 'egg' | 'baby' | 'young' | 'adult';
export type MaterialId = 'berries' | 'grain' | 'kelp' | 'root' | 'herb';
export type RecipeId = 'fruit-bowl' | 'sea-soup' | 'root-stew';
export type StarterEggId = 'speckled' | 'striped' | 'starry';
export type DecorationId = 'lantern' | 'flowers' | 'fountain' | 'bench' | 'mushrooms' | 'arch';

export interface StarterEggDefinition {
  id: StarterEggId;
  name: string;
  description: string;
  pattern: 0 | 1 | 2;
}

export interface Pet {
  id: string;
  name: string;
  seed: number;
  /** Birth biome is an immutable visual affinity, independent of travel. */
  biome: BiomeId;
  stage: PetStage;
  growthSeconds: number;
  needs: Record<Need, number>;
  bond: number;
  /** Nutrition history is retained for future food-dependent evolution. */
  diet: Record<RecipeId, number>;
}
export interface FreePet extends Pet {
  habitatBiome: BiomeId;
  releasedAt: number;
}
export interface Expedition {
  id: string;
  biome: BiomeId;
  companionIds: string[];
  startedAt: number;
  endsAt: number;
  rewards: Record<MaterialId, number>;
}
export interface GameState {
  version: 3;
  pet: Pet;
  currentBiome: BiomeId;
  freePets: FreePet[];
  inventory: { materials: Record<MaterialId, number>; food: Record<RecipeId, number> };
  selectedFood: RecipeId;
  expedition: Expedition | null;
  coins: number;
  level: number;
  xp: number;
  lastUpdated: number;
  activities: number;
  miniGameBest: number;
  decorations: DecorationId[];
}
export type State = GameState;
export interface CareResult {
  state: GameState;
  success: boolean;
  message: string;
}
export interface BiomeDefinition {
  id: BiomeId;
  name: string;
  label: string;
  description: string;
  accent: string;
  unlockLevel: number;
}
export interface MaterialDefinition {
  id: MaterialId;
  name: string;
  description: string;
}
export interface RecipeDefinition {
  id: RecipeId;
  name: string;
  description: string;
  ingredients: Partial<Record<MaterialId, number>>;
  hungerRelief: number;
  growthBonus: number;
}
export interface DecorationDefinition {
  id: DecorationId;
  name: string;
  description: string;
  price: number;
}
export const DECORATIONS: readonly DecorationDefinition[] = [
  {
    id: 'flowers',
    name: 'Jardín de flores',
    description: 'Un rincón lleno de color para explorar.',
    price: 40,
  },
  {
    id: 'lantern',
    name: 'Farol cálido',
    description: 'Una pequeña luz que acompaña el refugio.',
    price: 60,
  },
  {
    id: 'mushrooms',
    name: 'Setas luminosas',
    description: 'Un grupo de setas que brilla con suavidad.',
    price: 75,
  },
  {
    id: 'bench',
    name: 'Banco de madera',
    description: 'Un lugar tranquilo para descansar juntos.',
    price: 110,
  },
  {
    id: 'fountain',
    name: 'Fuente del bosque',
    description: 'Agua y calma para tu pequeño mundo.',
    price: 180,
  },
  {
    id: 'arch',
    name: 'Arco de bienvenida',
    description: 'Una entrada especial para recibir visitas.',
    price: 240,
  },
];
/** The shell pattern is encoded in the existing seed, so all v2 saves remain compatible. */
export const STARTER_EGGS: readonly StarterEggDefinition[] = [
  {
    id: 'speckled',
    name: 'Moteado',
    description: 'Una cáscara salpicada de pequeñas motas.',
    pattern: 0,
  },
  {
    id: 'striped',
    name: 'Rayado',
    description: 'Franjas suaves que rodean la cáscara.',
    pattern: 1,
  },
  {
    id: 'starry',
    name: 'Estelar',
    description: 'Pequeñas estrellas sobre un nuevo comienzo.',
    pattern: 2,
  },
];
export const BIOMES: readonly BiomeDefinition[] = [
  {
    id: 'forest',
    name: 'Bosque Susurro',
    label: 'Bosque',
    description: 'Hojas, bayas y amigos entre los árboles.',
    accent: '#47745b',
    unlockLevel: 1,
  },
  {
    id: 'coast',
    name: 'Costa Nácar',
    label: 'Costa',
    description: 'Brisa salada, algas y palmeras en la orilla.',
    accent: '#368d9e',
    unlockLevel: 1,
  },
  {
    id: 'tundra',
    name: 'Tundra Aurora',
    label: 'Tundra',
    description: 'Nieve, raíces y un rincón cálido para descansar.',
    accent: '#8775ad',
    unlockLevel: 1,
  },
];
export const MATERIALS: readonly MaterialDefinition[] = [
  { id: 'berries', name: 'Bayas', description: 'Frutos dulces del bosque.' },
  { id: 'grain', name: 'Granos', description: 'Una base nutritiva para cocinar.' },
  { id: 'kelp', name: 'Algas', description: 'Ingredientes frescos de la costa.' },
  { id: 'root', name: 'Raíces', description: 'Alimento que resiste el frío.' },
  { id: 'herb', name: 'Hierbas', description: 'Un toque especial para las comidas.' },
];
export const RECIPES: readonly RecipeDefinition[] = [
  {
    id: 'fruit-bowl',
    name: 'Cuenco de bayas',
    description: 'Una comida suave y dulce.',
    ingredients: { berries: 2, grain: 1 },
    hungerRelief: 32,
    growthBonus: 0,
  },
  {
    id: 'sea-soup',
    name: 'Sopa de la costa',
    description: 'Un caldo de algas y hierbas.',
    ingredients: { kelp: 2, herb: 1 },
    hungerRelief: 44,
    growthBonus: 0,
  },
  {
    id: 'root-stew',
    name: 'Guiso de raíces',
    description: 'Una comida cálida de la tundra.',
    ingredients: { root: 2, grain: 1 },
    hungerRelief: 50,
    growthBonus: 0,
  },
];
export const LIFECYCLE = {
  eggSeconds: 5 * 3600,
  babySeconds: 20 * 3600,
  youngSeconds: 3 * 24 * 3600,
} as const;
export const EXPEDITION_SECONDS = 20;
export const MAX_OFFLINE_HOURS = 8;
export const XP_PER_LEVEL = 100;
export const CARE_COSTS: Readonly<Record<Action, number>> = { feed: 0, clean: 0, rest: 0, pet: 0 };
const MAX_COUNTER = 1_000_000_000;
const MAX_FREE_PETS = 100;
const YOUNG_SECONDS = LIFECYCLE.eggSeconds + LIFECYCLE.babySeconds;
const ADULT_SECONDS = YOUNG_SECONDS + LIFECYCLE.youngSeconds;
const needIds: readonly Need[] = ['appetite', 'energy', 'hygiene', 'joy'];
const biomeIds: readonly BiomeId[] = ['forest', 'coast', 'tundra'];
const materialIds: readonly MaterialId[] = ['berries', 'grain', 'kelp', 'root', 'herb'];
const recipeIds: readonly RecipeId[] = ['fruit-bowl', 'sea-soup', 'root-stew'];
const decorationIds = DECORATIONS.map((item) => item.id);
const decayRates: Record<BiomeId, Record<Need, number>> = {
  forest: { appetite: 1, energy: 0.8, hygiene: 0.6, joy: 0.7 },
  coast: { appetite: 1.1, energy: 0.9, hygiene: 0.8, joy: 0.6 },
  tundra: { appetite: 1.2, energy: 1.1, hygiene: 0.5, joy: 0.7 },
};
const stageDecay: Record<PetStage, number> = { egg: 0, baby: 0.6, young: 0.8, adult: 0.45 };
const careDefinitions = {
  clean: { need: 'hygiene' as Need, gain: 32, message: 'Un baño de burbujas. ¡Como nueva!' },
  rest: { need: 'energy' as Need, gain: 30, message: 'Una pequeña siesta para recargar energía.' },
  pet: { need: 'joy' as Need, gain: 22, message: 'Un mimo para disfrutar de estar juntos.' },
};
const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const validNumber = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const validInteger = (value: unknown, min = 0, max = MAX_COUNTER): value is number =>
  validNumber(value, min, max) && Number.isInteger(value);
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const normalizeNow = (now: number, fallback = 0) =>
  validNumber(now, 0, Number.MAX_SAFE_INTEGER) ? Math.floor(now) : fallback;
const emptyMaterials = (): Record<MaterialId, number> => ({
  berries: 0,
  grain: 0,
  kelp: 0,
  root: 0,
  herb: 0,
});
const emptyFood = (): Record<RecipeId, number> => ({
  'fruit-bowl': 0,
  'sea-soup': 0,
  'root-stew': 0,
});
const copyPet = <T extends Pet>(pet: T): T => ({
  ...pet,
  needs: { ...pet.needs },
  diet: { ...pet.diet },
});
function clone(state: GameState): GameState {
  return {
    ...state,
    pet: copyPet(state.pet),
    freePets: state.freePets.map(copyPet),
    decorations: [...state.decorations],
    inventory: { materials: { ...state.inventory.materials }, food: { ...state.inventory.food } },
    expedition: state.expedition
      ? {
          ...state.expedition,
          companionIds: [...state.expedition.companionIds],
          rewards: { ...state.expedition.rewards },
        }
      : null,
  };
}
function stageFor(seconds: number): PetStage {
  if (seconds < LIFECYCLE.eggSeconds) return 'egg';
  if (seconds < YOUNG_SECONDS) return 'baby';
  return seconds < ADULT_SECONDS ? 'young' : 'adult';
}
function grow(pet: Pet, seconds: number): void {
  pet.growthSeconds = clamp(pet.growthSeconds + seconds, 0, MAX_COUNTER);
  pet.stage = stageFor(pet.growthSeconds);
}
function grantExperience(state: GameState, amount: number): void {
  state.xp = Math.min(MAX_COUNTER, state.xp + amount);
  state.level = 1 + Math.floor(state.xp / XP_PER_LEVEL);
}
function newEgg(now: number, biome: BiomeId, number = 0): Pet {
  const seed = Math.floor(Math.random() * 0x1_0000_0000);
  return {
    id: `xis-${now.toString(36)}-${seed.toString(36)}-${number.toString(36)}`,
    name: number === 0 ? 'Nubi' : `Nubi ${number + 1}`,
    seed,
    biome,
    stage: 'egg',
    growthSeconds: 0,
    needs: { appetite: 70, energy: 84, hygiene: 73, joy: 88 },
    bond: 12,
    diet: emptyFood(),
  };
}
export function createGame(now = Date.now()): GameState {
  const timestamp = normalizeNow(now);
  return {
    version: 3,
    pet: newEgg(timestamp, 'forest'),
    currentBiome: 'forest',
    freePets: [],
    inventory: {
      materials: { berries: 2, grain: 1, kelp: 0, root: 0, herb: 1 },
      food: { 'fruit-bowl': 1, 'sea-soup': 0, 'root-stew': 0 },
    },
    selectedFood: 'fruit-bowl',
    expedition: null,
    coins: 80,
    level: 1,
    xp: 0,
    lastUpdated: timestamp,
    activities: 0,
    miniGameBest: 0,
    decorations: [],
  };
}
/** Resolve the immutable shell style from a valid persisted UInt32 seed. */
export function getEggPattern(seed: number): StarterEggId {
  if (!validInteger(seed, 0, 0xffff_ffff))
    throw new RangeError('La semilla del huevo no es válida.');
  return STARTER_EGGS[seed % STARTER_EGGS.length].id;
}

/** A first-visit choice changes identity and origin, without granting extra resources. */
export function createStarterGame(
  eggId: StarterEggId,
  biome: BiomeId,
  now = Date.now(),
): GameState {
  const choice = STARTER_EGGS.find((egg) => egg.id === eggId);
  if (!choice) throw new RangeError('Ese tipo de huevo no está disponible.');
  if (!biomeIds.includes(biome)) throw new RangeError('Ese bioma de crianza no está disponible.');
  const state = createGame(now);
  // Every bucket contains the three patterns, including at the upper UInt32 boundary.
  const buckets = Math.floor(0x1_0000_0000 / STARTER_EGGS.length);
  const seed = Math.floor(Math.random() * buckets) * STARTER_EGGS.length + choice.pattern;
  return {
    ...state,
    currentBiome: biome,
    pet: {
      ...state.pet,
      id: `xis-${state.lastUpdated.toString(36)}-${seed.toString(36)}-0`,
      biome,
      seed,
    },
  };
}
function passTime(pet: Pet, biome: BiomeId, seconds: number): void {
  // Age follows the entire absence. Only the first eight waking hours affect care.
  // Integrating stage boundaries avoids applying an adult rate to a baby's whole absence.
  let age = pet.growthSeconds;
  let remaining = seconds;
  let careBudget = MAX_OFFLINE_HOURS * 3600;
  while (remaining > 0 && careBudget > 0) {
    const stage = stageFor(age);
    const boundary =
      stage === 'egg'
        ? LIFECYCLE.eggSeconds
        : stage === 'baby'
          ? YOUNG_SECONDS
          : stage === 'young'
            ? ADULT_SECONDS
            : Infinity;
    const elapsed = Math.min(remaining, boundary - age);
    if (stage !== 'egg') {
      const careSeconds = Math.min(elapsed, careBudget);
      for (const need of needIds)
        pet.needs[need] = clamp(
          pet.needs[need] - (careSeconds / 3600) * decayRates[biome][need] * stageDecay[stage],
        );
      careBudget -= careSeconds;
    }
    remaining -= elapsed;
    age += elapsed;
  }
  grow(pet, seconds);
}
/** Reconcile time without background services; absence never kills or deletes a pet. */
export function advanceTime(state: GameState, now = Date.now()): GameState {
  const next = clone(state);
  const timestamp = normalizeNow(now, state.lastUpdated);
  if (timestamp <= state.lastUpdated) return next;
  const seconds = (timestamp - state.lastUpdated) / 1000;
  passTime(next.pet, next.currentBiome, seconds);
  for (const pet of next.freePets) passTime(pet, pet.habitatBiome, seconds);
  next.lastUpdated = timestamp;
  return next;
}
export function applyCare(state: GameState, action: Action, now = Date.now()): CareResult {
  const next = advanceTime(state, now);
  if (action !== 'feed' && action !== 'clean' && action !== 'rest' && action !== 'pet')
    return { state: next, success: false, message: 'Ese cuidado todavía no está disponible.' };
  if (next.pet.stage === 'egg') {
    if (action !== 'pet')
      return {
        state: next,
        success: false,
        message: 'Todavía es un huevo. Dale cariño para mantenerlo calentito.',
      };
    return {
      state: next,
      success: true,
      message: 'Un poquito de calor. El huevo nacerá a su propio ritmo.',
    };
  }
  if (action === 'feed') {
    if (next.pet.needs.appetite >= 98)
      return {
        state: next,
        success: false,
        message: 'Ahora no tiene hambre. Guardemos la comida para después.',
      };
    const recipe = RECIPES.find((item) => item.id === next.selectedFood)!;
    if (next.inventory.food[recipe.id] < 1)
      return {
        state: next,
        success: false,
        message: 'No queda esa comida preparada. Cocina o elige otra receta en la cocina.',
      };
    next.inventory.food[recipe.id]--;
    next.pet.needs.appetite = clamp(next.pet.needs.appetite + recipe.hungerRelief);
    next.pet.diet[recipe.id] = Math.min(MAX_COUNTER, next.pet.diet[recipe.id] + 1);
  } else {
    const definition = careDefinitions[action];
    if (!definition)
      return { state: next, success: false, message: 'Ese cuidado todavía no está disponible.' };
    if (action !== 'pet' && next.pet.needs[definition.need] >= 98)
      return {
        state: next,
        success: false,
        message: 'Ya tiene esa necesidad cubierta. Prueba otro cuidado.',
      };
    next.pet.needs[definition.need] = clamp(next.pet.needs[definition.need] + definition.gain);
  }
  // Affection remains available at full joy, without farming bond or progression.
  if (action !== 'pet') {
    next.pet.bond = clamp(next.pet.bond + 2);
    next.activities = Math.min(MAX_COUNTER, next.activities + 1);
    grantExperience(next, 5);
  }
  return {
    state: next,
    success: true,
    message:
      action === 'feed'
        ? '¡Qué rico! Su apetito está satisfecho.'
        : careDefinitions[action].message,
  };
}
export function changeBiome(state: GameState, biome: BiomeId, now = Date.now()): GameState {
  const next = advanceTime(state, now);
  if (biomeIds.includes(biome)) next.currentBiome = biome;
  return next;
}
export function renamePet(state: GameState, name: string): GameState {
  const next = clone(state);
  const cleaned =
    typeof name === 'string'
      ? name
          .trim()
          .replace(/\s+/gu, ' ')
          .replace(/[\u0000-\u001f\u007f]/gu, '')
          .slice(0, 24)
          .trim()
      : '';
  if (cleaned) next.pet.name = cleaned;
  return next;
}
export function releaseAdult(state: GameState, now = Date.now()): CareResult {
  const next = advanceTime(state, now);
  if (next.pet.stage !== 'adult')
    return {
      state: next,
      success: false,
      message: 'Tu compañero debe ser adulto antes de vivir libre.',
    };
  if (next.expedition)
    return {
      state: next,
      success: false,
      message: 'Recoge primero los materiales de la exploración pendiente.',
    };
  if (next.freePets.length >= MAX_FREE_PETS)
    return {
      state: next,
      success: false,
      message: 'El refugio ya tiene muchos amigos libres. Sigue disfrutando de ellos.',
    };
  const name = next.pet.name;
  next.freePets.push({
    ...copyPet(next.pet),
    habitatBiome: next.currentBiome,
    releasedAt: next.lastUpdated,
  });
  next.pet = newEgg(next.lastUpdated, next.currentBiome, next.freePets.length);
  next.activities = Math.min(MAX_COUNTER, next.activities + 1);
  return {
    state: next,
    success: true,
    message: `${name} vive libre en ${BIOMES.find((biome) => biome.id === next.currentBiome)!.name}. Un nuevo huevo empieza su historia.`,
  };
}
export function craftFood(state: GameState, recipeId: RecipeId, now = Date.now()): CareResult {
  const next = advanceTime(state, now);
  const recipe = RECIPES.find((item) => item.id === recipeId);
  if (!recipe) return { state: next, success: false, message: 'Esa receta no está disponible.' };
  for (const [material, amount] of Object.entries(recipe.ingredients))
    if (next.inventory.materials[material as MaterialId] < amount!)
      return {
        state: next,
        success: false,
        message: 'Faltan ingredientes. Explora un bioma para recoger más.',
      };
  if (next.inventory.food[recipe.id] >= MAX_COUNTER)
    return {
      state: next,
      success: false,
      message: 'Ya tienes suficiente comida preparada de esta receta.',
    };
  for (const [material, amount] of Object.entries(recipe.ingredients))
    next.inventory.materials[material as MaterialId] -= amount!;
  next.inventory.food[recipe.id]++;
  next.selectedFood = recipe.id;
  next.activities = Math.min(MAX_COUNTER, next.activities + 1);
  return {
    state: next,
    success: true,
    message: `¡${recipe.name} preparado! Ya puedes dárselo a tu compañero.`,
  };
}
export function selectFood(state: GameState, recipeId: RecipeId): GameState {
  const next = clone(state);
  if (recipeIds.includes(recipeId) && next.inventory.food[recipeId] > 0)
    next.selectedFood = recipeId;
  return next;
}
export function purchaseDecoration(
  state: GameState,
  decorationId: DecorationId,
  now = Date.now(),
): CareResult {
  const next = advanceTime(state, now);
  const decoration = DECORATIONS.find((item) => item.id === decorationId);
  if (!decoration)
    return { state: next, success: false, message: 'Esa decoración no está disponible.' };
  if (next.decorations.includes(decorationId))
    return { state: next, success: false, message: 'Esta decoración ya forma parte de tu mundo.' };
  if (next.coins < decoration.price)
    return {
      state: next,
      success: false,
      message: 'Necesitas más puntos. Juega con tu mascota para conseguirlos.',
    };
  next.coins -= decoration.price;
  next.decorations.push(decorationId);
  return { state: next, success: true, message: `¡${decoration.name} ya decora tu mundo!` };
}
function expeditionRewards(
  biome: BiomeId,
  companions: number,
  seed: number,
): Record<MaterialId, number> {
  const result = emptyMaterials();
  const factor = companions + 1;
  const primary: MaterialId = biome === 'forest' ? 'berries' : biome === 'coast' ? 'kelp' : 'root';
  result[primary] = (2 + (seed % 2)) * factor;
  result.grain = factor;
  result.herb = factor;
  return result;
}
export function startExpedition(
  state: GameState,
  companionIds: string[],
  now = Date.now(),
): CareResult {
  const next = advanceTime(state, now);
  if (next.expedition)
    return {
      state: next,
      success: false,
      message: 'Ya hay una exploración en marcha o pendiente de recoger.',
    };
  if (
    !Array.isArray(companionIds) ||
    companionIds.length > 3 ||
    new Set(companionIds).size !== companionIds.length ||
    companionIds.some((id) => !next.freePets.some((pet) => pet.id === id && pet.stage === 'adult'))
  )
    return {
      state: next,
      success: false,
      message: 'Elige hasta tres compañeros libres diferentes.',
    };
  if (next.lastUpdated > Number.MAX_SAFE_INTEGER - EXPEDITION_SECONDS * 1000)
    return {
      state: next,
      success: false,
      message: 'No se pudo iniciar la exploración. Revisa el reloj del dispositivo.',
    };
  next.expedition = {
    id: `exp-${next.lastUpdated.toString(36)}-${next.pet.seed.toString(36)}`,
    biome: next.currentBiome,
    companionIds: [...companionIds],
    startedAt: next.lastUpdated,
    endsAt: next.lastUpdated + EXPEDITION_SECONDS * 1000,
    rewards: expeditionRewards(next.currentBiome, companionIds.length, next.pet.seed),
  };
  return {
    state: next,
    success: true,
    message: companionIds.length
      ? `¡A explorar con ${companionIds.length} compañeros libres!`
      : '¡A explorar! Los materiales estarán listos en 20 segundos.',
  };
}
export function completeExpedition(
  state: GameState,
  now = Date.now(),
): CareResult & { rewards: Record<MaterialId, number> } {
  const next = advanceTime(state, now);
  const expedition = next.expedition;
  if (!expedition)
    return {
      state: next,
      success: false,
      message: 'No hay materiales pendientes de recoger.',
      rewards: emptyMaterials(),
    };
  if (next.lastUpdated < expedition.endsAt)
    return {
      state: next,
      success: false,
      message: 'Tu equipo sigue explorando. Vuelve en un momento.',
      rewards: emptyMaterials(),
    };
  const rewards = { ...expedition.rewards };
  for (const material of materialIds)
    next.inventory.materials[material] = Math.min(
      MAX_COUNTER,
      next.inventory.materials[material] + rewards[material],
    );
  next.expedition = null;
  next.activities = Math.min(MAX_COUNTER, next.activities + 1);
  grantExperience(next, 10);
  return {
    state: next,
    success: true,
    message: '¡El equipo volvió con nuevos ingredientes para cocinar!',
    rewards,
  };
}
export function interactPets(state: GameState, freeId: string, now = Date.now()): CareResult {
  const next = advanceTime(state, now);
  const friend = next.freePets.find((pet) => pet.id === freeId);
  if (!friend || friend.habitatBiome !== next.currentBiome)
    return {
      state: next,
      success: false,
      message: 'Visita el bioma donde vive ese compañero para jugar juntos.',
    };
  if (next.pet.stage === 'egg')
    return {
      state: next,
      success: false,
      message: 'Cuando nazca tu compañero podrán jugar juntos. Por ahora, el huevo necesita calor.',
    };
  next.pet.needs.joy = clamp(next.pet.needs.joy + 12);
  friend.needs.joy = clamp(friend.needs.joy + 12);
  next.pet.bond = clamp(next.pet.bond + 2);
  friend.bond = clamp(friend.bond + 2);
  next.activities = Math.min(MAX_COUNTER, next.activities + 1);
  return {
    state: next,
    success: true,
    message: `¡${next.pet.name} y ${friend.name} están jugando juntos!`,
  };
}
/** Online rewards will require a server; this economy is a local prototype. */
export function rewardMiniGame(
  state: GameState,
  score: number,
  now = Date.now(),
): { state: GameState; reward: number } {
  const next = advanceTime(state, now);
  const settledScore = Number.isFinite(score) ? Math.floor(clamp(score, 0, MAX_COUNTER)) : 0;
  if (next.pet.stage === 'egg' || settledScore === 0) return { state: next, reward: 0 };
  const reward = settledScore === 0 ? 0 : Math.min(35, 5 + settledScore);
  next.coins = Math.min(MAX_COUNTER, next.coins + reward);
  next.miniGameBest = Math.max(next.miniGameBest, settledScore);
  next.pet.needs.joy = clamp(next.pet.needs.joy + Math.min(20, settledScore * 2));
  next.pet.needs.energy = clamp(next.pet.needs.energy - Math.min(10, settledScore));
  next.pet.bond = clamp(next.pet.bond + Math.min(5, settledScore));
  next.activities = Math.min(MAX_COUNTER, next.activities + 1);
  grantExperience(next, Math.min(25, settledScore * 2));
  return { state: next, reward };
}
export function getMood(state: GameState): string {
  if (state.pet.stage === 'egg') return 'Incubando';
  const n = state.pet.needs;
  if (n.energy < 30) return 'Con sueño';
  if (n.appetite < 30) return 'Tiene hambre';
  if (n.hygiene < 30) return 'Quiere un baño';
  if (n.joy < 30) return 'Busca compañía';
  if (n.appetite >= 75 && n.energy >= 75 && n.hygiene >= 75 && n.joy >= 75) return 'Radiante';
  if (n.appetite >= 45 && n.energy >= 45 && n.hygiene >= 45 && n.joy >= 45) return 'A gusto';
  return 'Necesita cuidados';
}
export function getLifeProgress(pet: Pet): {
  stage: PetStage;
  label: string;
  percent: number;
  remainingSeconds: number;
  nextStage: string | null;
} {
  if (pet.stage === 'adult')
    return { stage: 'adult', label: 'Adulto', percent: 100, remainingSeconds: 0, nextStage: null };
  const egg = pet.stage === 'egg';
  const baby = pet.stage === 'baby';
  const elapsed = egg
    ? pet.growthSeconds
    : baby
      ? pet.growthSeconds - LIFECYCLE.eggSeconds
      : pet.growthSeconds - YOUNG_SECONDS;
  const duration = egg
    ? LIFECYCLE.eggSeconds
    : baby
      ? LIFECYCLE.babySeconds
      : LIFECYCLE.youngSeconds;
  return {
    stage: pet.stage,
    label: egg ? 'Huevo' : baby ? 'Bebé' : 'Joven',
    percent: clamp((elapsed / duration) * 100),
    remainingSeconds: Math.max(0, Math.ceil(duration - elapsed)),
    nextStage: egg ? 'Bebé' : baby ? 'Joven' : 'Adulto',
  };
}
export function getLevelProgress(state: GameState): {
  current: number;
  required: number;
  percent: number;
} {
  const current = state.xp % XP_PER_LEVEL;
  return { current, required: XP_PER_LEVEL, percent: (current / XP_PER_LEVEL) * 100 };
}
export function serializeSave(state: GameState): string {
  return JSON.stringify(state);
}
function counters<T extends string>(
  value: unknown,
  ids: readonly T[],
  maximum = MAX_COUNTER,
): Record<T, number> | null {
  if (!record(value) || !ids.every((id) => validInteger(value[id], 0, maximum))) return null;
  return Object.fromEntries(ids.map((id) => [id, value[id]])) as Record<T, number>;
}
function parsePet(value: unknown, version = 3): Pet | null {
  if (version === 2) {
    if (
      !record(value) ||
      !record(value.needs) ||
      !validNumber(value.growthSeconds, 0, MAX_COUNTER) ||
      !validNumber(value.needs.hunger, 0, 100)
    )
      return null;
    const oldAge = value.growthSeconds;
    const oldStage = oldAge < 60 ? 'egg' : oldAge < 660 ? 'young' : 'adult';
    if (value.stage !== oldStage) return null;
    const age =
      oldStage === 'egg'
        ? (oldAge / 60) * LIFECYCLE.eggSeconds
        : oldStage === 'young'
          ? YOUNG_SECONDS + ((oldAge - 60) / 600) * LIFECYCLE.youngSeconds
          : Math.min(MAX_COUNTER, ADULT_SECONDS + oldAge - 660);
    value = {
      ...value,
      growthSeconds: age,
      needs: { ...value.needs, appetite: 100 - value.needs.hunger },
    };
  }
  if (
    !record(value) ||
    typeof value.id !== 'string' ||
    !/^xis-[a-z0-9-]{3,90}$/u.test(value.id) ||
    typeof value.name !== 'string' ||
    !value.name.trim() ||
    value.name.length > 24 ||
    /[\u0000-\u001f\u007f]/u.test(value.name) ||
    !validInteger(value.seed, 0, 0xffff_ffff) ||
    !biomeIds.includes(value.biome as BiomeId) ||
    !validNumber(value.growthSeconds, 0, MAX_COUNTER) ||
    value.stage !== stageFor(value.growthSeconds) ||
    !validNumber(value.bond, 0, 100) ||
    !record(value.needs)
  )
    return null;
  if (!needIds.every((need) => validNumber((value.needs as Record<string, unknown>)[need], 0, 100)))
    return null;
  const diet = counters(value.diet, recipeIds);
  if (!diet) return null;
  return {
    id: value.id,
    name: value.name.trim(),
    seed: value.seed,
    biome: value.biome as BiomeId,
    stage: value.stage as PetStage,
    growthSeconds: value.growthSeconds,
    needs: {
      appetite: value.needs.appetite as number,
      energy: value.needs.energy as number,
      hygiene: value.needs.hygiene as number,
      joy: value.needs.joy as number,
    },
    bond: value.bond,
    diet,
  };
}
/** v1/v2 migrate once, preserving earned stages, identity, resources and relative growth. */
export function parseSave(raw: string | null | undefined, now = Date.now()): GameState | null {
  if (typeof raw !== 'string' || raw.length > 524_288) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (
      !record(data) ||
      (data.version !== 1 && data.version !== 2 && data.version !== 3) ||
      !validInteger(data.coins) ||
      !validInteger(data.xp) ||
      !validInteger(data.level, 1, 10_000_001) ||
      data.level !== 1 + Math.floor(data.xp / XP_PER_LEVEL) ||
      !validInteger(data.lastUpdated, 0, Number.MAX_SAFE_INTEGER) ||
      !validInteger(data.activities) ||
      !validInteger(data.miniGameBest)
    )
      return null;
    const legacy = data.version === 1;
    let pet: Pet | null;
    if (legacy && record(data.pet) && record(data.pet.needs)) {
      const old = data.pet;
      pet = parsePet({
        ...old,
        stage: 'adult',
        growthSeconds: ADULT_SECONDS,
        diet: emptyFood(),
        needs: {
          ...data.pet.needs,
          appetite: validNumber(data.pet.needs.hunger, 0, 100) ? data.pet.needs.hunger : Number.NaN,
        },
      });
    } else pet = parsePet(data.pet, data.version);
    if (!pet) return null;
    const defaults = createGame(data.lastUpdated);
    const next: GameState = {
      ...defaults,
      pet,
      currentBiome: pet.biome,
      coins: data.coins,
      xp: data.xp,
      level: data.level,
      lastUpdated: data.lastUpdated,
      activities: data.activities,
      miniGameBest: data.miniGameBest,
    };
    if (!legacy) {
      if (
        !biomeIds.includes(data.currentBiome as BiomeId) ||
        !Array.isArray(data.freePets) ||
        data.freePets.length > MAX_FREE_PETS ||
        !record(data.inventory)
      )
        return null;
      const materials = counters(data.inventory.materials, materialIds);
      const food = counters(data.inventory.food, recipeIds);
      if (!materials || !food || !recipeIds.includes(data.selectedFood as RecipeId)) return null;
      next.currentBiome = data.currentBiome as BiomeId;
      next.inventory = { materials, food };
      next.selectedFood = data.selectedFood as RecipeId;
      const ids = new Set([pet.id]);
      for (const value of data.freePets) {
        const freePet = parsePet(value, data.version);
        if (
          !freePet ||
          freePet.stage !== 'adult' ||
          !record(value) ||
          !biomeIds.includes(value.habitatBiome as BiomeId) ||
          !validInteger(value.releasedAt, 0, data.lastUpdated) ||
          ids.has(freePet.id)
        )
          return null;
        ids.add(freePet.id);
        next.freePets.push({
          ...freePet,
          habitatBiome: value.habitatBiome as BiomeId,
          releasedAt: value.releasedAt,
        });
      }
      if (data.expedition !== null) {
        const expedition = data.expedition;
        if (
          !record(expedition) ||
          typeof expedition.id !== 'string' ||
          !/^exp-[a-z0-9-]{3,90}$/u.test(expedition.id) ||
          !biomeIds.includes(expedition.biome as BiomeId) ||
          !Array.isArray(expedition.companionIds) ||
          expedition.companionIds.length > 3 ||
          new Set(expedition.companionIds).size !== expedition.companionIds.length ||
          expedition.companionIds.some(
            (id) => typeof id !== 'string' || !next.freePets.some((friend) => friend.id === id),
          ) ||
          !validInteger(expedition.startedAt, 0, data.lastUpdated) ||
          !validInteger(expedition.endsAt, 0, Number.MAX_SAFE_INTEGER) ||
          expedition.endsAt - expedition.startedAt !== EXPEDITION_SECONDS * 1000
        )
          return null;
        const rewards = counters(expedition.rewards, materialIds, 20);
        const expectedRewards = expeditionRewards(
          expedition.biome as BiomeId,
          expedition.companionIds.length,
          next.pet.seed,
        );
        if (!rewards || materialIds.some((id) => rewards[id] !== expectedRewards[id])) return null;
        next.expedition = {
          id: expedition.id,
          biome: expedition.biome as BiomeId,
          companionIds: [...expedition.companionIds] as string[],
          startedAt: expedition.startedAt,
          endsAt: expedition.endsAt,
          rewards,
        };
      }
    }
    if (data.version === 3) {
      if (
        !Array.isArray(data.decorations) ||
        data.decorations.length > decorationIds.length ||
        new Set(data.decorations).size !== data.decorations.length ||
        data.decorations.some((id) => !decorationIds.includes(id as DecorationId))
      )
        return null;
      next.decorations = [...data.decorations] as DecorationId[];
    }
    return advanceTime(next, now);
  } catch {
    return null;
  }
}
