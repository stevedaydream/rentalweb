// src/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // [新增] 引入 Storage

// 請替換為您的 Firebase 專案設定
const firebaseConfig = {
  apiKey: "AIzaSyAyxbZQWGHISHK-gumMQuHnzhOTQoS5hgA",
  authDomain: "device-streaming-e921c475.firebaseapp.com",
  projectId: "device-streaming-e921c475",
  storageBucket: "device-streaming-e921c475.firebasestorage.app",
  messagingSenderId: "303515436841",
  appId: "1:303515436841:web:72e3288e9e463ecfa5d938",
  measurementId: "G-TG69P8TGHF"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // [新增] 初始化 Storage

export { auth, db, storage }; // [修改] 匯出 storage