import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup, 
    updateProfile,
    sendPasswordResetEmail,
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// =========================================================
// 🟢 ضع كود firebaseConfig الخاص بك هنا 🟢
// =========================================================
const firebaseConfig = {
     apiKey: "AIzaSyDZ6EhqJ7GgrSAoWaeUB_Z-4LhsQ785Mo4",
    authDomain: "home-budget-app-71cf0.firebaseapp.com",
    projectId: "home-budget-app-71cf0",
    storageBucket: "home-budget-app-71cf0.firebasestorage.app",
    messagingSenderId: "336503031798",
    appId: "1:336503031798:web:8454b0ab99ea44a65de9d7"
};
// =========================================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

let currentUser = null;
let currentMonth = new Date().toISOString().slice(0, 7);
let categoryChartInstance = null;
let comparisonChartInstance = null;
let isSignUpMode = true;
let activeTransactions = [];

// DOM Elements
const authSection = document.getElementById('authSection');
const appSection = document.getElementById('appSection');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authBtn = document.getElementById('authBtn');
const toggleAuthBtn = document.getElementById('toggleAuthBtn');
const toggleAuthText = document.getElementById('toggleAuthText');
const nameFieldGroup = document.getElementById('nameFieldGroup');
const googleAuthBtn = document.getElementById('googleAuthBtn');
const userNameDisplay = document.getElementById('userNameDisplay');
const logoutBtn = document.getElementById('logoutBtn');

const monthPicker = document.getElementById('monthPicker');
const totalIncomeText = document.getElementById('totalIncomeText');
const totalExpenseText = document.getElementById('totalExpenseText');
const remainingText = document.getElementById('remainingText');
const transactionForm = document.getElementById('transactionForm');
const transactionsTableBody = document.getElementById('transactionsTableBody');
const monthlyIncomeInput = document.getElementById('monthlyIncomeInput');
const saveIncomeBtn = document.getElementById('saveIncomeBtn');

const searchInput = document.getElementById('searchInput');
const filterCategory = document.getElementById('filterCategory');

// --- دالة أمنية لتطهير النصوص ومنع هجمات XSS ---
function sanitizeHTML(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// --- 1. إدارة الوضع الداكن (Dark Mode) ---
function initTheme() {
    const savedTheme = localStorage.getItem('appTheme') || 'light';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    updateThemeIcons(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-bs-theme', newTheme);
    localStorage.setItem('appTheme', newTheme);
    updateThemeIcons(newTheme);
}

function updateThemeIcons(theme) {
    const iconClass = theme === 'dark' ? 'fa-sun' : 'fa-moon';
    const authIcon = document.getElementById('themeToggleAuth');
    const appIcon = document.getElementById('themeToggleApp');
    if (authIcon) authIcon.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    if (appIcon) appIcon.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
}

const themeToggleAuth = document.getElementById('themeToggleAuth');
const themeToggleApp = document.getElementById('themeToggleApp');
if (themeToggleAuth) themeToggleAuth.addEventListener('click', toggleTheme);
if (themeToggleApp) themeToggleApp.addEventListener('click', toggleTheme);
initTheme();

// --- 2. Auth State Observer ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        const displayName = user.displayName || user.email.split('@')[0];
        userNameDisplay.textContent = sanitizeHTML(displayName);

        authSection.classList.add('d-none');
        appSection.classList.remove('d-none');
        monthPicker.value = currentMonth;
        listenToMonthData();
    } else {
        currentUser = null;
        appSection.classList.add('d-none');
        authSection.classList.remove('d-none');
    }
});

// Google Sign-In
googleAuthBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'خطأ', text: 'فشل تسجيل الدخول بواسطة Google' });
    }
});

// Toggle Auth Mode
toggleAuthBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    if (isSignUpMode) {
        authTitle.textContent = "إنشاء حساب جديد";
        authBtn.innerHTML = `<i class="fa-solid fa-user-plus me-1"></i> تسجيل الحساب`;
        toggleAuthText.textContent = "لديك حساب بالفعل؟";
        toggleAuthBtn.textContent = "تسجيل الدخول";
        nameFieldGroup.classList.remove('d-none');
    } else {
        authTitle.textContent = "تسجيل الدخول";
        authBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket me-1"></i> دخول`;
        toggleAuthText.textContent = "ليس لديك حساب؟";
        toggleAuthBtn.textContent = "إنشاء حساب جديد";
        nameFieldGroup.classList.add('d-none');
    }
});

// Auth Form Submit
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value.trim();

    // التحقق من صحة كلمة السر أمنياً
    if (isSignUpMode && password.length < 8) {
        Swal.fire({ icon: 'warning', title: 'كلمة سر ضعيفة', text: 'يجب أن تتكون كلمة السر من 8 خانات على الأقل.' });
        return;
    }

    try {
        if (isSignUpMode) {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            if (name) await updateProfile(userCredential.user, { displayName: name });
            window.location.reload();
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        console.error("Auth Error Code:", error.code, error.message);
        let msg = 'حدث خطأ أثناء العملية.';
        
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            msg = 'البريد الإلكتروني أو كلمة السر غير صحيحة.';
        } else if (error.code === 'auth/email-already-in-use') {
            msg = 'هذا البريد الإلكتروني مسجل بالفعل! حاول تسجيل الدخول بدلاً من إنشاء حساب جديد.';
        } else if (error.code === 'auth/weak-password') {
            msg = 'كلمة السر ضعيفة جداً. يرجى إدخال كلمة سر أقوى.';
        } else if (error.code === 'auth/invalid-email') {
            msg = 'صيغة البريد الإلكتروني غير صحيحة.';
        } else {
            msg = `خطأ: ${error.message}`;
        }
        
        Swal.fire({ icon: 'error', title: 'خطأ في الحساب', text: msg });
    }
});

logoutBtn.addEventListener('click', () => signOut(auth));

monthPicker.addEventListener('change', (e) => {
    currentMonth = e.target.value;
    listenToMonthData();
});

// --- 3. Data Sync ---
function listenToMonthData() {
    if (!currentUser) return;
    const docRef = doc(db, "users", currentUser.uid, "months", currentMonth);
    onSnapshot(docRef, (docSnap) => {
        let data = { income: 0, transactions: [] };
        if (docSnap.exists()) data = docSnap.data();
        activeTransactions = data.transactions || [];
        updateUI(data);
    }, (error) => {
        console.error("Firestore Permission Error:", error);
    });
}

// Add Expense مع التحقق الأمني من المدخلات
transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const descRaw = document.getElementById('descInput').value.trim();
    const amount = parseFloat(document.getElementById('amountInput').value);
    const category = document.getElementById('categoryInput').value;

    // التحقق الأمني للمبلغ والوصف
    if (!amount || amount <= 0) {
        Swal.fire({ icon: 'warning', title: 'مبلغ غير صالح', text: 'يرجى إدخال مبلغ أكبر من الصفر.' });
        return;
    }
    if (!descRaw || descRaw.length > 100) {
        Swal.fire({ icon: 'warning', title: 'وصف غير صالح', text: 'يرجى إدخال وصف لا يتجاوز 100 حرف.' });
        return;
    }

    const desc = sanitizeHTML(descRaw);
    const docRef = doc(db, "users", currentUser.uid, "months", currentMonth);
    const docSnap = await getDoc(docRef);
    let currentData = docSnap.exists() ? docSnap.data() : { income: 0, transactions: [] };

    currentData.transactions.push({
        id: Date.now(),
        date: new Date().toLocaleDateString('ar-EG'),
        desc, amount, category
    });

    await setDoc(docRef, currentData);
    transactionForm.reset();
    Swal.fire({ icon: 'success', title: 'تمت الإضافة', timer: 1200, showConfirmButton: false });
});

// Save Monthly Income مع التحقق الأمني
saveIncomeBtn.addEventListener('click', async () => {
    const newIncome = parseFloat(monthlyIncomeInput.value) || 0;
    if (newIncome < 0) {
        Swal.fire({ icon: 'warning', title: 'قيمة غير صالحة', text: 'لا يمكن إدخال دخل بالسالب.' });
        return;
    }

    const docRef = doc(db, "users", currentUser.uid, "months", currentMonth);
    const docSnap = await getDoc(docRef);
    let currentData = docSnap.exists() ? docSnap.data() : { income: 0, transactions: [] };
    currentData.income = newIncome;
    await setDoc(docRef, currentData);
    monthlyIncomeInput.value = '';
    Swal.fire({ icon: 'success', title: 'تم حفظ الدخل', timer: 1200, showConfirmButton: false });
});

// --- 4. Delete Confirmation Modal (SweetAlert2) ---
window.deleteTransaction = function(id) {
    Swal.fire({
        title: 'هل أنت متأكد؟',
        text: "سوف يتم حذف هذا المصروف بشكل نهائي!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'نعم، احذفه!',
        cancelButtonText: 'إلغاء'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const docRef = doc(db, "users", currentUser.uid, "months", currentMonth);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                let currentData = docSnap.data();
                currentData.transactions = currentData.transactions.filter(t => t.id !== id);
                await setDoc(docRef, currentData);
                Swal.fire({ icon: 'success', title: 'تم الحذف بنجاح', timer: 1000, showConfirmButton: false });
            }
        }
    });
};

// --- 5. Search & Filter Listeners ---
searchInput.addEventListener('input', () => renderTable(activeTransactions));
filterCategory.addEventListener('change', () => renderTable(activeTransactions));

// --- 6. Render UI ---
function updateUI(data) {
    const income = data.income || 0;
    const transactions = data.transactions || [];
    const expenses = transactions.reduce((acc, t) => acc + t.amount, 0);
    const remaining = income - expenses;

    totalIncomeText.textContent = `${income.toLocaleString()} ج.م`;
    totalExpenseText.textContent = `${expenses.toLocaleString()} ج.م`;
    remainingText.textContent = `${remaining.toLocaleString()} ج.م`;

    renderTable(transactions);
    renderCharts(income, expenses, transactions);
}

function renderTable(transactions) {
    const query = searchInput.value.trim().toLowerCase();
    const catFilter = filterCategory.value;

    const filtered = transactions.filter(t => {
        const matchesQuery = t.desc.toLowerCase().includes(query);
        const matchesCat = catFilter === 'ALL' || t.category === catFilter;
        return matchesQuery && matchesCat;
    });

    transactionsTableBody.innerHTML = '';
    if (filtered.length === 0) {
        transactionsTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">لا توجد مصاريف مطابقة.</td></tr>`;
        return;
    }
    filtered.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${sanitizeHTML(t.date)}</td>
            <td class="fw-bold">${sanitizeHTML(t.desc)}</td>
            <td><span class="badge bg-secondary">${sanitizeHTML(t.category)}</span></td>
            <td class="fw-bold text-danger">-${t.amount.toLocaleString()} ج.م</td>
            <td>
                <button onclick="deleteTransaction(${t.id})" class="btn btn-outline-danger btn-sm">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        transactionsTableBody.appendChild(tr);
    });
}

function renderCharts(income, expenses, transactions) {
    const categoryTotals = {};
    transactions.forEach(t => { categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount; });

    const ctx1 = document.getElementById('categoryChart').getContext('2d');
    if (categoryChartInstance) categoryChartInstance.destroy();
    categoryChartInstance = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categoryTotals),
            datasets: [{ data: Object.values(categoryTotals), backgroundColor: ['#4318ff', '#6ad2ff', '#33d69f', '#ffb547', '#ff5b5b', '#a0aec0'] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const ctx2 = document.getElementById('comparisonChart').getContext('2d');
    if (comparisonChartInstance) comparisonChartInstance.destroy();
    comparisonChartInstance = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['الميزانية'],
            datasets: [
                { label: 'الدخل', data: [income], backgroundColor: '#10b981', borderRadius: 8 },
                { label: 'المصاريف', data: [expenses], backgroundColor: '#ef4444', borderRadius: 8 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}
