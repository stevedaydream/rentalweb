// src/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyAVRqlmXqHpY5zSWjHgYbESTdXPBPSsg8w",
  authDomain: "rental-8897a.firebaseapp.com",
  projectId: "rental-8897a",
  storageBucket: "rental-8897a.firebasestorage.app",
  messagingSenderId: "594733001884",
  appId: "1:594733001884:web:c5f938075873db45fb9159",
  measurementId: "G-NC6MHSWKEW"
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