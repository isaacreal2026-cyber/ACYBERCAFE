import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';

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

const customOnAuthStateChanged: typeof onAuthStateChanged = (authObj: any, callback: any, ...rest: any[]) => {
  if (typeof window !== 'undefined' && (window as any).__MOCK_AUTH__) {
    setTimeout(() => {
      if (typeof callback === 'function') {
        callback({
          email: 'mocked.user@cyberplus.com',
          displayName: 'Mocked User',
          uid: 'mock_uid_123',
        } as any);
      } else if (callback && typeof callback.next === 'function') {
        callback.next({
          email: 'mocked.user@cyberplus.com',
          displayName: 'Mocked User',
          uid: 'mock_uid_123',
        } as any);
      }
    }, 50);
    return () => {};
  }
  return onAuthStateChanged(authObj, callback, ...rest);
};

export { signInWithPopup, firebaseSignOut, customOnAuthStateChanged as onAuthStateChanged };
