/**
 * Firebase Authentication Service
 *
 * Handles sign-up, login, logout, and auth state monitoring.
 * User profiles are stored in Firestore `users/{uid}`.
 */

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface FirebaseUserProfile {
  uid: string;
  name: string;
  email: string;
  createdAt: any;
  updatedAt: any;
}

// ─────────────────────────────────────────────────────────────
// SIGN UP
// ─────────────────────────────────────────────────────────────

/**
 * Create a new user with email/password.
 * Also saves their profile to Firestore `users/{uid}`.
 */
export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<FirebaseAuthTypes.User> {
  // Create the Firebase Auth account
  const credential = await auth().createUserWithEmailAndPassword(email, password);
  const user = credential.user;

  // Set the display name on the auth profile
  await user.updateProfile({ displayName: name });

  // Save user profile to Firestore
  await firestore().collection('users').doc(user.uid).set({
    name,
    email,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  return user;
}

// ─────────────────────────────────────────────────────────────
// LOG IN
// ─────────────────────────────────────────────────────────────

/**
 * Sign in an existing user with email/password.
 */
export async function logIn(
  email: string,
  password: string,
): Promise<FirebaseAuthTypes.User> {
  const credential = await auth().signInWithEmailAndPassword(email, password);
  return credential.user;
}

// ─────────────────────────────────────────────────────────────
// LOG OUT
// ─────────────────────────────────────────────────────────────

/**
 * Sign out the current user.
 */
export async function logOut(): Promise<void> {
  await auth().signOut();
}

// ─────────────────────────────────────────────────────────────
// AUTH STATE
// ─────────────────────────────────────────────────────────────

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChanged(
  callback: (user: FirebaseAuthTypes.User | null) => void,
): () => void {
  return auth().onAuthStateChanged(callback);
}

/**
 * Get the currently signed-in user (or null).
 */
export function getCurrentUser(): FirebaseAuthTypes.User | null {
  return auth().currentUser;
}

// ─────────────────────────────────────────────────────────────
// FIRESTORE PROFILE
// ─────────────────────────────────────────────────────────────

/**
 * Fetch user profile from Firestore.
 */
export async function getUserProfile(uid: string): Promise<FirebaseUserProfile | null> {
  const doc = await firestore().collection('users').doc(uid).get();
  if (!doc.exists) return null;
  return { uid, ...doc.data() } as FirebaseUserProfile;
}

/**
 * Subscribe to user profile updates from Firestore.
 */
export function subscribeUserProfile(
  uid: string,
  callback: (profile: FirebaseUserProfile | null) => void
): () => void {
  return firestore()
    .collection('users')
    .doc(uid)
    .onSnapshot(
      doc => {
        if (!doc.exists) callback(null);
        else callback({ uid, ...doc.data() } as FirebaseUserProfile);
      },
      error => {
        console.warn('[Firestore] Profile sync error:', error);
        callback(null);
      }
    );
}

// ─────────────────────────────────────────────────────────────
// FRIENDLY ERROR MESSAGES
// ─────────────────────────────────────────────────────────────

/**
 * Convert Firebase error codes to user-friendly messages.
 */
export function getAuthErrorMessage(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Try logging in.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    default:
      return error?.message || 'Something went wrong. Please try again.';
  }
}
