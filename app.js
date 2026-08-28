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
// Firebase Config
// =========================================================
const firebaseConfig = {
    apiKey: "AIzaSyDZ6EhqJ7GgrSAoWaeUB_Z-4LhsQ785Mo4",
    authDomain: "home-budget-app-71cf0.firebaseapp.com",
    projectId: "home-budget-app-71cf0",
    storageBucket: "home-budget-app-71cf0.firebasestorage.app",
    messagingSenderId: "336503031798",
    appId: "1:336503031798:web:8454b0ab99ea44a65de9d7"
};

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
const userNameDisplayMain = document.getElementById('userNameDisplayMain');
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

// =========================================================
// Toast Notifications
// =========================================================
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');

    const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };

    toast.className = `custom-toast ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${icons[type]}"></i>
        <span class="fw-semibold">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastIn 0.3s ease reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// =========================================================
// Security
// =========================================================
function sanitizeHTML(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// =========================================================
// Theme
// =========================================================
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
    if (categoryChartInstance || comparisonChartInstance) {
        listenToMonthData();
    }
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

// =========================================================
// Password Toggle
// =========================================================
const togglePasswordBtn = document.getElementById('togglePassword');
if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
        const passwordInput = document.getElementById('authPassword');
        const icon = togglePasswordBtn.querySelector('i');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
}

// =========================================================
// Auth State
// =========================================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        const displayName = user.displayName || user.email.split('@')[0];
        const safeName = sanitizeHTML(displayName);

        userNameDisplay.textContent = safeName;
        userNameDisplayMain.textContent = safeName;

        authSection.classList.add('d-none');
        appSection.classList.remove('d-none');
        appSection.classList.add('d-flex');
        monthPicker.value = currentMonth;

        showToast(`مرحباً بيك، ${safeName}! 👋`, 'success');
        listenToMonthData();
    } else {
        currentUser = null;
        appSection.classList.add('d-none');
        appSection.classList.remove('d-flex');
        authSection.classList.remove('d-none');
    }
});

// Google Sign-In
googleAuthBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        showToast('فشل تسجيل الدخول بواسطة Google', 'error');
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

// Auth Form
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value.trim();

    if (isSignUpMode && password.length < 8) {
        showToast('يجب أن تتكون كلمة السر من 8 خانات على الأقل', 'warning');
        return;
    }

    authBtn.disabled = true;
    authBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> جاري التحميل...`;

    try {
        if (isSignUpMode) {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            if (name) await updateProfile(userCredential.user, { displayName: name });
            showToast('تم إنشاء الحساب بنجاح! 🎉', 'success');
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            showToast('تم تسجيل الدخول بنجاح! ✅', 'success');
        }
    } catch (error) {
        let msg = 'حدث خطأ أثناء العملية.';
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            msg = 'البريد الإلكتروني أو كلمة السر غير صحيحة.';
        } else if (error.code === 'auth/email-already-in-use') {
            msg = 'هذا البريد مسجل بالفعل! حاول تسجيل الدخول.';
        } else if (error.code === 'auth/weak-password') {
            msg = 'كلمة السر ضعيفة. استخدم أحرف وأرقام ورموز.';
        } else if (error.code === 'auth/invalid-email') {
            msg = 'صيغة البريد الإلكتروني غير صحيحة.';
        } else {
            msg = error.message;
        }
        Swal.fire({ icon: 'error', title: 'خطأ في الحساب', text: msg });
    } finally {
        authBtn.disabled = false;
        authBtn.innerHTML = isSignUpMode 
            ? `<i class="fa-solid fa-user-plus me-1"></i> تسجيل الحساب`
            : `<i class="fa-solid fa-right-to-bracket me-1"></i> دخول`;
    }
});

logoutBtn.addEventListener('click', () => {
    Swal.fire({
        title: 'تسجيل الخروج؟',
        text: 'هل أنت متأكد أنك تريد الخروج؟',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'نعم، خروج',
        cancelButtonText: 'إلغاء',
        confirmButtonColor: '#ef4444'
    }).then((result) => {
        if (result.isConfirmed) {
            signOut(auth);
            showToast('تم تسجيل الخروج', 'info');
        }
    });
});

monthPicker.addEventListener('change', (e) => {
    currentMonth = e.target.value;
    listenToMonthData();
    showToast(`تم التبديل إلى ${currentMonth}`, 'info', 1500);
});

// =========================================================
// Forgot Password (REAL Firebase)
// =========================================================
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        const forgotModal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
        forgotModal.show();
    });
}

const forgotPasswordForm = document.getElementById('forgotPasswordForm');
if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value.trim();

        if (!email) {
            showToast('يرجى إدخال البريد الإلكتروني', 'warning');
            return;
        }

        const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> جاري الإرسال...`;

        try {
            await sendPasswordResetEmail(auth, email);
            const modalElement = document.getElementById('forgotPasswordModal');
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            modalInstance.hide();
            showToast('✉️ تم إرسال رابط الاستعادة! افحص بريدك', 'success', 5000);
            document.getElementById('resetEmail').value = '';
        } catch (error) {
            let msg = 'حدث خطأ أثناء الإرسال.';
            if (error.code === 'auth/user-not-found') msg = 'لا يوجد حساب مسجل بهذا البريد.';
            else if (error.code === 'auth/invalid-email') msg = 'صيغة البريد غير صحيحة.';
            showToast(msg, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane me-1"></i> إرسال رابط الاستعادة`;
        }
    });
}

// =========================================================
// Data Sync
// =========================================================
function listenToMonthData() {
    if (!currentUser) return;
    const docRef = doc(db, "users", currentUser.uid, "months", currentMonth);

    totalIncomeText.textContent = '...';
    totalExpenseText.textContent = '...';
    remainingText.textContent = '...';

    onSnapshot(docRef, (docSnap) => {
        let data = { income: 0, transactions: [] };
        if (docSnap.exists()) data = docSnap.data();
        activeTransactions = data.transactions || [];
        updateUI(data);
    }, (error) => {
        console.error("Firestore Error:", error);
        showToast('خطأ في تحميل البيانات', 'error');
    });
}

// =========================================================
// Add Expense
// =========================================================
transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const descRaw = document.getElementById('descInput').value.trim();
    const amount = parseFloat(document.getElementById('amountInput').value);
    const category = document.getElementById('categoryInput').value;

    if (!amount || amount <= 0) {
        showToast('يرجى إدخال مبلغ أكبر من الصفر', 'warning');
        return;
    }
    if (!descRaw || descRaw.length > 100) {
        showToast('يرجى إدخال وصف لا يتجاوز 100 حرف', 'warning');
        return;
    }

    const desc = sanitizeHTML(descRaw);
    const submitBtn = transactionForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> جاري الإضافة...`;

    try {
        const docRef = doc(db, "users", currentUser.uid, "months", currentMonth);
        const docSnap = await getDoc(docRef);
        let currentData = docSnap.exists() ? docSnap.data() : { income: 0, transactions: [] };

        currentData.transactions.push({
            id: crypto.randomUUID(),
            date: new Date().toLocaleDateString('ar-EG'),
            desc, 
            amount, 
            category
        });

        await setDoc(docRef, currentData);
        transactionForm.reset();
        showToast('✅ تمت إضافة المصروف بنجاح', 'success');
    } catch (error) {
        showToast('حدث خطأ أثناء الإضافة', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-plus me-1"></i> إضافة`;
    }
});

// =========================================================
// Save Income
// =========================================================
saveIncomeBtn.addEventListener('click', async () => {
    const newIncome = parseFloat(monthlyIncomeInput.value) || 0;
    if (newIncome < 0) {
        showToast('لا يمكن إدخال دخل بالسالب', 'warning');
        return;
    }

    saveIncomeBtn.disabled = true;
    saveIncomeBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> جاري...`;

    try {
        const docRef = doc(db, "users", currentUser.uid, "months", currentMonth);
        const docSnap = await getDoc(docRef);
        let currentData = docSnap.exists() ? docSnap.data() : { income: 0, transactions: [] };
        currentData.income = newIncome;
        await setDoc(docRef, currentData);
        monthlyIncomeInput.value = '';
        showToast('💰 تم حفظ الدخل الشهري', 'success');
    } catch (error) {
        showToast('حدث خطأ أثناء الحفظ', 'error');
    } finally {
        saveIncomeBtn.disabled = false;
        saveIncomeBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span class="d-none d-sm-inline">حفظ</span>`;
    }
});

// =========================================================
// Delete Transaction
// =========================================================
window.deleteTransaction = function(id) {
    Swal.fire({
        title: 'هل أنت متأكد؟',
        text: "سيتم حذف هذا المصروف نهائياً!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'نعم، احذفه!',
        cancelButtonText: 'إلغاء'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const docRef = doc(db, "users", currentUser.uid, "months", currentMonth);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    let currentData = docSnap.data();
                    currentData.transactions = currentData.transactions.filter(t => t.id !== id);
                    await setDoc(docRef, currentData);
                    showToast('🗑️ تم الحذف بنجاح', 'success');
                }
            } catch (error) {
                showToast('حدث خطأ أثناء الحذف', 'error');
            }
        }
    });
};

// =========================================================
// Search & Filter
// =========================================================
searchInput.addEventListener('input', () => renderTable(activeTransactions));
filterCategory.addEventListener('change', () => renderTable(activeTransactions));

// =========================================================
// Render UI
// =========================================================
function updateUI(data) {
    const income = data.income || 0;
    const transactions = data.transactions || [];
    const expenses = transactions.reduce((acc, t) => acc + t.amount, 0);
    const remaining = income - expenses;

    animateValue(totalIncomeText, income, ' ج.م');
    animateValue(totalExpenseText, expenses, ' ج.م');
    animateValue(remainingText, remaining, ' ج.م');

    renderTable(transactions);
    renderCharts(income, expenses, transactions);
}

function animateValue(element, value, suffix = '') {
    const start = parseFloat(element.textContent.replace(/[^0-9.-]/g, '')) || 0;
    const duration = 400;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const current = start + (value - start) * easeProgress;
        element.textContent = `${current.toLocaleString('ar-EG', {maximumFractionDigits: 2})}${suffix}`;
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// =========================================================
// Render Table
// =========================================================
const categoryIcons = {
    'طعام': '🍽️',
    'تسوق': '🛍️',
    'فواتير': '💡',
    'مواصلات': '🚗',
    'صحة': '🏥',
    'ترفيه': '🎬',
    'تعليم': '📚',
    'أخرى': '📦'
};

function renderTable(transactions) {
    const query = searchInput.value.trim().toLowerCase();
    const catFilter = filterCategory.value;

    const filtered = transactions.filter(t => {
        const matchesQuery = t.desc.toLowerCase().includes(query);
        const matchesCat = catFilter === 'ALL' || t.category === catFilter;
        return matchesQuery && matchesCat;
    });

    const emptyState = document.getElementById('tableEmptyState');

    if (filtered.length === 0) {
        transactionsTableBody.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
    }

    emptyState.classList.add('d-none');
    transactionsTableBody.innerHTML = '';

    filtered.forEach((t, index) => {
        const tr = document.createElement('tr');
        tr.style.animation = `fadeInUp 0.3s ease ${index * 0.04}s both`;
        const icon = categoryIcons[t.category] || '📦';

        tr.innerHTML = `
            <td class="text-muted" style="font-size: 0.85rem;">${sanitizeHTML(t.date)}</td>
            <td class="fw-bold" style="font-size: 0.9rem;">${sanitizeHTML(t.desc)}</td>
            <td><span class="badge" style="background: var(--bg-body); color: var(--text-primary); border: 1px solid var(--border-color); font-size: 0.75rem;">${icon} ${sanitizeHTML(t.category)}</span></td>
            <td class="fw-bold" style="color: var(--danger); font-size: 0.9rem;">-${t.amount.toLocaleString('ar-EG')} ج.م</td>
            <td class="text-center">
                <button onclick="deleteTransaction('${t.id}')" class="btn btn-outline-danger btn-sm" title="حذف" style="padding: 0.25rem 0.5rem;">
                    <i class="fa-solid fa-trash-can" style="font-size: 0.75rem;"></i>
                </button>
            </td>
        `;
        transactionsTableBody.appendChild(tr);
    });
}

// =========================================================
// Render Charts
// =========================================================
function renderCharts(income, expenses, transactions) {
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    const categoryTotals = {};
    transactions.forEach(t => { 
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount; 
    });

    const categoryChartEmpty = document.getElementById('categoryChartEmpty');
    const comparisonChartEmpty = document.getElementById('comparisonChartEmpty');

    // Category Chart
    if (Object.keys(categoryTotals).length === 0) {
        if (categoryChartInstance) { categoryChartInstance.destroy(); categoryChartInstance = null; }
        document.getElementById('categoryChart').style.display = 'none';
        categoryChartEmpty.classList.remove('d-none');
    } else {
        document.getElementById('categoryChart').style.display = 'block';
        categoryChartEmpty.classList.add('d-none');

        const ctx1 = document.getElementById('categoryChart').getContext('2d');
        if (categoryChartInstance) categoryChartInstance.destroy();

        categoryChartInstance = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryTotals),
                datasets: [{ 
                    data: Object.values(categoryTotals), 
                    backgroundColor: ['#4f46e5', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'],
                    borderWidth: 0,
                    hoverOffset: 6
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 12,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            color: textColor,
                            font: { family: 'Cairo', size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        titleColor: isDark ? '#f8fafc' : '#0f172a',
                        bodyColor: isDark ? '#94a3b8' : '#64748b',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function(context) {
                                const val = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = ((val / total) * 100).toFixed(1);
                                return ` ${val.toLocaleString('ar-EG')} ج.م (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Comparison Chart
    if (income === 0 && expenses === 0) {
        if (comparisonChartInstance) { comparisonChartInstance.destroy(); comparisonChartInstance = null; }
        document.getElementById('comparisonChart').style.display = 'none';
        comparisonChartEmpty.classList.remove('d-none');
    } else {
        document.getElementById('comparisonChart').style.display = 'block';
        comparisonChartEmpty.classList.add('d-none');

        const ctx2 = document.getElementById('comparisonChart').getContext('2d');
        if (comparisonChartInstance) comparisonChartInstance.destroy();

        comparisonChartInstance = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ['الشهر الحالي'],
                datasets: [
                    { 
                        label: 'الدخل', 
                        data: [income], 
                        backgroundColor: '#22c55e',
                        borderRadius: 6,
                        barThickness: 36
                    },
                    { 
                        label: 'المصاريف', 
                        data: [expenses], 
                        backgroundColor: '#ef4444',
                        borderRadius: 6,
                        barThickness: 36
                    }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 12,
                            usePointStyle: true,
                            color: textColor,
                            font: { family: 'Cairo', size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        titleColor: isDark ? '#f8fafc' : '#0f172a',
                        bodyColor: isDark ? '#94a3b8' : '#64748b',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.dataset.label}: ${context.raw.toLocaleString('ar-EG')} ج.م`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: gridColor },
                        ticks: { color: textColor, font: { family: 'Cairo', size: 11 } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor, font: { family: 'Cairo', size: 11 } }
                    }
                }
            }
        });
    }
}
