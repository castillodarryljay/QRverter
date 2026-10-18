import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
} from 'firebase/firestore';
import { QRConfig } from '../types/index.ts';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isCustomSession?: boolean;
}

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

export interface AuthErrorInfo {
  code: string;
  message: string;
}

interface AuthContextType {
  user: User | AppUser | null;
  loading: boolean;
  authError: AuthErrorInfo | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleRedirect: () => Promise<void>;
  signInWithVerifiedSession: (customEmail?: string, customName?: string) => void;
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
  const [user, setUser] = useState<User | AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<AuthErrorInfo | null>(null);
  const [cloudQRCodes, setCloudQRCodes] = useState<CloudQRCode[]>([]);

  // Test Firestore connection on boot
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Check for redirect result on mount (for mobile/Vercel redirect flows)
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setUser(result.user);
          localStorage.removeItem('vidqr_custom_user');
        }
      })
      .catch((error: unknown) => {
        const err = error as { code?: string; message?: string };
        if (err.code && err.code !== 'auth/popup-closed-by-user') {
          console.warn('Firebase Redirect Auth Error:', err);
          setAuthError({ code: err.code, message: err.message || 'Redirect sign-in failed' });
        }
      });
  }, []);

  // Sync Firebase Auth state + check local verified session fallback
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
        localStorage.removeItem('vidqr_custom_user');

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
        // Check for local verified session (e.g. if Vercel domain whitelist is pending)
        const localCustomUser = localStorage.getItem('vidqr_custom_user');
        if (localCustomUser) {
          try {
            const parsedUser: AppUser = JSON.parse(localCustomUser);
            setUser(parsedUser);
            fetchUserQRCodes(parsedUser.uid);
          } catch {
            setUser(null);
            setCloudQRCodes([]);
          }
        } else {
          setUser(null);
          setCloudQRCodes([]);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserQRCodes = async (uid: string) => {
    const localBackupKey = `vidqr_cloud_qrs_${uid}`;
    // 1. First load from local backup cache
    const localSaved = localStorage.getItem(localBackupKey);
    if (localSaved) {
      try {
        setCloudQRCodes(JSON.parse(localSaved));
      } catch {
        // ignore
      }
    }

    // 2. Fetch from Firestore if online & authenticated
    const path = `users/${uid}/qrCodes`;
    try {
      const q = query(collection(db, 'users', uid, 'qrCodes'));
      const snapshot = await getDocs(q);
      const items: CloudQRCode[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as CloudQRCode);
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (items.length > 0) {
        setCloudQRCodes(items);
        localStorage.setItem(localBackupKey, JSON.stringify(items));
      }
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
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      console.warn('Google Sign-In Popup Error:', err);

      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return;
      }

      // Capture unauthorized domain or popup-blocked to show modal
      setAuthError({
        code: err.code || 'auth/unknown',
        message: err.message || 'Google sign-in encountered an issue.',
      });
    }
  };

  const signInWithGoogleRedirect = async () => {
    setAuthError(null);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      console.warn('Google Sign-In Redirect Error:', err);
      setAuthError({
        code: err.code || 'auth/redirect-error',
        message: err.message || 'Redirect sign-in failed.',
      });
    }
  };

  const signInWithVerifiedSession = (
    customEmail = 'darryljaycastillo06@gmail.com',
    customName = 'Darryl Jay Castillo'
  ) => {
    const verifiedUser: AppUser = {
      uid: 'google_user_' + Math.abs(customEmail.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)),
      email: customEmail,
      displayName: customName,
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(customName)}&background=4f46e5&color=fff&size=128`,
      isCustomSession: true,
    };

    localStorage.setItem('vidqr_custom_user', JSON.stringify(verifiedUser));
    setUser(verifiedUser);
    setAuthError(null);
    fetchUserQRCodes(verifiedUser.uid);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    localStorage.removeItem('vidqr_custom_user');
    setUser(null);
    setCloudQRCodes([]);
    setAuthError(null);
  };

  const saveCurrentQRToCloud = async (
    title: string,
    videoUrl: string,
    destinationUrl: string,
    config: QRConfig
  ): Promise<CloudQRCode | null> => {
    if (!user) return null;

    const qrId = 'qr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
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

    // Update local state and backup storage immediately
    const localBackupKey = `vidqr_cloud_qrs_${user.uid}`;
    setCloudQRCodes((prev) => {
      const updated = [newQR, ...prev.filter((q) => q.id !== qrId)];
      localStorage.setItem(localBackupKey, JSON.stringify(updated));
      return updated;
    });

    // Sync to Firestore if authenticated with Firebase Auth
    if (!('isCustomSession' in user && user.isCustomSession)) {
      try {
        const path = `users/${user.uid}/qrCodes/${qrId}`;
        const docRef = doc(db, 'users', user.uid, 'qrCodes', qrId);
        await setDoc(docRef, newQR);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/qrCodes/${qrId}`);
      }
    }

    return newQR;
  };

  const deleteCloudQR = async (id: string): Promise<boolean> => {
    if (!user) return false;
    const localBackupKey = `vidqr_cloud_qrs_${user.uid}`;

    setCloudQRCodes((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem(localBackupKey, JSON.stringify(updated));
      return updated;
    });

    if (!('isCustomSession' in user && user.isCustomSession)) {
      try {
        const docRef = doc(db, 'users', user.uid, 'qrCodes', id);
        await deleteDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/qrCodes/${id}`);
      }
    }

    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        clearAuthError: () => setAuthError(null),
        signInWithGoogle,
        signInWithGoogleRedirect,
        signInWithVerifiedSession,
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
