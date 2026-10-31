import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBZYJjxcuaEIFLkthKBEMXJLBPpb4ToGcE",
  authDomain: "musico---ai.firebaseapp.com",
  projectId: "musico---ai",
  storageBucket: "musico---ai.appspot.com", // fixed bucket domain
  messagingSenderId: "131769402260",
  appId: "1:131769402260:web:9d6d4cb283204afb81c581",
  measurementId: "G-8KDJB1KJHB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Analytics only in browser
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export { db, auth, analytics };
