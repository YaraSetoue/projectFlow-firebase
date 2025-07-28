import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  deleteUser,
  User as FirebaseUser 
} from '@firebase/auth';
import { doc, setDoc, serverTimestamp, updateDoc, getDoc, onSnapshot } from '@firebase/firestore';
import { auth, db } from '../firebase/config';
import { User, RegisterData, LoginData, AccountProfileData } from '../types';
import { uploadAvatar } from '../services/firestoreService';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  registerWithEmailAndPassword: (data: RegisterData) => Promise<void>;
  loginWithEmailAndPassword: (data: LoginData) => Promise<void>;
  logout: () => Promise<void>;
  updateAccountProfile: (data: AccountProfileData) => Promise<void>;
  uploadAndUpdateAvatar: (file: File, onProgress: (p: number) => void) => Promise<void>;
  sendPasswordReset: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeFromUserDoc: (() => void) | undefined;

    const unsubscribeFromAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      // Unsubscribe from any previous user document listener
      if (unsubscribeFromUserDoc) {
        unsubscribeFromUserDoc();
      }

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Set up a new real-time listener for the user document
        unsubscribeFromUserDoc = onSnapshot(userRef, 
            (docSnap) => {
                if (docSnap.exists()) {
                    setCurrentUser(docSnap.data() as User);
                } else {
                    // User is authenticated but no doc found.
                    // This could happen if creation is slow or failed.
                    // We can create a temporary user object from auth data.
                    const { uid, displayName, email, photoURL } = firebaseUser;
                    setCurrentUser({ uid, displayName, email, photoURL, activeTimer: null });
                    console.warn(`User document for ${uid} not found. Using auth data as fallback.`);
                }
                // Set loading to false after the first data is fetched.
                if (loading) setLoading(false);
            },
            (error) => {
                console.error("Error listening to user document:", error);
                // Fallback to auth data if Firestore listener fails
                const { uid, displayName, email, photoURL } = firebaseUser;
                setCurrentUser({ uid, displayName, email, photoURL, activeTimer: null });
                if (loading) setLoading(false);
            }
        );
      } else {
        // User is logged out.
        setCurrentUser(null);
        if (loading) setLoading(false);
      }
    });

    // Cleanup function for the component unmount
    return () => {
        unsubscribeFromAuth();
        if (unsubscribeFromUserDoc) {
            unsubscribeFromUserDoc();
        }
    };
  }, []); // The empty dependency array ensures this runs only once.


  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, 'users', user.uid);
      // Use getDoc to check existence before setting.
      const docSnap = await getDoc(userDocRef);
      if (!docSnap.exists()) {
          await setDoc(userDocRef, {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              createdAt: serverTimestamp(),
          });
      }
      // The onAuthStateChanged listener will handle setting the user state.
    } catch (error: any) {
      console.error("Error during Google sign-in:", error);
      if (error.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        const errorMessage = `Login falhou: O domínio desta aplicação (${domain}) não está autorizado para autenticação. Para corrigir, adicione o domínio à lista de 'Domínios autorizados' nas configurações de autenticação do seu projeto Firebase.`;
        console.error(errorMessage);
        alert(errorMessage);
      } else {
        alert(`Ocorreu um erro durante o login. Por favor, tente novamente.\n\nErro: ${error.message}`);
      }
      throw error;
    }
  };
  
  const registerWithEmailAndPassword = async ({ displayName, email, password }: RegisterData) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await updateProfile(user, { displayName });
    
    const userDocRef = doc(db, 'users', user.uid);

    const newUserForFirestore = {
        uid: user.uid,
        displayName,
        email,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        activeTimer: null
    };

    await setDoc(userDocRef, newUserForFirestore);
    
    // The onSnapshot listener will now handle setting the state automatically.
    // Manually setting state is no longer strictly necessary but doesn't harm.
    await auth.currentUser?.reload();
  };

  const loginWithEmailAndPassword = async ({ email, password }: LoginData) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign-out:", error);
    }
  };
  
  const updateAccountProfile = async (data: AccountProfileData) => {
    if (!currentUser) throw new Error("Usuário não autenticado");
    await updateProfile(auth.currentUser!, { displayName: data.displayName });
    await updateDoc(doc(db, 'users', currentUser.uid), { displayName: data.displayName });
    // The onSnapshot listener will automatically update the state.
  };

  const uploadAndUpdateAvatar = async (file: File, onProgress: (p: number) => void) => {
    if (!currentUser) throw new Error("Usuário não autenticado");
    const photoURL = await uploadAvatar(currentUser.uid, file, onProgress);
    await updateProfile(auth.currentUser!, { photoURL });
    await updateDoc(doc(db, 'users', currentUser.uid), { photoURL });
     // The onSnapshot listener will automatically update the state.
  };

  const sendPasswordReset = async () => {
    if (!auth.currentUser?.email) throw new Error("E-mail do usuário não disponível");
    await sendPasswordResetEmail(auth, auth.currentUser.email);
  };

  const deleteAccount = async () => {
    if (!auth.currentUser) throw new Error("Usuário não autenticado");
    // This requires recent login, which will be handled by Firebase errors.
    await deleteUser(auth.currentUser);
  };


  const value = {
    currentUser,
    loading,
    loginWithGoogle,
    registerWithEmailAndPassword,
    loginWithEmailAndPassword,
    logout,
    updateAccountProfile,
    uploadAndUpdateAvatar,
    sendPasswordReset,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};