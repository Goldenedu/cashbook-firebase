// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD-URN2X3tYgApaBBHnr0ZDPoNiHbRPrTs",
  authDomain: "cashbook-32125.firebaseapp.com",
  projectId: "cashbook-32125",
  storageBucket: "cashbook-32125.firebasestorage.app",
  messagingSenderId: "282935265577",
  appId: "1:282935265577:web:2762c8c64236e3b0c28f38",
  measurementId: "G-5MR09FLQB8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
