import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  testFirestoreConnection,
  handleFirestoreError,
  OperationType,
} from '../firebase.ts';
import {
  doc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { QRConfig } from '../types/index.ts';

export interface CloudQRCode {
  id: string;
  userId: string;
  title: string;
  videoUrl: string;
  destinationUrl: string;
  targetMode: string;
  fgColor: string;
  bgColor: string;
  size: number;
  errorCorrectionLevel: string;
  logoMode: string;
  includeBanner: boolean;
  bannerText: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  cloudQRCodes: CloudQRCode[];
  refreshCloudQRCodes: () => Promise<void>;
  saveCurrentQRToCloud: (
    title: string,
    videoUrl: string,
    destinationUrl: string,
    config: QRConfig
  ) => Promise<CloudQRCode | null>;
  deleteCloudQR: (id: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloudQRCodes, setCloudQRCodes] = useState<CloudQRCode[]>([]);

  // Test Firestore connection on boot
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Sync auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Upsert user profile to Firestore
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          await setDoc(
            userRef,
            {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'VidQR Creator',
              photoURL: currentUser.photoURL || '',
              createdAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
        }

        // Fetch user's saved QR codes
        fetchUserQRCodes(currentUser.uid);
      } else {
        setCloudQRCodes([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserQRCodes = async (uid: string) => {
    const path = `users/${uid}/qrCodes`;
    try {
      const q = query(collection(db, 'users', uid, 'qrCodes'));
      const snapshot = await getDocs(q);
      const items: CloudQRCode[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as CloudQRCode);
      });
      // Sort newest first
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCloudQRCodes(items);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  };

  const refreshCloudQRCodes = async () => {
    if (user) {
      await fetchUserQRCodes(user.uid);
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      // Ignore user closed popup cancellation
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        console.error('Google Sign In Error:', err);
        throw error;
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setCloudQRCodes([]);
  };

  const saveCurrentQRToCloud = async (
    title: string,
    videoUrl: string,
    destinationUrl: string,
    config: QRConfig
  ): Promise<CloudQRCode | null> => {
    if (!user) return null;

    const qrId = 'qr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    const path = `users/${user.uid}/qrCodes/${qrId}`;

    const newQR: CloudQRCode = {
      id: qrId,
      userId: user.uid,
      title: title || 'Untitled Video QR',
      videoUrl,
      destinationUrl,
      targetMode: config.targetMode,
      fgColor: config.fgColor,
      bgColor: config.bgColor,
      size: config.size,
      errorCorrectionLevel: config.errorCorrectionLevel,
      logoMode: config.logoMode,
      includeBanner: config.includeBanner,
      bannerText: config.bannerText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const docRef = doc(db, 'users', user.uid, 'qrCodes', qrId);
      await setDoc(docRef, newQR);
      setCloudQRCodes((prev) => [newQR, ...prev]);
      return newQR;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
      return null;
    }
  };

  const deleteCloudQR = async (id: string): Promise<boolean> => {
    if (!user) return false;
    const path = `users/${user.uid}/qrCodes/${id}`;
    try {
      const docRef = doc(db, 'users', user.uid, 'qrCodes', id);
      await deleteDoc(docRef);
      setCloudQRCodes((prev) => prev.filter((item) => item.id !== id));
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        logout,
        cloudQRCodes,
        refreshCloudQRCodes,
        saveCurrentQRToCloud,
        deleteCloudQR,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
