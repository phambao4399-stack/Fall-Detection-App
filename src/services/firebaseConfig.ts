// src/services/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAmFTOmaFx8nxajv0bnZ38dhh29exWnQfc",
  authDomain: "doandidongtest.firebaseapp.com",
  projectId: "doandidongtest",
  storageBucket: "doandidongtest.firebasestorage.app",
  messagingSenderId: "635739886483",
  appId: "1:635739886483:web:77b777f17110866fd68e66"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);