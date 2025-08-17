// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsIsSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBpJLe2Advw-KSLNkaXUq3cd1_EoAYIxbA",
  authDomain: "cash-book-183b2.firebaseapp.com",
  projectId: "cash-book-183b2",
  storageBucket: "cash-book-183b2.firebasestorage.app",
  messagingSenderId: "1013267304935",
  appId: "1:1013267304935:web:60f2597743c5f3da26ed42",
  measurementId: "G-WQLD3NZ3P1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Guard analytics for environments where it's not supported
let analytics = null;
if (typeof window !== 'undefined') {
  analyticsIsSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (e) {
        console.warn('Analytics init skipped:', e?.message || e);
      }
    }
  }).catch(() => {
    // ignore
  });
}
const db = getFirestore(app);
const auth = getAuth(app);

export { app, analytics, db, auth };
