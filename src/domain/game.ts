/** The local simulation is deliberately independent of rendering and storage APIs. */
export type BiomeId = 'forest' | 'coast' | 'tundra';
export type Need = 'hunger' | 'energy' | 'hygiene' | 'joy';
export type Action = 'feed' | 'clean' | 'rest' | 'pet';

export interface GameState {
  version: 1;
  pet: {
    id: string;
    name: string;
    seed: number;
    biome: BiomeId;
    needs: Record<Need, number>;
    bond: number;
  };
  coins: number;
  level: number;
  /** Lifetime experience; every 100 points grants another level. */
  xp: number;
  lastUpdated: number;
  activities: number;
  miniGameBest: number;
}
export type State = GameState;

export interface BiomeDefinition {
  id: BiomeId;
  name: string;
  label: string;
  description: string;
  accent: string;
  unlockLevel: number;
}

export const BIOMES: readonly BiomeDefinition[] = [
  {
    id: 'forest',
    name: 'Bosque Susurro',
    label: 'Bosque',
    description: 'Un refugio entre hojas, luciérnagas y pequeños descubrimientos.',
    accent: '#47745b',
    unlockLevel: 1,
  },
  {
    id: 'coast',
    name: 'Costa Nácar',
    label: 'Costa',
    description: 'Brisa salada, conchas y una mascota lista para explorar la orilla.',
    accent: '#368d9e',
    unlockLevel: 1,
  },
  {
    id: 'tundra',
    name: 'Tundra Aurora',
    label: 'Tundra',
    description: 'Nieve suave y auroras: aquí descansar y conservar energía importa más.',
    accent: '#8775ad',
    unlockLevel: 1,
  },
];

export const CARE_COSTS: Readonly<Record<Action, number>> = { feed: 5, clean: 0, rest: 0, pet: 0 };
export const MAX_OFFLINE_HOURS = 8;
export const XP_PER_LEVEL = 100;
const HOUR = 3_600_000;
const MAX_COUNTER = 1_000_000_000;
const needs: readonly Need[] = ['hunger', 'energy', 'hygiene', 'joy'];
const biomeIds: readonly BiomeId[] = ['forest', 'coast', 'tundra'];
const decayRates: Record<BiomeId, Record<Need, number>> = {
  forest: { hunger: 5, energy: 3, hygiene: 3, joy: 3 },
  coast: { hunger: 5.5, energy: 3.5, hygiene: 4.5, joy: 2.5 },
  tundra: { hunger: 6, energy: 5.5, hygiene: 2, joy: 3 },
};
const care: Record<Action, { need: Need; gain: number; message: string }> = {
  feed: { need: 'hunger', gain: 26, message: '¡Qué rico! Su pancita está feliz.' },
  clean: { need: 'hygiene', gain: 32, message: 'Un baño de burbujas. ¡Como nueva!' },
  rest: { need: 'energy', gain: 30, message: 'Una pequeña siesta para recargar energía.' },
  pet: { need: 'joy', gain: 22, message: 'Un mimo que hace crecer su confianza en ti.' },
};

const clamp = (value: number, min = 0, max = 100): number => Math.min(max, Math.max(min, value));
const clone = (state: GameState): GameState => ({
  ...state,
  pet: { ...state.pet, needs: { ...state.pet.needs } },
});
const validNumber = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const validInteger = (value: unknown, min: number, max: number): value is number =>
  validNumber(value, min, max) && Number.isInteger(value);
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const normalizeNow = (now: number, fallback = 0): number =>
  validNumber(now, 0, Number.MAX_SAFE_INTEGER) ? Math.floor(now) : fallback;

function grantExperience(state: GameState, amount: number): void {
  state.xp = Math.min(MAX_COUNTER, state.xp + amount);
  state.level = 1 + Math.floor(state.xp / XP_PER_LEVEL);
}

export function createGame(now = Date.now()): GameState {
  const seed = Math.floor(Math.random() * 0x1_0000_0000);
  const timestamp = normalizeNow(now);
  return {
    version: 1,
    pet: {
      id: `xis-${timestamp.toString(36)}-${seed.toString(36)}`,
      name: 'Nubi',
      seed,
      biome: 'forest',
      needs: { hunger: 78, energy: 84, hygiene: 73, joy: 88 },
      bond: 12,
    },
    coins: 80,
    level: 1,
    xp: 0,
    lastUpdated: timestamp,
    activities: 0,
    miniGameBest: 0,
  };
}

/** No background timer is required: reconcile elapsed time when reopening or resuming. */
export function advanceTime(state: GameState, now = Date.now()): GameState {
  const next = clone(state);
  const timestamp = normalizeNow(now, state.lastUpdated);
  if (timestamp <= state.lastUpdated) return next;
  const elapsedHours = Math.min((timestamp - state.lastUpdated) / HOUR, MAX_OFFLINE_HOURS);
  for (const need of needs)
    next.pet.needs[need] = clamp(
      next.pet.needs[need] - elapsedHours * decayRates[next.pet.biome][need],
    );
  next.lastUpdated = timestamp;
  return next;
}

export function applyCare(
  state: GameState,
  action: Action,
  now = Date.now(),
): { state: GameState; message: string; success: boolean } {
  const next = advanceTime(state, now);
  const definition = care[action];
  if (!definition)
    return { state: next, message: 'Ese cuidado todavía no está disponible.', success: false };
  if (next.pet.needs[definition.need] >= 98)
    return {
      state: next,
      message: 'Ya tiene esa necesidad cubierta. Prueba otro cuidado.',
      success: false,
    };
  if (next.coins < CARE_COSTS[action])
    return {
      state: next,
      message: 'Necesitas 5 semillas. Puedes conseguirlas jugando.',
      success: false,
    };
  next.coins -= CARE_COSTS[action];
  next.pet.needs[definition.need] = clamp(next.pet.needs[definition.need] + definition.gain);
  next.pet.bond = clamp(next.pet.bond + (action === 'pet' ? 4 : 2));
  next.activities = Math.min(MAX_COUNTER, next.activities + 1);
  grantExperience(next, 5);
  return { state: next, message: definition.message, success: true };
}

export function changeBiome(state: GameState, biome: BiomeId, now = Date.now()): GameState {
  const next = advanceTime(state, now);
  if (biomeIds.includes(biome)) next.pet.biome = biome;
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
  if (cleaned.length > 0) next.pet.name = cleaned;
  return next;
}

/** Local prototype economy only. The caller settles each game once; online rewards require a server. */
export function rewardMiniGame(
  state: GameState,
  score: number,
  now = Date.now(),
): { state: GameState; reward: number } {
  const next = advanceTime(state, now);
  const settledScore = Number.isFinite(score) ? Math.floor(clamp(score, 0, MAX_COUNTER)) : 0;
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
  const n = state.pet.needs;
  if (n.energy < 30) return 'Con sueño';
  if (n.hunger < 30) return 'Tiene hambre';
  if (n.hygiene < 30) return 'Quiere un baño';
  if (n.joy < 30) return 'Busca compañía';
  if (needs.every((need) => n[need] >= 75)) return 'Radiante';
  if (needs.every((need) => n[need] >= 45)) return 'A gusto';
  return 'Necesita cuidados';
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

/** Reject corrupt/unsupported saves and copy only known properties before restoring. */
export function parseSave(raw: string | null | undefined, now = Date.now()): GameState | null {
  if (typeof raw !== 'string' || raw.length > 16_384) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!record(data) || data.version !== 1 || !record(data.pet) || !record(data.pet.needs))
      return null;
    const pet = data.pet;
    if (typeof pet.id !== 'string' || !/^xis-[a-z0-9-]{3,64}$/u.test(pet.id)) return null;
    if (
      typeof pet.name !== 'string' ||
      pet.name.trim().length < 1 ||
      pet.name.length > 24 ||
      /[\u0000-\u001f\u007f]/u.test(pet.name)
    )
      return null;
    if (
      !validInteger(pet.seed, 0, 0xffff_ffff) ||
      !biomeIds.includes(pet.biome as BiomeId) ||
      !validNumber(pet.bond, 0, 100)
    )
      return null;
    const savedNeeds = pet.needs as Record<string, unknown>;
    if (!needs.every((need) => validNumber(savedNeeds[need], 0, 100))) return null;
    if (!validInteger(data.coins, 0, MAX_COUNTER) || !validInteger(data.xp, 0, MAX_COUNTER))
      return null;
    if (
      !validInteger(data.level, 1, 10_000_001) ||
      data.level !== 1 + Math.floor(data.xp / XP_PER_LEVEL)
    )
      return null;
    if (
      !validInteger(data.lastUpdated, 0, Number.MAX_SAFE_INTEGER) ||
      !validInteger(data.activities, 0, MAX_COUNTER) ||
      !validInteger(data.miniGameBest, 0, MAX_COUNTER)
    )
      return null;
    const restored: GameState = {
      version: 1,
      pet: {
        id: pet.id,
        name: pet.name.trim(),
        seed: pet.seed,
        biome: pet.biome as BiomeId,
        bond: pet.bond,
        needs: {
          hunger: savedNeeds.hunger as number,
          energy: savedNeeds.energy as number,
          hygiene: savedNeeds.hygiene as number,
          joy: savedNeeds.joy as number,
        },
      },
      coins: data.coins,
      level: data.level,
      xp: data.xp,
      lastUpdated: data.lastUpdated,
      activities: data.activities,
      miniGameBest: data.miniGameBest,
    };
    return advanceTime(restored, now);
  } catch {
    return null;
  }
}
