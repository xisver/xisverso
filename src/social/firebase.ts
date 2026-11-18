import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore/lite';
import type { BiomeId, DecorationId, GameState, PetStage } from '../domain/game.ts';

/** A shared postcard, never a save file or an authority for rewards. */
export interface VisitWorld {
  version: 1;
  name: string;
  biome: BiomeId;
  pet: { name: string; seed: number; biome: BiomeId; stage: PetStage };
  decorations: DecorationId[];
  updatedAt: number;
}

const biomes = ['forest', 'coast', 'tundra'] as const;
const stages = ['egg', 'baby', 'young', 'adult'] as const;
const decorations = ['lantern', 'flowers', 'fountain', 'bench', 'mushrooms', 'arch'] as const;
const worldKeys = ['version', 'name', 'biome', 'pet', 'decorations', 'updatedAt'];
const petKeys = ['name', 'seed', 'biome', 'stage'];
const CODE_PATTERN = /^[A-Za-z0-9_-]{20,128}$/u;
const PUBLISH_INTERVAL = 30_000;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => key in value);
}
function cleanText(value: string, maximum: number): string {
  return value
    .replace(/[<>\u0000-\u001f\u007f]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, maximum)
    .trim();
}
function validText(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.length > 0 && cleanText(value, maximum) === value;
}

export function validVisitCode(code: string): boolean {
  return CODE_PATTERN.test(code.trim());
}

/** Validate untrusted remote data before handing it to Canvas or the interface. */
export function parseVisitWorld(value: unknown): VisitWorld | null {
  if (
    !record(value) ||
    !exactKeys(value, worldKeys) ||
    value.version !== 1 ||
    !validText(value.name, 36) ||
    !biomes.includes(value.biome as BiomeId) ||
    !record(value.pet) ||
    !exactKeys(value.pet, petKeys) ||
    !validText(value.pet.name, 24) ||
    !Number.isInteger(value.pet.seed) ||
    (value.pet.seed as number) < 0 ||
    (value.pet.seed as number) > 0xffff_ffff ||
    !biomes.includes(value.pet.biome as BiomeId) ||
    !stages.includes(value.pet.stage as PetStage) ||
    !Array.isArray(value.decorations) ||
    value.decorations.length > decorations.length ||
    new Set(value.decorations).size !== value.decorations.length ||
    !value.decorations.every((id) => decorations.includes(id as DecorationId)) ||
    !Number.isSafeInteger(value.updatedAt) ||
    (value.updatedAt as number) < 0
  )
    return null;
  return {
    version: 1,
    name: value.name,
    biome: value.biome as BiomeId,
    pet: {
      name: value.pet.name,
      seed: value.pet.seed as number,
      biome: value.pet.biome as BiomeId,
      stage: value.pet.stage as PetStage,
    },
    decorations: [...value.decorations] as DecorationId[],
    updatedAt: value.updatedAt as number,
  };
}

/** Explicit allowlist keeps inventory, needs, IDs and currency on this device. */
export function createVisitWorld(state: GameState, name: string, now = Date.now()): VisitWorld {
  const world = parseVisitWorld({
    version: 1,
    name: cleanText(name, 36),
    biome: state.currentBiome,
    pet: {
      name: cleanText(state.pet.name, 24),
      seed: state.pet.seed,
      biome: state.pet.biome,
      stage: state.pet.stage,
    },
    decorations: [...state.decorations],
    updatedAt: now,
  });
  if (!world) throw visitError('invalid-world');
  return world;
}

function firebaseOptions(): FirebaseOptions | null {
  const env = import.meta.env ?? {};
  const apiKey = env.VITE_FIREBASE_API_KEY?.trim();
  const projectId = env.VITE_FIREBASE_PROJECT_ID?.trim();
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN?.trim();
  const appId = env.VITE_FIREBASE_APP_ID?.trim();
  if (!apiKey || !projectId || !authDomain || !appId) return null;
  return { apiKey, projectId, authDomain, appId };
}

export function firebaseConfigured(): boolean {
  return firebaseOptions() !== null;
}

type Client = { app: FirebaseApp; auth: Auth; db: Firestore };
let clientPromise: Promise<Client> | undefined;
let connectionPromise: Promise<{ code: string }> | undefined;
let publishPending = false;
let lastPublished = -Infinity;
let emulatorsConnected = false;

function visitError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code: `visits/${code}` });
}

async function client(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const options = firebaseOptions();
      if (!options) throw visitError('not-configured');
      const [appSDK, authSDK, firestoreSDK] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore/lite'),
      ]);
      const app =
        appSDK.getApps().find((item) => item.name === 'xisverso-visits') ??
        appSDK.initializeApp(options, 'xisverso-visits');
      const auth = authSDK.getAuth(app);
      const db = firestoreSDK.getFirestore(app);
      // Emulator routing is ignored in production builds.
      if (
        !emulatorsConnected &&
        import.meta.env?.DEV &&
        import.meta.env.VITE_FIREBASE_USE_EMULATORS === 'true'
      ) {
        const host = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1';
        authSDK.connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
        firestoreSDK.connectFirestoreEmulator(db, host, 8080);
        emulatorsConnected = true;
      }
      await authSDK.setPersistence(auth, authSDK.browserLocalPersistence);
      await auth.authStateReady();
      return { app, auth, db };
    })().catch((error: unknown) => {
      clientPromise = undefined;
      throw error;
    });
  }
  return clientPromise;
}

/** Called only after the player chooses to connect; importing this module does no I/O. */
export async function connectVisits(): Promise<{ code: string }> {
  if (!connectionPromise) {
    connectionPromise = (async () => {
      const { auth } = await client();
      const { signInAnonymously } = await import('firebase/auth');
      const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
      if (!CODE_PATTERN.test(user.uid)) throw visitError('invalid-code');
      return { code: user.uid };
    })().finally(() => {
      connectionPromise = undefined;
    });
  }
  return connectionPromise;
}

/** Sharing is opt-in and manual; there are no timer writes or background listeners. */
export async function publishWorld(state: GameState, name: string): Promise<{ code: string }> {
  const world = createVisitWorld(state, name);
  if (publishPending || Date.now() - lastPublished < PUBLISH_INTERVAL)
    throw visitError('publish-too-soon');
  publishPending = true;
  try {
    const { code } = await connectVisits();
    const { db } = await client();
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore/lite');
    await setDoc(doc(db, 'worlds', code), { ...world, updatedAt: serverTimestamp() });
    lastPublished = Date.now();
    return { code };
  } finally {
    publishPending = false;
  }
}

export async function visitWorld(code: string): Promise<VisitWorld> {
  const normalized = code.trim();
  if (!CODE_PATTERN.test(normalized)) throw visitError('invalid-code');
  await connectVisits();
  const { db } = await client();
  const { doc, getDoc, Timestamp } = await import('firebase/firestore/lite');
  const snapshot = await getDoc(doc(db, 'worlds', normalized));
  if (!snapshot.exists()) throw visitError('not-found');
  const data = snapshot.data();
  const world = parseVisitWorld({
    ...data,
    updatedAt: data.updatedAt instanceof Timestamp ? Math.floor(data.updatedAt.toMillis()) : null,
  });
  if (!world) throw visitError('invalid-world');
  return world;
}

/** Deleting the postcard does not delete the local game or the anonymous identity. */
export async function unpublishWorld(): Promise<void> {
  const { code } = await connectVisits();
  const { db } = await client();
  const { doc, deleteDoc } = await import('firebase/firestore/lite');
  await deleteDoc(doc(db, 'worlds', code));
}

export function describeVisitError(error: unknown): string {
  const code = record(error) && typeof error.code === 'string' ? error.code : '';
  if (code === 'visits/not-configured')
    return 'Las visitas necesitan conectar el proyecto Firebase de Xisverso.';
  if (code === 'visits/invalid-code') return 'Revisa el código del refugio de tu amigo.';
  if (code === 'visits/not-found')
    return 'Ese refugio todavía no se ha compartido o su dueño retiró la visita.';
  if (code === 'visits/invalid-world')
    return 'No pudimos abrir ese refugio. Su dueño puede volver a compartirlo.';
  if (code === 'visits/publish-too-soon')
    return 'Espera 30 segundos antes de volver a compartir tu refugio.';
  if (code === 'permission-denied')
    return 'No se pudo acceder al refugio. Revisa las reglas de Firebase y vuelve a intentarlo.';
  if (code === 'resource-exhausted' || code === 'auth/too-many-requests')
    return 'Las visitas alcanzaron su límite gratuito temporal. Inténtalo más tarde.';
  if (code === 'auth/operation-not-allowed')
    return 'Activa el acceso anónimo en Firebase para poder visitar refugios.';
  if (code === 'auth/web-storage-unsupported')
    return 'Permite el almacenamiento del navegador para conservar tu código de refugio.';
  if (code === 'auth/invalid-api-key' || code === 'auth/configuration-not-found')
    return 'La conexión de Firebase todavía necesita completar su configuración.';
  return 'No pudimos conectar ahora. Revisa tu conexión y vuelve a intentarlo; tu partida sigue en este dispositivo.';
}
