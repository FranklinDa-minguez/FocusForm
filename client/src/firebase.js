import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDrZSaSVIfR3o0L_J1756FV0fM50IfKL_8",
  authDomain: "focusform-app.firebaseapp.com",
  projectId: "focusform-app",
  storageBucket: "focusform-app.firebasestorage.app",
  messagingSenderId: "1094353947294",
  appId: "1:1094353947294:web:be6fcb56d6074e4d75898f"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);