import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously, updateProfile, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeFirestore, collection, doc, setDoc, getDoc, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Test connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();

export const signOutUser = () => signOut(auth);

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Check if this is the teacher/admin email or tech email
    const isAdminEmail = user.email === 'nguyenquynghia00@gmail.com';
    const isTechEmail = user.email === 'nqnghia2013@gmail.com';
    
    let role = 'student';
    if (isAdminEmail) role = 'admin';
    else if (isTechEmail) role = 'tech';
    
    // Create or update user profile
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      role: role
    }, { merge: true });
    
    return user;
  } catch (error) {
    console.error('Error logging in with Google:', error);
    throw error;
  }
};

export const logout = () => signOut(auth);

export const loginWithEmail = async (username: string, password: string) => {
  try {
    // We use a dummy email format for usernames: username@7a2hub.local
    const email = `${username.toLowerCase()}@7a2hub.local`;
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error('Error logging in with email:', error);
    throw error;
  }
};

export const createStudentAccount = async (name: string, username: string, password: string) => {
  try {
    // To create a user without logging out the admin, we need a secondary app instance
    const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
    const secondaryAuth = getAuth(secondaryApp);
    
    const email = `${username.toLowerCase()}@7a2hub.local`;
    const result = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const user = result.user;
    
    await updateProfile(user, {
      displayName: name
    });
    
    // Create user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      displayName: name,
      email: email,
      username: username.toLowerCase(),
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      role: 'student',
      isAccount: true
    }, { merge: true });
    
    // Clean up secondary app
    await secondaryAuth.signOut();
    // Note: deleteApp(secondaryApp) is not strictly necessary here but good practice
    
    return user;
  } catch (error) {
    console.error('Error creating student account:', error);
    throw error;
  }
};

export const createAdminAccount = async (name: string, username: string, password: string) => {
  try {
    const secondaryApp = initializeApp(firebaseConfig, `Secondary_${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    
    const email = `${username.toLowerCase()}@7a2hub.local`;
    const result = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const user = result.user;
    
    await updateProfile(user, {
      displayName: name
    });
    
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      displayName: name,
      email: email,
      username: username.toLowerCase(),
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      role: 'admin',
      isAccount: true
    }, { merge: true });
    
    await secondaryAuth.signOut();
    return user;
  } catch (error) {
    console.error('Error creating admin account:', error);
    throw error;
  }
};

export const loginAsGuest = async (name: string) => {
  try {
    const result = await signInAnonymously(auth);
    const user = result.user;
    
    await updateProfile(user, {
      displayName: name
    });
    
    // Create or update user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      displayName: name,
      email: null,
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      role: 'student',
      isGuest: true
    }, { merge: true });
    
    return user;
  } catch (error) {
    console.error('Error logging in as guest:', error);
    throw error;
  }
};

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;

export type OperationType = typeof OperationType[keyof typeof OperationType];

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
