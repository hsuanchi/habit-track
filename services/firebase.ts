import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ⚠️ IMPORTANT: Replace the object below with your own Firebase Config from the Firebase Console.
// Go to Project Settings -> General -> Your apps -> SDK setup and configuration -> Config
const firebaseConfig = {
  apiKey: "AIzaSyA8TJUSbLBabNuW5RqAwWWOtxL-pZ4iOSc",
  authDomain: "habit-track-4e1c9.firebaseapp.com",
  projectId: "habit-track-4e1c9",
  storageBucket: "habit-track-4e1c9.firebasestorage.app",
  messagingSenderId: "361569656644",
  appId: "1:361569656644:web:53318c27d47b0df5b50111",
  measurementId: "G-7Q04BPF2TN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);