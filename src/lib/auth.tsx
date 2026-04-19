import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'call_center' | 'operations' | 'executor';
}

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setLoading(true); // Don't let children render until we load appUser
        // Fetch or create app user
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setAppUser(userSnap.data() as AppUser);
          } else {
            // New user defaults to executor/call_center? We should probably let admin create users. 
            // For demo/setup purposes: First user becomes admin, else undefined or a default role.
            const isFirstUser = firebaseUser.email === 'ahmed.mawed@fmplusme.com'; // Using the logged-in email from context
            const role = isFirstUser ? 'admin' : 'call_center'; 
            const newAppUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              role: role as AppUser['role'],
              createdAt: Date.now(),
              updatedAt: Date.now()
            } as AppUser;
            
            await setDoc(userRef, newAppUser);
            setAppUser(newAppUser);
          }
        } catch (e) {
          console.error("Failed to load user profile", e);
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, appUser, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
