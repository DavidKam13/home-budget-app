// استيراد مكتبات Firebase السحابية
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
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
// 🟢 ضع كود firebaseConfig الخاص بك هنا بين القوسين 🟢
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

// تهيئة خدمات Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// المتغيرات العامة
let currentUser = null;
let currentMonth = new Date().toISOString().slice(0, 7);
let categoryChartInstance = null;
let comparisonChartInstance = null;
let isSignUpMode = false;

// عناصر DOM
const authSection = document.getElementById('authSection');
const appSection = document.getElementById('appSection');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authBtn = document.getElementById('authBtn');
const toggleAuthBtn = document.getElementById('toggleAuthBtn');
const toggleAuthText = document.getElementById('toggleAuthText');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const logoutBtn = document.getElementById('logoutBtn');

const monthPicker = document.getElementById('monthPicker');
const totalIncomeText = document.getElementById('totalIncomeText');
const totalExpenseText = document.getElementById('totalExpenseText');
const remainingText = document.getElementById('remainingText');
const transactionForm = document.getElementById('transactionForm');
const transactionsTableBody = document.getElementById('transactionsTableBody');
const monthlyIncomeInput = document.getElementById('monthlyIncomeInput');
const saveIncomeBtn = document.getElementById('saveIncomeBtn');

// 1. مراقبة حالة تسجيل الدخول تلقائياً
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        userEmailDisplay.textContent = user.email;
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

// 2. التبديل بين الدخول وإنشاء حساب جديد
toggleAuthBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    if (isSignUpMode) {
        authTitle.textContent = "إنشاء حساب جديد";
        authBtn.textContent = "تسجيل الحساب";
        toggleAuthText.textContent = "لديك حساب بالفعل؟";
        toggleAuthBtn.textContent = "تسجيل الدخول";
    } else {
        authTitle.textContent = "تسجيل الدخول";
        authBtn.textContent = "دخول";
        toggleAuthText.textContent = "ليس لديك حساب؟";
        toggleAuthBtn.textContent = "إنشاء حساب جديد";
    }
});

// التعامل مع نموذج التسجيل والطلب
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;

    try {
        if (isSignUpMode) {
            await createUserWithEmailAndPassword(auth, email, password);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        alert("خطأ في عملية الدخول: " + error.message);
    }
});

// تسجيل الخروج
logoutBtn.addEventListener('click', () => signOut(auth));

// تغيير الشهر المحدد
monthPicker.addEventListener('change', (e) => {
    currentMonth = e.target.value;
    listenToMonthData();
});

// 3. المزامنة اللحظية مع قاعدة بيانات Firestore
function listenToMonthData() {
    if (!currentUser) return;

    const docRef = doc(db, "users", currentUser.uid, "months", currentMonth);

    onSnapshot(docRef, (docSnap) => {
        let data = { income: 0, transactions: [] };
        if (docSnap.exists()) {
            data = docSnap.data();
        }
        updateUI(data);
    });
}

// 4. إضافة مصروف جديد
transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const desc = document.getElementById('descInput').value;
    const amount = parseFloat(document.getElementById('amountInput').value);
    const category = document.getElementById('categoryInput').value;

    const docRef = doc(db, "users", currentUser.uid, "months", currentMonth);
    const docSnap = await getDoc(docRef);

    let currentData = docSnap.exists() ? docSnap.data() : { income: 0, transactions: [] };

    const newTransaction = {
        id: Date.now(),
        date: new Date().toLocaleDateString('ar-EG'),
        desc: desc,
        amount: amount,
        category: category
    };

    currentData.transactions.push(newTransaction);
    await setDoc(docRef, currentData);

    transactionForm.reset();
});

// 5. حفظ وتحديث الدخل الشهري
saveIncomeBtn.addEventListener('click', async () => {
    const newIncome = parseFloat(monthlyIncomeInput.value) || 0;
    const docRef = doc(db, "users", currentUser.uid, "months", currentMonth);
    const docSnap = await getDoc(docRef);

    let currentData = docSnap.exists() ? docSnap.data() : { income: 0, transactions: [] };
    currentData.income = newIncome;

    await setDoc(docRef, currentData);
    monthlyIncomeInput.value = '';
});

// 6. حذف مصروف
window.deleteTransaction = async function(id) {
    const docRef = doc(db, "users", currentUser.uid, "months", currentMonth);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        let currentData = docSnap.data();
        currentData.transactions = currentData.transactions.filter(t => t.id !== id);
        await setDoc(docRef, currentData);
    }
};

// 7. تحديث واجهة المستخدم والرسوم البيانية
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
    transactionsTableBody.innerHTML = '';
    if (transactions.length === 0) {
        transactionsTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">لا توجد مصاريف مسجلة لهذا الشهر.</td></tr>`;
        return;
    }
    transactions.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${t.date}</td>
            <td>${t.desc}</td>
            <td><span class="badge bg-secondary">${t.category}</span></td>
            <td class="fw-bold text-danger">-${t.amount.toLocaleString()} ج.م</td>
            <td><button onclick="deleteTransaction(${t.id})" class="btn btn-outline-danger btn-sm">✕</button></td>
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
            datasets: [{ data: Object.values(categoryTotals), backgroundColor: ['#4318ff', '#6ad2ff', '#33d69f', '#ffb547', '#ff5b5b'] }]
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
                { label: 'الدخل', data: [income], backgroundColor: '#05cd99', borderRadius: 8 },
                { label: 'المصاريف', data: [expenses], backgroundColor: '#ee5d50', borderRadius: 8 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}