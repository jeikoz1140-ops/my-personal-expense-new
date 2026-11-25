
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAXXS8tfoUYzflw_p4iWDmqJpYd1cB9Nk4",
  authDomain: "my-personal-expense-42d0c.firebaseapp.com",
  projectId: "my-personal-expense-42d0c",
  storageBucket: "my-personal-expense-42d0c.firebasestorage.app",
  messagingSenderId: "638402802872",
  appId: "1:638402802872:web:4d9f89e2ed1394dd01704d",
  measurementId: "G-8JEQ5B3RPQ"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Authentication
const auth = getAuth(app);

// Database
const db = getFirestore(app);

// Ekspor agar bisa digunakan file lain
export { app, auth, db };
