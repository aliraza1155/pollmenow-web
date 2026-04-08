// src/lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCb8pkKMn7R4InjLSvTmwP1dJAtd-_CBB0", // Replace with your actual key
  authDomain: "pollpoint-88d68.firebaseapp.com",
  projectId: "pollpoint-88d68",
  storageBucket: "pollpoint-88d68.appspot.com",
  messagingSenderId: "339247309948",
  appId: "1:339247309948:web:ba5e63bcab90c8c2d115f9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);