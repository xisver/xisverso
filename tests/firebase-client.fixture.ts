import { getApps } from 'firebase/app';
import { deleteUser, getAuth } from 'firebase/auth';
import { deleteDoc, doc, getFirestore } from 'firebase/firestore/lite';

/** Only used by the explicit live check, inside fresh, isolated browser contexts. */
export async function removeTestIdentity() {
  const app = getApps().find((item) => item.name === 'xisverso-visits');
  if (!app) return;
  const auth = getAuth(app);
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return;
  if (!user.isAnonymous)
    throw new Error('La comprobación solo puede limpiar identidades anónimas.');
  try {
    await deleteDoc(doc(getFirestore(app), 'worlds', user.uid));
  } finally {
    await deleteUser(user);
  }
}
