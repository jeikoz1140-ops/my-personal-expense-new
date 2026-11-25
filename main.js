
import { db } from "./firebase.js";

import {
  registerUser,
  loginUser,
  resetPassword,
  logoutUser,
  observeAuth
} from "./auth.js";

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

// =====================================
// ELEMEN HTML
// =====================================

const authContainer = document.getElementById("authContainer");
const dashboard = document.getElementById("dashboard");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const forgotForm = document.getElementById("forgotForm");

const showRegister = document.getElementById("showRegister");
const showLogin = document.getElementById("showLogin");
const forgotBtn = document.getElementById("forgotBtn");
const backToLogin = document.getElementById("backToLogin");

const message = document.getElementById("message");

const logoutBtn = document.getElementById("logoutBtn");
const userEmail = document.getElementById("userEmail");

const transactionForm = document.getElementById("transactionForm");
const transactionList = document.getElementById("transactionList");

const totalBalance = document.getElementById("totalBalance");
const totalIncome = document.getElementById("totalIncome");
const totalExpense = document.getElementById("totalExpense");

const monthFilter = document.getElementById("monthFilter");
const resetFilterBtn = document.getElementById("resetFilterBtn");

const saveTransactionBtn =
  document.getElementById("saveTransactionBtn");

// =====================================
// STATUS APLIKASI
// =====================================

let currentUser = null;
let transactions = [];
let unsubscribeTransactions = null;
let editingId = null;

// =====================================
// UTILITAS
// =====================================

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function getLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;

  return new Date(now.getTime() - offset)
    .toISOString()
    .split("T")[0];
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showMessage(text, type = "error") {
  message.textContent = text;
  message.className = `message ${type}`;
}

function clearMessage() {
  message.textContent = "";
  message.className = "message hidden";
}

function showForm(form) {
  loginForm.classList.add("hidden");
  registerForm.classList.add("hidden");
  forgotForm.classList.add("hidden");

  form.classList.remove("hidden");
  clearMessage();
}

function setLoading(form, loading, normalText) {
  const button = form.querySelector('button[type="submit"]');

  button.disabled = loading;
  button.textContent = loading
    ? "Mohon tunggu..."
    : normalText;
}

// =====================================
// PINDAH FORM LOGIN / DAFTAR
// =====================================

showRegister.addEventListener("click", () => {
  showForm(registerForm);
});

showLogin.addEventListener("click", () => {
  showForm(loginForm);
});

forgotBtn.addEventListener("click", () => {
  document.getElementById("forgotEmail").value =
    document.getElementById("loginEmail").value.trim();

  showForm(forgotForm);
});

backToLogin.addEventListener("click", () => {
  showForm(loginForm);
});

// =====================================
// PENDAFTARAN AKUN
// =====================================

registerForm.addEventListener("submit", async event => {
  event.preventDefault();
  clearMessage();

  const email =
    document.getElementById("registerEmail").value.trim();

  const password =
    document.getElementById("registerPassword").value;

  const confirmPassword =
    document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    showMessage("Konfirmasi password tidak sama.");
    return;
  }

  setLoading(registerForm, true, "Daftar Akun");

  const result = await registerUser(email, password);

  setLoading(registerForm, false, "Daftar Akun");

  if (result.success) {
    registerForm.reset();

    showForm(loginForm);

    document.getElementById("loginEmail").value = email;

    showMessage(
      "Pendaftaran berhasil! Silakan masuk.",
      "success"
    );
  } else {
    showMessage(result.message);
  }
});

// =====================================
// LOGIN
// =====================================

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  clearMessage();

  const email =
    document.getElementById("loginEmail").value.trim();

  const password =
    document.getElementById("loginPassword").value;

  setLoading(loginForm, true, "Masuk");

  const result = await loginUser(email, password);

  setLoading(loginForm, false, "Masuk");

  if (!result.success) {
    showMessage(result.message);
  }
});

// =====================================
// LUPA PASSWORD
// =====================================

forgotForm.addEventListener("submit", async event => {
  event.preventDefault();
  clearMessage();

  const email =
    document.getElementById("forgotEmail").value.trim();

  setLoading(
    forgotForm,
    true,
    "Kirim Link Pemulihan"
  );

  const result = await resetPassword(email);

  setLoading(
    forgotForm,
    false,
    "Kirim Link Pemulihan"
  );

  if (result.success) {
    showMessage(result.message, "success");
  } else {
    showMessage(result.message);
  }
});

// =====================================
// STATUS LOGIN
// =====================================

observeAuth(user => {
  currentUser = user;

  if (unsubscribeTransactions) {
    unsubscribeTransactions();
    unsubscribeTransactions = null;
  }

  if (user) {
    authContainer.classList.add("hidden");
    dashboard.classList.remove("hidden");

    userEmail.textContent = user.email || "Pengguna";

    transactionForm.reset();
    editingId = null;

    document.getElementById("transactionDate").value =
      getLocalDate();

    saveTransactionBtn.textContent = "Simpan Transaksi";

    startTransactionListener(user.uid);
  } else {
    dashboard.classList.add("hidden");
    authContainer.classList.remove("hidden");

    transactions = [];

    renderTransactions();
    updateSummary();

    transactionForm.reset();
    editingId = null;
  }
});

// =====================================
// LOGOUT
// =====================================

logoutBtn.addEventListener("click", async () => {
  const confirmed = confirm(
    "Apakah kamu yakin ingin keluar dari akun?"
  );

  if (!confirmed) return;

  logoutBtn.disabled = true;
  logoutBtn.textContent = "Keluar...";

  const result = await logoutUser();

  logoutBtn.disabled = false;
  logoutBtn.textContent = "Keluar";

  if (!result.success) {
    alert(result.message);
  }
});

// =====================================
// REFERENSI TRANSAKSI FIRESTORE
// =====================================

function getExpenseCollection(uid) {
  return collection(db, "users", uid, "expenses");
}

// =====================================
// SINKRONISASI REAL-TIME
// =====================================

function startTransactionListener(uid) {
  const expensesRef = getExpenseCollection(uid);

  const transactionQuery = query(
    expensesRef,
    orderBy("date", "desc")
  );

  unsubscribeTransactions = onSnapshot(
    transactionQuery,
    snapshot => {
      transactions = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }));

      updateSummary();
      renderTransactions();
    },
    error => {
      console.error("Firestore error:", error);

      alert(
        "Gagal mengambil data transaksi. Periksa koneksi dan aturan keamanan Firestore."
      );
    }
  );
}

// =====================================
// TAMBAH / EDIT TRANSAKSI
// =====================================

transactionForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentUser) return;

  const type =
    document.getElementById("transactionType").value;

  const amount = Number(
    document.getElementById("transactionAmount").value
  );

  const category =
    document.getElementById("transactionCategory").value;

  const description =
    document.getElementById("transactionDescription")
      .value.trim();

  const date =
    document.getElementById("transactionDate").value;

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    alert("Jumlah transaksi harus berupa angka bulat positif.");
    return;
  }

  if (!date) {
    alert("Tanggal transaksi wajib diisi.");
    return;
  }

  const transactionData = {
    type,
    amount,
    category,
    description,
    date,
    updatedAt: serverTimestamp()
  };

  saveTransactionBtn.disabled = true;
  saveTransactionBtn.textContent = "Menyimpan...";

  try {
    if (editingId) {
      const transactionRef = doc(
        db,
        "users",
        currentUser.uid,
        "expenses",
        editingId
      );

      await updateDoc(transactionRef, transactionData);

      alert("Transaksi berhasil diperbarui.");
    } else {
      await addDoc(
        getExpenseCollection(currentUser.uid),
        {
          ...transactionData,
          createdAt: serverTimestamp()
        }
      );

      alert("Transaksi berhasil disimpan.");
    }

    transactionForm.reset();

    document.getElementById("transactionDate").value =
      getLocalDate();

    editingId = null;
    saveTransactionBtn.textContent = "Simpan Transaksi";

  } catch (error) {
    console.error(error);

    alert(
      "Gagal menyimpan transaksi. Periksa koneksi dan aturan Firestore."
    );
  }

  saveTransactionBtn.disabled = false;
});

// =====================================
// HITUNG SALDO
// =====================================

function updateSummary() {
  let income = 0;
  let expense = 0;

  transactions.forEach(item => {
    const amount = Number(item.amount) || 0;

    if (item.type === "income") {
      income += amount;
    } else if (item.type === "expense") {
      expense += amount;
    }
  });

  totalIncome.textContent = formatRupiah(income);
  totalExpense.textContent = formatRupiah(expense);
  totalBalance.textContent = formatRupiah(income - expense);
}

// =====================================
// TAMPILKAN RIWAYAT TRANSAKSI
// =====================================

function renderTransactions() {
  const selectedMonth = monthFilter.value;

  const filtered = transactions.filter(item => {
    if (!selectedMonth) return true;

    return item.date?.startsWith(selectedMonth);
  });

  if (filtered.length === 0) {
    transactionList.innerHTML = `
      <p class="empty-state">
        Belum ada transaksi pada periode ini.
      </p>
    `;

    return;
  }

  transactionList.innerHTML = filtered.map(item => {
    const isIncome = item.type === "income";

    const label = isIncome
      ? "Pemasukan"
      : "Pengeluaran";

    const sign = isIncome ? "+" : "-";

    return `
      <div class="transaction-item">

        <div class="transaction-info">
          <strong>${escapeHTML(item.description || item.category)}</strong>

          <small>
            ${escapeHTML(item.category)}
            · ${escapeHTML(item.date)}
            · ${label}
          </small>
        </div>

        <div class="transaction-actions">

          <span class="transaction-amount ${
            isIncome ? "income-text" : "expense-text"
          }">
            ${sign}${formatRupiah(Number(item.amount) || 0)}
          </span>

          <button
            type="button"
            class="secondary-button edit-transaction"
            data-id="${escapeHTML(item.id)}"
          >
            Edit
          </button>

          <button
            type="button"
            class="delete-transaction"
            data-id="${escapeHTML(item.id)}"
          >
            Hapus
          </button>

        </div>
      </div>
    `;
  }).join("");
}

// =====================================
// FILTER BULAN
// =====================================

monthFilter.addEventListener("change", renderTransactions);

resetFilterBtn.addEventListener("click", () => {
  monthFilter.value = "";
  renderTransactions();
});

// =====================================
// EDIT DAN HAPUS TRANSAKSI
// =====================================

transactionList.addEventListener("click", async event => {
  const editButton = event.target.closest(".edit-transaction");
  const deleteButton = event.target.closest(".delete-transaction");

  if (!currentUser) return;

  if (editButton) {
    const item = transactions.find(
      transaction => transaction.id === editButton.dataset.id
    );

    if (!item) return;

    editingId = item.id;

    document.getElementById("transactionType").value =
      item.type;

    document.getElementById("transactionAmount").value =
      item.amount;

    document.getElementById("transactionCategory").value =
      item.category;

    document.getElementById("transactionDescription").value =
      item.description || "";

    document.getElementById("transactionDate").value =
      item.date;

    saveTransactionBtn.textContent = "Perbarui Transaksi";

    transactionForm.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    return;
  }

  if (deleteButton) {
    const id = deleteButton.dataset.id;

    const confirmed = confirm(
      "Apakah kamu yakin ingin menghapus transaksi ini?"
    );

    if (!confirmed) return;

    try {
      await deleteDoc(
        doc(db, "users", currentUser.uid, "expenses", id)
      );

      alert("Transaksi berhasil dihapus.");

    } catch (error) {
      console.error(error);
      alert("Gagal menghapus transaksi.");
    }
  }
});

// =====================================
// PENGATURAN AWAL
// =====================================

document.getElementById("transactionDate").value =
  getLocalDate();

console.log("My Personal Expense siap digunakan.");
