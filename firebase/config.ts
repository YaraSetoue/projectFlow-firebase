
import { initializeApp } from "@firebase/app";
import { getAuth } from "@firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "@firebase/firestore";

// IMPORTANT: Replace this with your own Firebase project configuration.
// You can find this in your Firebase project settings under "General".
// Go to your project's dashboard: https://console.firebase.google.com/
// Select your project, go to Project Settings (gear icon), and find the config for your web app.
const firebaseConfig = {
  apiKey: "AIzaSyCWs_QpLPvC5EvhaU0tgFxwNILbdUUxUq0",
  authDomain: "project-flow-7b02c.firebaseapp.com",
  projectId: "project-flow-7b02c",
  storageBucket: "project-flow-7b02c.firebasestorage.app",
  messagingSenderId: "179160823405",
  appId: "1:179160823405:web:30add63ca5b9cf9ee13164",
  measurementId: "G-8S6ZYN96BW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable Firestore offline persistence using the v9 modular API.
// This allows the app to work offline by caching data.
// It must be called before any other Firestore operations.
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled
      // in one tab at a time.
      console.warn('Firestore persistence failed: Multiple tabs open. Some features may not work offline.');
    } else if (err.code === 'unimplemented') {
      // The current browser does not support all of the
      // features required to enable persistence.
      console.warn('Firestore persistence not available in this browser. The app will have limited offline capabilities.');
    }
  });


export default app;