import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type UserCredential,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { isOwnerEmail } from './permissions';
import type { PublicPost } from './types';

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let connectionChecked = false;
export async function testFirestoreConnection(): Promise<void> {
  if (connectionChecked) return;
  connectionChecked = true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export async function signInWithGooglePopup(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
}

export async function signOutFirebase(): Promise<void> {
  try {
    if (auth.currentUser) {
      await firebaseSignOut(auth);
    }
  } catch {
    // Ignore client sign-out cleanup failures
  }
}

export async function syncSignedInUserToFirestore(
  displayName: string,
  whatsapp: string = ''
): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) return;

  const uid = fbUser.uid;
  const email = fbUser.email || '';
  const owner = isOwnerEmail(email);
  const safeName = displayName.trim().slice(0, 50) || 'Pengguna';

  const publicPath = `users/${uid}`;
  const publicRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(publicRef);
    if (!snap.exists()) {
      await setDoc(publicRef, {
        uid,
        displayName: safeName,
        isOwner: owner,
        isVerified: owner,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(publicRef, {
        displayName: safeName,
        isOwner: owner,
        isVerified: owner,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, publicPath);
  }

  const privatePath = `users/${uid}/private/info`;
  const privateRef = doc(db, 'users', uid, 'private', 'info');
  try {
    const privSnap = await getDoc(privateRef);
    if (!privSnap.exists()) {
      await setDoc(privateRef, {
        uid,
        email,
        whatsapp: whatsapp.slice(0, 20),
        isBanned: false,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(privateRef, {
        email,
        whatsapp: whatsapp.slice(0, 20),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, privatePath);
  }
}

export async function syncPostToFirestore(post: PublicPost): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) return;

  const postPath = `posts/${post.id}`;
  const postRef = doc(db, 'posts', post.id);
  try {
    const snap = await getDoc(postRef);
    const owner = isOwnerEmail(fbUser.email);
    const payload = {
      authorId: fbUser.uid,
      sellerName: post.sellerName.slice(0, 50),
      authorIsOwner: owner && post.authorIsOwner,
      authorVerified: owner && post.authorVerified,
      isPinned: owner ? post.isPinned : false,
      title: post.title.slice(0, 80),
      description: post.description.slice(0, 2000),
      priceIdr: Math.max(0, Math.round(post.priceIdr)),
      category: post.category,
      images: post.images.slice(0, 5),
      contactWhatsapp: post.contactWhatsapp,
      status: post.status,
      updatedAt: serverTimestamp(),
    };
    if (!snap.exists()) {
      await setDoc(postRef, {
        ...payload,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(postRef, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, postPath);
  }
}

export async function removePostFromFirestore(postId: string): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) return;

  const postPath = `posts/${postId}`;
  try {
    await deleteDoc(doc(db, 'posts', postId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, postPath);
  }
}
