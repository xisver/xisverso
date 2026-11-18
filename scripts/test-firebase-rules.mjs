import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  inMemoryPersistence,
  setPersistence,
  signInAnonymously,
  deleteUser,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  terminate,
  setLogLevel,
} from 'firebase/firestore/lite';

// Refuse to start unless the official emulators:exec process explicitly routes
// both services to loopback. Never use the checkout's real Firebase project.
const PROJECT = 'demo-xisverso';
assert.equal(
  process.env.FIRESTORE_EMULATOR_HOST,
  '127.0.0.1:8080',
  'Run this script with the Firestore emulator at 127.0.0.1:8080.',
);
assert.equal(
  process.env.FIREBASE_AUTH_EMULATOR_HOST,
  '127.0.0.1:9099',
  'Run this script with the Authentication emulator at 127.0.0.1:9099.',
);
if (process.env.GCLOUD_PROJECT) assert.equal(process.env.GCLOUD_PROJECT, PROJECT);
setLogLevel('silent');

const clients = [];
let owner;
let guest;
let passed = 0;

async function makeClient(name, authenticated) {
  const app = initializeApp(
    {
      apiKey: 'demo-xisverso-emulator-only',
      projectId: PROJECT,
      authDomain: `${PROJECT}.firebaseapp.com`,
      appId: `1:123456789:web:rules-${name}`,
    },
    `rules-${name}-${Date.now()}`,
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  await setPersistence(auth, inMemoryPersistence);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const client = { app, auth, db };
  clients.push(client);
  if (authenticated) await signInAnonymously(auth);
  return client;
}

function world() {
  return {
    version: 1,
    name: 'Refugio de pruebas',
    biome: 'forest',
    pet: { name: 'Nubi', seed: 42, biome: 'coast', stage: 'baby' },
    decorations: ['lantern', 'flowers'],
    updatedAt: serverTimestamp(),
  };
}

async function denied(name, operation) {
  await assert.rejects(operation, (error) => error?.code === 'permission-denied', name);
  passed++;
}

function check(value, expected, name) {
  assert.deepEqual(value, expected, name);
  passed++;
}

const invalidWorlds = [
  ['extra top-level field', (value) => ({ ...value, extraData: 'not allowed' })],
  ['inventory must remain local', (value) => ({ ...value, inventory: { berries: 99 } })],
  ['currency must remain local', (value) => ({ ...value, coins: 999 })],
  ['missing name', ({ name, ...value }) => value],
  ['missing pet', ({ pet, ...value }) => value],
  ['missing timestamp', ({ updatedAt, ...value }) => value],
  ['world name too long', (value) => ({ ...value, name: 'a'.repeat(37) })],
  ['world name wrong type', (value) => ({ ...value, name: 3 })],
  ['world name contains markup', (value) => ({ ...value, name: '<script>' })],
  ['world name contains newline', (value) => ({ ...value, name: 'Refugio\nextra' })],
  ['pet name too long', (value) => ({ ...value, pet: { ...value.pet, name: 'a'.repeat(25) } })],
  ['pet extra field', (value) => ({ ...value, pet: { ...value.pet, bond: 100 } })],
  ['pet seed wrong type', (value) => ({ ...value, pet: { ...value.pet, seed: '42' } })],
  ['pet seed negative', (value) => ({ ...value, pet: { ...value.pet, seed: -1 } })],
  ['pet seed too large', (value) => ({ ...value, pet: { ...value.pet, seed: 4294967296 } })],
  ['pet seed fractional', (value) => ({ ...value, pet: { ...value.pet, seed: 1.5 } })],
  ['world biome unknown', (value) => ({ ...value, biome: 'space' })],
  ['pet biome unknown', (value) => ({ ...value, pet: { ...value.pet, biome: 'space' } })],
  ['pet stage unknown', (value) => ({ ...value, pet: { ...value.pet, stage: 'ancient' } })],
  ['decorations wrong type', (value) => ({ ...value, decorations: { lantern: true } })],
  ['decoration duplicated', (value) => ({ ...value, decorations: ['lantern', 'lantern'] })],
  ['decoration unknown', (value) => ({ ...value, decorations: ['private-data'] })],
  [
    'too many decorations',
    (value) => ({
      ...value,
      decorations: ['lantern', 'flowers', 'fountain', 'bench', 'mushrooms', 'arch', 'lantern'],
    }),
  ],
  ['client-controlled timestamp', (value) => ({ ...value, updatedAt: Timestamp.fromMillis(0) })],
  ['timestamp wrong type', (value) => ({ ...value, updatedAt: Date.now() })],
  ['unknown schema version', (value) => ({ ...value, version: 2 })],
];

try {
  owner = await makeClient('owner', true);
  guest = await makeClient('guest', true);
  const unauthenticated = await makeClient('unauthenticated', false);
  const code = owner.auth.currentUser.uid;
  assert.match(code, /^[A-Za-z0-9_-]{20,128}$/u);
  assert.notEqual(code, guest.auth.currentUser.uid);
  const ownerRef = doc(owner.db, 'worlds', code);
  const guestRef = doc(guest.db, 'worlds', code);

  await setDoc(ownerRef, world());
  passed++;
  check((await getDoc(ownerRef)).data().pet.stage, 'baby', 'Owner reads their own world');
  check((await getDoc(guestRef)).data().name, 'Refugio de pruebas', 'Guest visits by exact code');
  await denied('Guest cannot overwrite another owner', () => setDoc(guestRef, world()));
  await denied('Guest cannot update another owner', () =>
    updateDoc(guestRef, { name: 'Changed by a guest', updatedAt: serverTimestamp() }),
  );
  await denied('Guest cannot remove another owner', () => deleteDoc(guestRef));
  await denied('Unauthenticated visitor cannot read a world', () =>
    getDoc(doc(unauthenticated.db, 'worlds', code)),
  );
  await denied('Guest cannot list worlds', () => getDocs(collection(guest.db, 'worlds')));
  await denied('Owner cannot list worlds', () => getDocs(collection(owner.db, 'worlds')));
  await denied('Unmatched private paths cannot be read', () =>
    getDoc(doc(owner.db, 'private', code)),
  );
  await denied('Unmatched private paths cannot be written', () =>
    setDoc(doc(owner.db, 'private', code), { coins: 100 }),
  );
  await denied('Subcollections are not exposed', () =>
    setDoc(doc(owner.db, 'worlds', code, 'inventory', 'food'), { count: 100 }),
  );

  await deleteDoc(ownerRef);
  passed++;
  check((await getDoc(guestRef)).exists(), false, 'Removing a postcard ends later visits');
  await denied('Guest cannot create a world under another owner code', () =>
    setDoc(guestRef, world()),
  );

  for (const [name, change] of invalidWorlds)
    await denied(`Invalid create rejected: ${name}`, () => setDoc(ownerRef, change(world())));
  console.log(
    `Reglas: flujo de visitas y ${invalidWorlds.length} variantes de creación comprobados.`,
  );

  await setDoc(ownerRef, world());
  passed++;
  await denied('Owner cannot update before the 30-second cooldown', () =>
    updateDoc(ownerRef, { name: 'Demasiado pronto', updatedAt: serverTimestamp() }),
  );
  console.log(
    'Reglas: esperando 31 segundos para comprobar update sin confundir el límite con el esquema.',
  );
  await delay(31_000);

  // Rejected writes do not modify updatedAt. Test every malformed full update
  // after the cooldown so that schema validation, rather than timing, rejects it.
  for (const [name, change] of invalidWorlds)
    await denied(`Invalid update rejected: ${name}`, () => setDoc(ownerRef, change(world())));

  await updateDoc(ownerRef, { name: 'Refugio renovado', updatedAt: serverTimestamp() });
  passed++;
  check(
    (await getDoc(guestRef)).data().name,
    'Refugio renovado',
    'Valid owner update remains visitable',
  );
  await denied('A successful update starts a new cooldown', () =>
    updateDoc(ownerRef, { name: 'Otra actualización', updatedAt: serverTimestamp() }),
  );
  await deleteDoc(ownerRef);
  passed++;
  check((await getDoc(guestRef)).exists(), false, 'Owner can withdraw a recently updated postcard');
  console.log(`RULES_OK: ${passed} comprobaciones reales con Auth y Firestore locales.`);
} finally {
  if (owner?.auth.currentUser) {
    try {
      await deleteDoc(doc(owner.db, 'worlds', owner.auth.currentUser.uid));
    } catch {
      // Preserve the original failure if the emulator stopped during the test.
    }
  }
  for (const client of clients) {
    if (client.auth.currentUser) await deleteUser(client.auth.currentUser).catch(() => {});
    await terminate(client.db).catch(() => {});
    await deleteApp(client.app).catch(() => {});
  }
}
