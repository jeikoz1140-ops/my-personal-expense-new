
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

import { auth, db } from "./firebase.js";

// Simpan sesi login di browser
export async function setupPersistence() {
  await setPersistence(auth, browserLocalPersistence);
}

// DAFTAR AKUN
export async function registerUser(email, password) {
  try {
    await setupPersistence();

    const result = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    return {
      success: true,
      user: result.user
    };
  } catch (error) {
    return {
      success: false,
      message: getAuthError(error.code)
    };
  }
}

// LOGIN
export async function loginUser(email, password) {
  try {
    await setupPersistence();

    const result = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    return {
      success: true,
      user: result.user
    };
  } catch (error) {
    return {
      success: false,
      message: getAuthError(error.code)
    };
  }
}

// LOGOUT
export async function logoutUser() {
  try {
    await signOut(auth);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: getAuthError(error.code)
    };
  }
}

// LUPA PASSWORD
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email.trim());

    return {
      success: true,
      message: "Email pemulihan password berhasil dikirim. Silakan periksa kotak masuk email."
    };
  } catch (error) {
    return {
      success: false,
      message: getAuthError(error.code)
    };
  }
}

// PANTAU STATUS LOGIN
export function observeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// PESAN ERROR DALAM BAHASA INDONESIA
function getAuthError(code) {
  const errors = {
    "auth/email-already-in-use":
      "Email sudah digunakan. Silakan login.",

    "auth/invalid-email":
      "Format email tidak valid.",

    "auth/weak-password":
      "Password terlalu lemah. Gunakan minimal 6 karakter.",

    "auth/invalid-credential":
      "Email atau password salah.",

    "auth/user-not-found":
      "Akun tidak ditemukan.",

    "auth/wrong-password":
      "Password yang dimasukkan salah.",

    "auth/too-many-requests":
      "Terlalu banyak percobaan. Silakan coba lagi nanti.",

    "auth/network-request-failed":
      "Koneksi internet bermasalah.",

    "auth/missing-password":
      "Password wajib diisi.",

    "auth/missing-email":
      "Email wajib diisi.",

    "auth/operation-not-allowed":
      "Metode login belum diaktifkan di Firebase.",

    "auth/user-disabled":
      "Akun ini telah dinonaktifkan."
  };

  return errors[code] || "Terjadi kesalahan. Silakan coba kembali.";
}
