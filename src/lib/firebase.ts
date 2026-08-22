import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged as firebaseOnAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  projectId: "thin-script-nwh20",
  appId: "1:823460019689:web:2a86167a24a40ccf645f78",
  apiKey: "AIzaSyA21gt4v-p7aZOTDPsslMMzme3HrcQ6Szk",
  authDomain: "thin-script-nwh20.firebaseapp.com",
  storageBucket: "thin-script-nwh20.firebasestorage.app",
  messagingSenderId: "823460019689"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, firebaseSignOut };

export const onAuthStateChanged = (authObj: any, callback: (user: any) => void) => {
  if (typeof window !== 'undefined' && (window as any).__MOCK_AUTH__) {
    callback({ email: 'mocked.user@cyberplus.com', displayName: 'Mock User' });
    return () => {};
  }
  return firebaseOnAuthStateChanged(authObj, callback);
};
