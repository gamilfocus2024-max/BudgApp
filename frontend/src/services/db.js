import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDocs,
    orderBy,
    limit as firestoreLimit,
    startAfter,
    getDoc,
    setDoc
} from 'firebase/firestore';
import { db } from './firebase';

// Helper to convert Firestore snapshots to arrays
const snapshotToArray = (snapshot) => {
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// CATEGORIES
export const getCategories = async (userId) => {
    // We fetch default categories (user_id is null) AND user specific categories
    const qDefault = query(collection(db, 'categories'), where('is_default', '==', true));
    const qUser = query(collection(db, 'categories'), where('user_id', '==', userId));

    const [snapDefault, snapUser] = await Promise.all([getDocs(qDefault), getDocs(qUser)]);

    return [...snapshotToArray(snapDefault), ...snapshotToArray(snapUser)];
};

export const createCategory = async (userId, data) => {
    const docRef = await addDoc(collection(db, 'categories'), {
        ...data,
        user_id: userId,
        is_default: false,
        createdAt: new Date().toISOString()
    });
    return { id: docRef.id, ...data };
};

// TRANSACTIONS
export const getTransactions = async (userId, filters = {}) => {
    let q = query(
        collection(db, 'transactions'),
        where('user_id', '==', userId)
    );

    if (filters.type) {
        q = query(q, where('type', '==', filters.type));
    }
    if (filters.category_id) {
        q = query(q, where('category_id', '==', filters.category_id));
    }
    if (filters.payment_method) {
        q = query(q, where('payment_method', '==', filters.payment_method));
    }

    // Sort and Pagination
    const sortBy = filters.sort || 'date';
    const sortOrder = filters.order === 'ASC' ? 'asc' : 'desc';
    q = query(q, orderBy(sortBy, sortOrder));

    if (filters.limit) {
        q = query(q, firestoreLimit(filters.limit));
    }

    const snapshot = await getDocs(q);
    let results = snapshotToArray(snapshot);

    // Client-side filtering for things Firestore doesn't handle easily without indexes
    if (filters.search) {
        const search = filters.search.toLowerCase();
        results = results.filter(t =>
            t.description?.toLowerCase().includes(search) ||
            t.notes?.toLowerCase().includes(search)
        );
    }

    if (filters.start_date) {
        results = results.filter(t => t.date >= filters.start_date);
    }
    if (filters.end_date) {
        results = results.filter(t => t.date <= filters.end_date);
    }

    return {
        transactions: results,
        pagination: {
            total: results.length,
            page: filters.page || 1,
            pages: 1 // Simplified for now
        }
    };
};

export const createTransaction = async (userId, data) => {
    const docRef = await addDoc(collection(db, 'transactions'), {
        ...data,
        user_id: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
    return { id: docRef.id, ...data };
};

export const updateTransaction = async (id, data) => {
    const docRef = doc(db, 'transactions', id);
    await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
    return { id, ...data };
};

export const deleteTransaction = async (id) => {
    await deleteDoc(doc(db, 'transactions', id));
};

// BUDGETS
export const getBudgets = async (userId, filters = {}) => {
    const q = query(collection(db, 'budgets'), where('user_id', '==', userId));
    const snapshot = await getDocs(q);
    const budgets = snapshotToArray(snapshot);

    if (filters.year && filters.month) {
        const monthStr = `${filters.year}-${String(filters.month).padStart(2, '0')}`;
        const { transactions } = await getTransactions(userId, { limit: 1000 });
        const categories = await getCategories(userId);
        const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

        return budgets.map(b => {
            const spent = transactions
                .filter(t => t.type === 'expense' && t.category_id === b.category_id && t.date.startsWith(monthStr))
                .reduce((s, t) => s + t.amount, 0);

            const percentage = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
            const threshold = b.alert_threshold || 80;

            return {
                ...b,
                spent,
                remaining: Math.max(0, b.amount - spent),
                percentage,
                isWarning: percentage >= threshold,
                isExceeded: spent > b.amount,
                category: catMap[b.category_id],
                alertThreshold: threshold
            };
        });
    }

    return budgets;
};

export const createBudget = async (userId, data) => {
    const docRef = await addDoc(collection(db, 'budgets'), {
        ...data,
        user_id: userId,
        amount: parseFloat(data.amount),
        createdAt: new Date().toISOString()
    });
    return { id: docRef.id, ...data };
};

export const updateBudget = async (id, data) => {
    const docRef = doc(db, 'budgets', id);
    await updateDoc(docRef, {
        ...data,
        amount: parseFloat(data.amount),
        updatedAt: new Date().toISOString()
    });
};

export const deleteBudget = async (id) => {
    await deleteDoc(doc(db, 'budgets', id));
};

// GOALS
export const getGoals = async (userId) => {
    const q = query(collection(db, 'goals'), where('user_id', '==', userId));
    const snapshot = await getDocs(q);
    return snapshotToArray(snapshot).map(g => {
        const targetAmount = parseFloat(g.target_amount) || 0;
        const currentAmount = parseFloat(g.current_amount) || 0;
        const remaining = Math.max(0, targetAmount - currentAmount);
        const progress = targetAmount > 0 ? Math.round((currentAmount / targetAmount) * 100) : 0;

        let status = g.status || 'active';
        if (progress >= 100 && status === 'active') status = 'completed';

        return {
            ...g,
            targetAmount,
            currentAmount,
            remaining,
            progress,
            status,
            targetDate: g.target_date
        };
    });
};

export const createGoal = async (userId, data) => {
    const docRef = await addDoc(collection(db, 'goals'), {
        ...data,
        user_id: userId,
        target_amount: parseFloat(data.target_amount),
        current_amount: parseFloat(data.current_amount || 0),
        status: 'active',
        createdAt: new Date().toISOString()
    });
    return { id: docRef.id, ...data };
};

export const updateGoal = async (id, data) => {
    const docRef = doc(db, 'goals', id);
    await updateDoc(docRef, {
        ...data,
        target_amount: parseFloat(data.target_amount),
        current_amount: parseFloat(data.current_amount),
        updatedAt: new Date().toISOString()
    });
};

export const depositToGoal = async (id, amount) => {
    const docRef = doc(db, 'goals', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error('Objectif non trouvé');

    const data = docSnap.data();
    const newAmount = (parseFloat(data.current_amount) || 0) + parseFloat(amount);
    const target = parseFloat(data.target_amount);

    const updates = {
        current_amount: newAmount,
        updatedAt: new Date().toISOString()
    };

    if (newAmount >= target) {
        updates.status = 'completed';
    }

    await updateDoc(docRef, updates);
    return { status: updates.status || data.status };
};

export const deleteGoal = async (id) => {
    await deleteDoc(doc(db, 'goals', id));
};

// REPORTS & ANALYSIS
export const getYearlyStats = async (userId, year) => {
    const { transactions } = await getTransactions(userId, { limit: 5000 });
    const yearStr = year.toString();
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        income: 0,
        expenses: 0,
        balance: 0
    }));

    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach(t => {
        if (t.date.startsWith(yearStr)) {
            const month = parseInt(t.date.split('-')[1]) - 1;
            if (t.type === 'income') {
                monthlyData[month].income += t.amount;
                monthlyData[month].balance += t.amount;
                totalIncome += t.amount;
            } else {
                monthlyData[month].expenses += t.amount;
                monthlyData[month].balance -= t.amount;
                totalExpenses += t.amount;
            }
        }
    });

    return {
        monthlyData,
        yearTotals: {
            income: totalIncome,
            expenses: totalExpenses,
            balance: totalIncome - totalExpenses
        }
    };
};

export const getCategoryBreakdown = async (userId, filters = {}) => {
    const { transactions } = await getTransactions(userId, { limit: 5000 });
    const categories = await getCategories(userId);
    const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

    const { start_date, end_date, type = 'expense' } = filters;
    const breakdown = {};
    let totalAll = 0;

    transactions.filter(t => {
        const matchesDate = (!start_date || t.date >= start_date) && (!end_date || t.date <= end_date);
        return t.type === type && matchesDate;
    }).forEach(t => {
        const catId = t.category_id || 'other';
        const name = catMap[catId]?.name || 'Autres';
        const color = catMap[catId]?.color || '#6b7280';

        if (!breakdown[catId]) {
            breakdown[catId] = { id: catId, name, color, total: 0, count: 0 };
        }
        breakdown[catId].total += t.amount;
        breakdown[catId].count += 1;
        totalAll += t.amount;
    });

    const result = Object.values(breakdown).map(b => ({
        ...b,
        percentage: totalAll > 0 ? Math.round((b.total / totalAll) * 100) : 0
    })).sort((a, b) => b.total - a.total);

    return { breakdown: result, total: totalAll };
};

// STATS & DASHBOARD
export const getDashboardStats = async (userId) => {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

    const [allTransactions, allBudgets, allGoals, categories] = await Promise.all([
        getTransactions(userId, { limit: 1000 }), // Get enough for stats
        getBudgets(userId),
        getGoals(userId),
        getCategories(userId)
    ]);

    const txs = allTransactions.transactions;
    const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

    // Monthly stats
    const monthlyTxs = txs.filter(t => t.date.startsWith(currentMonth));
    const monthlyIncome = monthlyTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const monthlyExpenses = monthlyTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // Total stats
    const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // Monthly trend (6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = d.toISOString().slice(0, 7);
        const monthTxs = txs.filter(t => t.date.startsWith(monthStr));
        const income = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expenses = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        monthlyTrend.push({
            month: d.getMonth() + 1,
            year: d.getFullYear(),
            income,
            expenses,
            balance: income - expenses
        });
    }

    // Budget alerts
    const budgetAlerts = allBudgets.map(b => {
        const spent = monthlyTxs
            .filter(t => t.type === 'expense' && t.category_id === b.category_id)
            .reduce((s, t) => s + t.amount, 0);
        const percentage = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
        const cat = catMap[b.category_id] || {};
        return {
            ...b,
            spent,
            percentage,
            isExceeded: spent > b.amount,
            category_name: cat.name || 'Inconnu',
            category_color: cat.color || '#ccc'
        };
    }).filter(b => b.percentage > 0).sort((a, b) => b.percentage - a.percentage);

    // Top categories
    const categoryStats = {};
    monthlyTxs.filter(t => t.type === 'expense').forEach(t => {
        const name = catMap[t.category_id]?.name || 'Autre';
        const color = catMap[t.category_id]?.color || '#ccc';
        if (!categoryStats[name]) categoryStats[name] = { name, color, total: 0, count: 0 };
        categoryStats[name].total += t.amount;
        categoryStats[name].count += 1;
    });

    const topCategories = Object.values(categoryStats)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    // Health Score (Simple logic: savings rate + budget status)
    const savingsRate = monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0;
    let healthScore = 50 + (savingsRate / 2); // Base 50 + half savings rate
    if (budgetAlerts.some(b => b.isExceeded)) healthScore -= 10;
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    return {
        total: { balance: totalIncome - totalExpenses },
        monthly: {
            income: monthlyIncome,
            expenses: monthlyExpenses,
            balance: monthlyIncome - monthlyExpenses,
            savingsRate
        },
        monthlyTrend,
        budgetAlerts,
        topCategories,
        healthScore,
        recentTransactions: txs.slice(0, 5).map(t => ({
            ...t,
            category: catMap[t.category_id]
        })),
        goals: allGoals.map(g => ({
            ...g,
            progress: g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0
        }))
    };
};
