/** Pure local simulation. Rendering and persistence adapters live outside this module. */
export type BiomeId = 'forest' | 'coast' | 'tundra';
export type Need = 'appetite' | 'energy' | 'hygiene' | 'joy';
export type Action = 'feed' | 'clean' | 'rest' | 'pet';
export type PetStage = 'egg' | 'baby' | 'young' | 'adult';
export type MaterialId =
  | 'berries'
  | 'grain'
  | 'kelp'
  | 'root'
  | 'herb'
  | 'seeds'
  | 'carrot'
  | 'mushroom'
  | 'coconut'
  | 'honey'
  | 'milk'
  | 'cocoa';
export type RecipeId =
  | 'fruit-bowl'
  | 'sea-soup'
  | 'root-stew'
  | 'seed-crackers'
  | 'garden-salad'
  | 'mushroom-rice'
  | 'berry-jam'
  | 'coconut-bowl'
  | 'root-cream'
  | 'honey-pudding'
  | 'cocoa-cookie'
  | 'aurora-feast'
  | 'strange-food';
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
  principalParticipates: boolean;
  cookingLevel: number;
  lootVersion: 1 | 2;
}
export interface GameState {
  version: 3;
  pet: Pet;
  currentBiome: BiomeId;
  freePets: FreePet[];
  inventory: { materials: Record<MaterialId, number>; food: Record<RecipeId, number> };
  selectedFood: RecipeId;
  expedition: Expedition | null;
  /** Last departures; kept across generations, travel and reloads. */
  explorationStarts: number[];
  coins: number;
  level: number;
  xp: number;
  lastUpdated: number;
  activities: number;
  miniGameBest: number;
  decorations: DecorationId[];
  cooking: { xp: number; discovered: RecipeId[] };
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
  price: number;
  unlockLevel: number;
  symbol: string;
}
export interface RecipeDefinition {
  id: RecipeId;
  name: string;
  description: string;
  ingredients: Partial<Record<MaterialId, number>>;
  hungerRelief: number;
  growthBonus: number;
  unlockLevel: number;
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
  {
    id: 'berries',
    name: 'Bayas',
    description: 'Frutos dulces del bosque.',
    price: 2,
    unlockLevel: 1,
    symbol: '🫐',
  },
  {
    id: 'grain',
    name: 'Granos',
    description: 'Una base nutritiva para cocinar.',
    price: 1,
    unlockLevel: 1,
    symbol: '🌾',
  },
  {
    id: 'kelp',
    name: 'Algas',
    description: 'Ingredientes frescos de la costa.',
    price: 2,
    unlockLevel: 1,
    symbol: '🌿',
  },
  {
    id: 'root',
    name: 'Raíces',
    description: 'Alimento que resiste el frío.',
    price: 2,
    unlockLevel: 1,
    symbol: '🍠',
  },
  {
    id: 'herb',
    name: 'Hierbas',
    description: 'Un toque especial para las comidas.',
    price: 1,
    unlockLevel: 1,
    symbol: '🍃',
  },
  {
    id: 'seeds',
    name: 'Semillas',
    description: 'Pequeñas semillas crujientes para mezclar.',
    price: 1,
    unlockLevel: 1,
    symbol: '🌰',
  },
  {
    id: 'carrot',
    name: 'Zanahorias',
    description: 'Crujientes y llenas de color.',
    price: 4,
    unlockLevel: 2,
    symbol: '🥕',
  },
  {
    id: 'mushroom',
    name: 'Setas',
    description: 'Un sabor suave para platos calientes.',
    price: 4,
    unlockLevel: 2,
    symbol: '🍄',
  },
  {
    id: 'coconut',
    name: 'Coco',
    description: 'Pulpa fresca de la costa.',
    price: 7,
    unlockLevel: 3,
    symbol: '🥥',
  },
  {
    id: 'honey',
    name: 'Miel',
    description: 'Dulzura dorada para recetas especiales.',
    price: 8,
    unlockLevel: 3,
    symbol: '🍯',
  },
  {
    id: 'milk',
    name: 'Leche',
    description: 'Una base cremosa para cocineros expertos.',
    price: 11,
    unlockLevel: 4,
    symbol: '🥛',
  },
  {
    id: 'cocoa',
    name: 'Cacao',
    description: 'Un ingrediente aromático de gran valor.',
    price: 16,
    unlockLevel: 5,
    symbol: '🍫',
  },
];
export const RECIPES: readonly RecipeDefinition[] = [
  {
    id: 'fruit-bowl',
    name: 'Cuenco de bayas',
    description: 'Una comida suave y dulce.',
    ingredients: { berries: 2, grain: 1 },
    hungerRelief: 32,
    growthBonus: 0,
    unlockLevel: 1,
  },
  {
    id: 'sea-soup',
    name: 'Sopa de la costa',
    description: 'Un caldo de algas y hierbas.',
    ingredients: { kelp: 2, herb: 1 },
    hungerRelief: 44,
    growthBonus: 0,
    unlockLevel: 1,
  },
  {
    id: 'root-stew',
    name: 'Guiso de raíces',
    description: 'Una comida cálida de la tundra.',
    ingredients: { root: 2, grain: 1 },
    hungerRelief: 50,
    growthBonus: 0,
    unlockLevel: 1,
  },
  {
    id: 'seed-crackers',
    name: 'Crujientes de semillas',
    description: 'Un bocado pequeño y crujiente.',
    ingredients: { seeds: 2, grain: 1 },
    hungerRelief: 24,
    growthBonus: 0,
    unlockLevel: 1,
  },
  {
    id: 'garden-salad',
    name: 'Ensalada del huerto',
    description: 'Colores frescos con semillas.',
    ingredients: { carrot: 1, herb: 1, seeds: 1 },
    hungerRelief: 46,
    growthBonus: 0,
    unlockLevel: 2,
  },
  {
    id: 'mushroom-rice',
    name: 'Arroz de setas',
    description: 'Granos tiernos con aroma del bosque.',
    ingredients: { mushroom: 1, grain: 1, herb: 1 },
    hungerRelief: 52,
    growthBonus: 0,
    unlockLevel: 2,
  },
  {
    id: 'berry-jam',
    name: 'Compota dorada',
    description: 'Bayas dulces con un toque de miel.',
    ingredients: { berries: 2, honey: 1 },
    hungerRelief: 56,
    growthBonus: 0,
    unlockLevel: 3,
  },
  {
    id: 'coconut-bowl',
    name: 'Cuenco tropical',
    description: 'Coco, bayas y semillas junto al mar.',
    ingredients: { coconut: 1, berries: 1, seeds: 1 },
    hungerRelief: 60,
    growthBonus: 0,
    unlockLevel: 3,
  },
  {
    id: 'root-cream',
    name: 'Crema de la tundra',
    description: 'Raíces suaves con hierbas y leche.',
    ingredients: { root: 1, milk: 1, herb: 1 },
    hungerRelief: 66,
    growthBonus: 0,
    unlockLevel: 4,
  },
  {
    id: 'honey-pudding',
    name: 'Pudín de miel',
    description: 'Un postre cremoso y reconfortante.',
    ingredients: { milk: 1, grain: 1, honey: 1 },
    hungerRelief: 70,
    growthBonus: 0,
    unlockLevel: 4,
  },
  {
    id: 'cocoa-cookie',
    name: 'Galleta de cacao',
    description: 'Una especialidad para tardes tranquilas.',
    ingredients: { cocoa: 1, grain: 1, honey: 1 },
    hungerRelief: 78,
    growthBonus: 0,
    unlockLevel: 5,
  },
  {
    id: 'aurora-feast',
    name: 'Delicia de aurora',
    description: 'Cacao, coco y crema en armonía.',
    ingredients: { cocoa: 1, milk: 1, coconut: 1 },
    hungerRelief: 90,
    growthBonus: 0,
    unlockLevel: 6,
  },
  {
    id: 'strange-food',
    name: 'Comida Rara',
    description: 'Una mezcla inesperada. Alimenta un poquito.',
    ingredients: {},
    hungerRelief: 8,
    growthBonus: 0,
    unlockLevel: 1,
  },
];
export const COOKING_XP_PER_LEVEL = 60;
export const MAX_COOKING_LEVEL = 6;
export const LIFECYCLE = {
  eggSeconds: 5 * 3600,
  babySeconds: 20 * 3600,
  youngSeconds: 3 * 24 * 3600,
} as const;
export const EXPEDITION_SECONDS = 20;
export const EXPEDITION_COOLDOWN_HOURS = 8;
export const EXPEDITIONS_PER_DAY = 2;
export const EXPLORATION_TIME_ZONE = 'America/Mexico_City';
const HOUR = 3_600_000;
const MAX_DATE = 8_640_000_000_000_000;
const explorationCalendar = new Intl.DateTimeFormat('en-CA', {
  timeZone: EXPLORATION_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
export const MAX_OFFLINE_HOURS = 8;
export const XP_PER_LEVEL = 100;
export const CARE_COSTS: Readonly<Record<Action, number>> = { feed: 0, clean: 0, rest: 0, pet: 0 };
const MAX_COUNTER = 1_000_000_000;
const MAX_FREE_PETS = 100;
const YOUNG_SECONDS = LIFECYCLE.eggSeconds + LIFECYCLE.babySeconds;
const ADULT_SECONDS = YOUNG_SECONDS + LIFECYCLE.youngSeconds;
const needIds: readonly Need[] = ['appetite', 'energy', 'hygiene', 'joy'];
const biomeIds: readonly BiomeId[] = ['forest', 'coast', 'tundra'];
const legacyMaterialIds: readonly MaterialId[] = ['berries', 'grain', 'kelp', 'root', 'herb'];
const materialIds = MATERIALS.map((item) => item.id);
const legacyRecipeIds: readonly RecipeId[] = ['fruit-bowl', 'sea-soup', 'root-stew'];
const recipeIds = RECIPES.map((item) => item.id);
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
const emptyMaterials = (): Record<MaterialId, number> =>
  Object.fromEntries(materialIds.map((id) => [id, 0])) as Record<MaterialId, number>;
const emptyFood = (): Record<RecipeId, number> =>
  Object.fromEntries(recipeIds.map((id) => [id, 0])) as Record<RecipeId, number>;
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
    cooking: { xp: state.cooking.xp, discovered: [...state.cooking.discovered] },
    explorationStarts: [...state.explorationStarts],
    inventory: {
      materials: { ...emptyMaterials(), ...state.inventory.materials },
      food: { ...emptyFood(), ...state.inventory.food },
    },
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
      materials: emptyMaterials(),
      food: { ...emptyFood(), 'fruit-bowl': 1 },
    },
    selectedFood: 'fruit-bowl',
    expedition: null,
    explorationStarts: [],
    coins: 0,
    level: 1,
    xp: 0,
    lastUpdated: timestamp,
    activities: 0,
    miniGameBest: 0,
    decorations: [],
    cooking: { xp: 0, discovered: ['fruit-bowl'] },
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
  const needsComfort = action === 'pet' && next.pet.needs.joy < 30;
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
  // Affection remains available at full joy. Only a genuinely low mood builds bond.
  if (action !== 'pet') {
    next.pet.bond = clamp(next.pet.bond + 2);
    next.activities = Math.min(MAX_COUNTER, next.activities + 1);
    grantExperience(next, 5);
  } else if (needsComfort) {
    next.pet.bond = clamp(next.pet.bond + 2);
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
export function getCookingProgress(state: GameState): {
  level: number;
  xp: number;
  current: number;
  needed: number;
  progress: number;
} {
  const xp = state.cooking.xp;
  const level = Math.min(MAX_COOKING_LEVEL, 1 + Math.floor(xp / COOKING_XP_PER_LEVEL));
  const current = level === MAX_COOKING_LEVEL ? COOKING_XP_PER_LEVEL : xp % COOKING_XP_PER_LEVEL;
  return {
    level,
    xp,
    current,
    needed: COOKING_XP_PER_LEVEL,
    progress: (current / COOKING_XP_PER_LEVEL) * 100,
  };
}
export interface CookingResult extends CareResult {
  recipeId?: RecipeId;
  discovered?: boolean;
  xpGained?: number;
}
export function cookIngredients(
  state: GameState,
  ingredients: readonly MaterialId[],
  now = Date.now(),
): CookingResult {
  const next = advanceTime(state, now);
  if (
    !Array.isArray(ingredients) ||
    ingredients.length < 1 ||
    ingredients.length > 3 ||
    ingredients.some((id) => !materialIds.includes(id))
  )
    return { state: next, success: false, message: 'Elige entre uno y tres ingredientes válidos.' };
  const amounts = emptyMaterials();
  for (const id of ingredients as readonly MaterialId[]) amounts[id]++;
  const level = getCookingProgress(next).level;
  if (ingredients.some((id) => MATERIALS.find((item) => item.id === id)!.unlockLevel > level))
    return {
      state: next,
      success: false,
      message: 'Ese ingrediente se desbloquea al mejorar tu nivel de cocina.',
    };
  if (materialIds.some((id) => amounts[id] > (next.inventory.materials[id] ?? 0)))
    return {
      state: next,
      success: false,
      message: 'Faltan ingredientes. Explora o visita la tienda.',
    };
  const matched = RECIPES.find(
    (recipe) =>
      recipe.id !== 'strange-food' &&
      materialIds.every((id) => (recipe.ingredients[id] ?? 0) === amounts[id]),
  );
  const recipe =
    matched && matched.unlockLevel <= level
      ? matched
      : RECIPES.find((item) => item.id === 'strange-food')!;
  if (next.inventory.food[recipe.id] >= MAX_COUNTER)
    return {
      state: next,
      success: false,
      message: 'Ya tienes suficiente comida preparada de esta receta.',
    };
  for (const id of ingredients as readonly MaterialId[]) next.inventory.materials[id]--;
  next.inventory.food[recipe.id]++;
  next.selectedFood = recipe.id;
  const discovered = !next.cooking.discovered.includes(recipe.id);
  if (discovered) next.cooking.discovered.push(recipe.id);
  const xpGained = recipe.id === 'strange-food' ? 3 : 12;
  next.cooking.xp = Math.min(MAX_COUNTER, next.cooking.xp + xpGained);
  next.activities = Math.min(MAX_COUNTER, next.activities + 1);
  return {
    state: next,
    success: true,
    recipeId: recipe.id,
    discovered,
    xpGained,
    message:
      recipe.id === 'strange-food'
        ? '¡Comida Rara! La mezcla recupera un poquito de Apetito. Prueba otra combinación.'
        : `¡${recipe.name} preparado! +${xpGained} experiencia de cocina.`,
  };
}
export function craftFood(state: GameState, recipeId: RecipeId, now = Date.now()): CareResult {
  const recipe = RECIPES.find((item) => item.id === recipeId && item.id !== 'strange-food');
  if (!recipe || recipe.unlockLevel > getCookingProgress(state).level)
    return {
      state: advanceTime(state, now),
      success: false,
      message: 'Esa receta todavía no está disponible.',
    };
  const ingredients = Object.entries(recipe.ingredients).flatMap(([id, count]) =>
    Array.from({ length: count! }, () => id as MaterialId),
  );
  return cookIngredients(state, ingredients, now);
}
export function purchaseIngredient(
  state: GameState,
  materialId: MaterialId,
  quantity = 1,
  now = Date.now(),
): CareResult {
  const next = advanceTime(state, now);
  const material = MATERIALS.find((item) => item.id === materialId);
  if (!material || !validInteger(quantity, 1, 99))
    return { state: next, success: false, message: 'Elige un ingrediente y una cantidad válida.' };
  if (material.unlockLevel > getCookingProgress(next).level)
    return {
      state: next,
      success: false,
      message: `Este ingrediente requiere nivel ${material.unlockLevel} de cocina.`,
    };
  const cost = material.price * quantity;
  if (next.coins < cost)
    return {
      state: next,
      success: false,
      message: 'Necesitas más puntos. Juega con tu mascota para conseguirlos.',
    };
  if (next.inventory.materials[material.id] + quantity > MAX_COUNTER)
    return {
      state: next,
      success: false,
      message: 'No cabe más de ese ingrediente en tu mochila.',
    };
  next.coins -= cost;
  next.inventory.materials[material.id] += quantity;
  return {
    state: next,
    success: true,
    message: `¡${quantity} de ${material.name.toLowerCase()} para tu cocina!`,
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
  principalParticipates = true,
  cookingLevel = 1,
  lootVersion: 1 | 2 = 2,
): Record<MaterialId, number> {
  const result = emptyMaterials();
  const factor = companions + (principalParticipates ? 1 : 0);
  const primary: MaterialId = biome === 'forest' ? 'berries' : biome === 'coast' ? 'kelp' : 'root';
  result[primary] = (2 + (seed % 2)) * factor;
  result.grain = factor;
  result.herb = factor;
  if (lootVersion === 2) {
    result.seeds = factor;
    if (cookingLevel >= 2) result[biome === 'tundra' ? 'mushroom' : 'carrot'] = factor;
    if (cookingLevel >= 3) result[biome === 'coast' ? 'coconut' : 'honey'] = factor;
    if (cookingLevel >= 4) result.milk = factor;
    if (cookingLevel >= 5) result.cocoa = factor;
  }
  return result;
}
function explorationDay(timestamp: number): string {
  return explorationCalendar.format(Math.min(timestamp, MAX_DATE));
}

/** Find the local date boundary without relying on the host's timezone or a fixed offset. */
function nextExplorationDay(timestamp: number): number {
  if (timestamp >= MAX_DATE) return Number.MAX_SAFE_INTEGER;
  const today = explorationDay(timestamp);
  let lower = timestamp;
  let upper = Math.min(MAX_DATE, timestamp + 48 * HOUR);
  if (explorationDay(upper) === today) return Number.MAX_SAFE_INTEGER;
  while (upper - lower > 1) {
    const middle = lower + Math.floor((upper - lower) / 2);
    if (explorationDay(middle) === today) lower = middle;
    else upper = middle;
  }
  return upper;
}

export function getExplorationAvailability(
  state: GameState,
  now = Date.now(),
): {
  remaining: number;
  nextAvailableAt: number;
  canStart: boolean;
  reason: 'stage' | 'pending' | 'daily-limit' | 'cooldown' | null;
} {
  const timestamp = Math.max(state.lastUpdated, normalizeNow(now, state.lastUpdated));
  const starts = [
    ...new Set([
      ...state.explorationStarts,
      ...(state.expedition ? [state.expedition.startedAt] : []),
    ]),
  ].sort((a, b) => a - b);
  const today = explorationDay(timestamp);
  const departuresToday = starts.filter((startedAt) => explorationDay(startedAt) === today);
  const remaining = Math.max(0, EXPEDITIONS_PER_DAY - departuresToday.length);
  const lastDeparture = starts.at(-1);
  const cooldownEnds =
    lastDeparture === undefined
      ? timestamp
      : Math.min(Number.MAX_SAFE_INTEGER, lastDeparture + EXPEDITION_COOLDOWN_HOURS * HOUR);
  const nextSlot = remaining ? timestamp : nextExplorationDay(timestamp);
  const nextAvailableAt = Math.max(timestamp, cooldownEnds, nextSlot);
  const effectiveAge = Math.min(
    MAX_COUNTER,
    state.pet.growthSeconds + (timestamp - state.lastUpdated) / 1000,
  );
  const reason = state.expedition
    ? 'pending'
    : stageFor(effectiveAge) !== 'adult' && !state.freePets.some((pet) => pet.stage === 'adult')
      ? 'stage'
      : remaining === 0
        ? 'daily-limit'
        : nextAvailableAt > timestamp
          ? 'cooldown'
          : null;
  return {
    remaining,
    nextAvailableAt,
    canStart: reason === null,
    reason,
  };
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
  if (next.pet.stage !== 'adult' && next.freePets.length === 0)
    return {
      state: next,
      success: false,
      message: 'Necesitas una mascota adulta para salir de exploración.',
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
  if (next.pet.stage !== 'adult' && companionIds.length === 0)
    return {
      state: next,
      success: false,
      message: 'Elige al menos una mascota adulta libre para explorar.',
    };
  const availability = getExplorationAvailability(next, next.lastUpdated);
  if (!availability.canStart)
    return {
      state: next,
      success: false,
      message:
        availability.reason === 'daily-limit'
          ? 'Ya realizaste las dos exploraciones de hoy. Las salidas se renuevan al empezar un nuevo día.'
          : 'Tu equipo necesita descansar antes de otra exploración.',
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
    rewards: expeditionRewards(
      next.currentBiome,
      companionIds.length,
      next.pet.seed,
      next.pet.stage === 'adult',
      getCookingProgress(next).level,
      2,
    ),
    principalParticipates: next.pet.stage === 'adult',
    cookingLevel: getCookingProgress(next).level,
    lootVersion: 2,
  };
  next.explorationStarts = [...next.explorationStarts, next.lastUpdated].slice(
    -EXPEDITIONS_PER_DAY,
  );
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
  const reward = Math.min(5, Math.ceil(settledScore / 5));
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
  required: readonly T[] = ids,
): Record<T, number> | null {
  if (
    !record(value) ||
    !required.every((id) => validInteger(value[id], 0, maximum)) ||
    !ids.every((id) => value[id] === undefined || validInteger(value[id], 0, maximum))
  )
    return null;
  return Object.fromEntries(ids.map((id) => [id, value[id] ?? 0])) as Record<T, number>;
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
  const diet = counters(value.diet, recipeIds, MAX_COUNTER, legacyRecipeIds);
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
      const materials = counters(
        data.inventory.materials,
        materialIds,
        MAX_COUNTER,
        legacyMaterialIds,
      );
      const food = counters(data.inventory.food, recipeIds, MAX_COUNTER, legacyRecipeIds);
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
        const principalParticipates =
          expedition.principalParticipates === undefined ? true : expedition.principalParticipates;
        const cookingLevel = expedition.cookingLevel === undefined ? 1 : expedition.cookingLevel;
        const lootVersion = expedition.lootVersion === undefined ? 1 : expedition.lootVersion;
        if (
          typeof principalParticipates !== 'boolean' ||
          (!principalParticipates && expedition.companionIds.length === 0) ||
          !validInteger(cookingLevel, 1, MAX_COOKING_LEVEL) ||
          (lootVersion !== 1 && lootVersion !== 2)
        )
          return null;
        const rewards = counters(expedition.rewards, materialIds, 20, legacyMaterialIds);
        const expectedRewards = expeditionRewards(
          expedition.biome as BiomeId,
          expedition.companionIds.length,
          next.pet.seed,
          principalParticipates,
          cookingLevel,
          lootVersion,
        );
        if (!rewards || materialIds.some((id) => rewards[id] !== expectedRewards[id])) return null;
        next.expedition = {
          id: expedition.id,
          biome: expedition.biome as BiomeId,
          companionIds: [...expedition.companionIds] as string[],
          startedAt: expedition.startedAt,
          endsAt: expedition.endsAt,
          rewards,
          principalParticipates,
          cookingLevel,
          lootVersion,
        };
      }
    }
    if (data.version === 3 && data.explorationStarts !== undefined) {
      const starts = data.explorationStarts;
      if (
        !Array.isArray(starts) ||
        starts.length > EXPEDITIONS_PER_DAY ||
        starts.some(
          (value, index) =>
            !validInteger(value, 0, data.lastUpdated as number) ||
            (index > 0 && value <= starts[index - 1]),
        )
      )
        return null;
      next.explorationStarts = [...starts] as number[];
    }
    // Existing v1/v2/v3 games have no history. An expedition already underway
    // still occupies its departure slot when this additive field is introduced.
    if (next.expedition && !next.explorationStarts.includes(next.expedition.startedAt))
      next.explorationStarts = [...next.explorationStarts, next.expedition.startedAt]
        .sort((a, b) => a - b)
        .slice(-EXPEDITIONS_PER_DAY);
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
    if (data.cooking !== undefined) {
      if (
        !record(data.cooking) ||
        !validInteger(data.cooking.xp) ||
        !Array.isArray(data.cooking.discovered) ||
        data.cooking.discovered.length > recipeIds.length ||
        new Set(data.cooking.discovered).size !== data.cooking.discovered.length ||
        data.cooking.discovered.some((id) => !recipeIds.includes(id as RecipeId))
      )
        return null;
      next.cooking = {
        xp: data.cooking.xp,
        discovered: [...data.cooking.discovered] as RecipeId[],
      };
    } else {
      next.cooking.discovered = recipeIds.filter(
        (id) => next.inventory.food[id] > 0 || next.pet.diet[id] > 0 || id === 'fruit-bowl',
      );
    }
    return advanceTime(next, now);
  } catch {
    return null;
  }
}
