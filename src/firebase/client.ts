import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

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

// Initialize Analytics only in browser environment
export const initializeClientAnalytics = () => {
  if (typeof window !== "undefined" && firebaseConfig.measurementId) {
    try {
      return getAnalytics(app);
    } catch (error) {
      console.warn("Failed to initialize Firebase Analytics:", error);
    }
  }
  return null;
};
