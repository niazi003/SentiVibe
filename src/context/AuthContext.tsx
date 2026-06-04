/**
 * AuthContext
 *
 * Global authentication state powered by Firebase.
 * Provides user info, loading state, and auth actions to all screens.
 */

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import {
  signUp as fbSignUp,
  logIn as fbLogIn,
  logOut as fbLogOut,
  onAuthStateChanged,
  getUserProfile,
  subscribeUserProfile,
  getAuthErrorMessage,
  FirebaseUserProfile,
} from '../services/firebaseAuth';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface AuthUser {
  uid: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signUp: async () => {},
  logIn: async () => {},
  logOut: async () => {},
});

// ─────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to Firebase auth state changes (auto-login on app restart)
  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged((firebaseUser: FirebaseAuthTypes.User | null) => {
      // Clean up previous profile listener if it exists
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (firebaseUser) {
        // Subscribe to Firestore profile to get real-time name updates
        profileUnsub = subscribeUserProfile(firebaseUser.uid, (profile) => {
          setUser({
            uid: firebaseUser.uid,
            name: profile?.name || firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
          });
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsub) {
        profileUnsub();
      }
    };
  }, []);

  const signUp = async (name: string, email: string, password: string) => {
    try {
      await fbSignUp(name, email, password);
      // Auth state listener will update the user automatically
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const logIn = async (email: string, password: string) => {
    try {
      await fbLogIn(email, password);
      // Auth state listener will update the user automatically
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const logOut = async () => {
    try {
      await fbLogOut();
      // Auth state listener will set user to null automatically
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, logIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};
