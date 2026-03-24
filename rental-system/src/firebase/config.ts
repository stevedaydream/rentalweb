// src/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyB9dScnoKGiImeaUjsLFdAgEICSbuWxyDQ",
  authDomain: "rental-system-7675e.firebaseapp.com",
  projectId: "rental-system-7675e",
  storageBucket: "rental-system-7675e.firebasestorage.app",
  messagingSenderId: "578769186798",
  appId: "1:578769186798:web:1b7cb582a3f573f1a4e8ff",
  measurementId: "G-YN3V4GQP3N"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, 'asia-east1');

if (import.meta.env.DEV) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
  connectStorageEmulator(storage, 'localhost', 9199);
}

export { auth, db, storage, functions };