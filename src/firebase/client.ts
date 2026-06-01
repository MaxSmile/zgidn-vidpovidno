import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyC4rgjGmOmlsSbgivP7XnSqs7JqrJknBHk",
  authDomain: "zgidno-vidpovidno.firebaseapp.com",
  projectId: "zgidno-vidpovidno",
  storageBucket: "zgidno-vidpovidno.firebasestorage.app",
  messagingSenderId: "875769919282",
  appId: "1:875769919282:web:347eb99c8b7c5cbfa5892b",
  measurementId: "G-E6NDQ76HT3"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Analytics only in browser environment, awaiting isSupported()
let analyticsPromise: Promise<Analytics | null> | null = null;

export const initializeClientAnalytics = (): Promise<Analytics | null> => {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(app) : null))
      .catch((error) => {
        console.warn("Failed to initialize Firebase Analytics:", error);
        return null;
      });
  }
  return analyticsPromise;
};
