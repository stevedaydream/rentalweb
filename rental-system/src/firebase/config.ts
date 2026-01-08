// src/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // [新增] 引入 Storage

// 請替換為您的 Firebase 專案設定
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
const storage = getStorage(app); // [新增] 初始化 Storage

export { auth, db, storage }; // [修改] 匯出 storage