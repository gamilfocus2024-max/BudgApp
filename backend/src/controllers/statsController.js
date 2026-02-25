const { getDb } = require('../config/database');

// GET /api/stats/dashboard
const getDashboardStats = (req, res, next) => {
    try {
        const db = getDb();
        const userId = req.user.id;
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        // Revenus et dépenses du mois
        const income = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=? AND type='income' AND date BETWEEN ? AND ?`).get(userId, startDate, endDate);
        const expenses = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=? AND type='expense' AND date BETWEEN ? AND ?`).get(userId, startDate, endDate);

        // Total all time
        const totalIncome = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=? AND type='income'`).get(userId);
        const totalExpenses = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=? AND type='expense'`).get(userId);

        // Transactions récentes
        const recentTransactions = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? ORDER BY t.date DESC, t.created_at DESC LIMIT 10
    `).all(userId);

        // Top catégories de dépenses ce mois
        const topCategories = db.prepare(`
      SELECT c.name, c.color, c.icon, COALESCE(SUM(t.amount),0) as total, COUNT(*) as count
      FROM transactions t LEFT JOIN categories c ON t.category_id=c.id
      WHERE t.user_id=? AND t.type='expense' AND t.date BETWEEN ? AND ?
      GROUP BY t.category_id ORDER BY total DESC LIMIT 5
    `).all(userId, startDate, endDate);

        // Évolution des 6 derniers mois
        const monthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(year, month - 1 - i, 1);
            const m = d.getMonth() + 1;
            const y = d.getFullYear();
            const s = `${y}-${String(m).padStart(2, '0')}-01`;
            const e = `${y}-${String(m).padStart(2, '0')}-31`;
            const inc = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=? AND type='income' AND date BETWEEN ? AND ?`).get(userId, s, e);
            const exp = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=? AND type='expense' AND date BETWEEN ? AND ?`).get(userId, s, e);
            monthlyTrend.push({ month: m, year: y, income: inc.total, expenses: exp.total, balance: inc.total - exp.total });
        }

        // Alertes budgétaires actives
        const budgetAlerts = db.prepare(`
      SELECT b.*, c.name as category_name, c.color as category_color FROM budgets b
      LEFT JOIN categories c ON b.category_id=c.id
      WHERE b.user_id=? AND b.year=? AND b.month=? AND b.is_active=1
    `).all(userId, year, month).map(b => {
            const spent = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=? AND category_id=? AND type='expense' AND date BETWEEN ? AND ?`).get(userId, b.category_id, startDate, endDate);
            const pct = b.amount > 0 ? (spent.total / b.amount) * 100 : 0;
            return { ...b, spent: spent.total, percentage: parseFloat(pct.toFixed(1)), isExceeded: pct > 100, isWarning: pct >= b.alert_threshold };
        }).filter(b => b.isWarning);

        // Objectifs actifs
        const goals = db.prepare(`SELECT * FROM goals WHERE user_id=? AND status='active' ORDER BY created_at DESC LIMIT 3`).all(userId);

        // Indicateur santé financière (score 0-100)
        const monthlyIncome = income.total;
        const monthlyExpenses = expenses.total;
        const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
        const healthScore = Math.max(0, Math.min(100, Math.round(savingsRate * 1.5 + (budgetAlerts.length === 0 ? 25 : 0))));

        res.json({
            monthly: { income: income.total, expenses: expenses.total, balance: income.total - expenses.total, savingsRate: parseFloat(savingsRate.toFixed(1)) },
            total: { income: totalIncome.total, expenses: totalExpenses.total, balance: totalIncome.total - totalExpenses.total },
            healthScore, monthlyTrend, topCategories, budgetAlerts,
            recentTransactions: recentTransactions.map(t => ({
                id: t.id, type: t.type, amount: t.amount, currency: t.currency,
                description: t.description, date: t.date, paymentMethod: t.payment_method,
                category: t.category_id ? { name: t.category_name, color: t.category_color, icon: t.category_icon } : null
            })),
            goals: goals.map(g => ({
                ...g, progress: g.target_amount > 0 ? parseFloat(((g.current_amount / g.target_amount) * 100).toFixed(1)) : 0
            }))
        });
    } catch (err) { next(err); }
};

// GET /api/stats/yearly
const getYearlyStats = (req, res, next) => {
    try {
        const db = getDb();
        const { year = new Date().getFullYear() } = req.query;
        const userId = req.user.id;

        const monthlyData = [];
        for (let m = 1; m <= 12; m++) {
            const s = `${year}-${String(m).padStart(2, '0')}-01`;
            const e = `${year}-${String(m).padStart(2, '0')}-31`;
            const inc = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=? AND type='income' AND date BETWEEN ? AND ?`).get(userId, s, e);
            const exp = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=? AND type='expense' AND date BETWEEN ? AND ?`).get(userId, s, e);
            monthlyData.push({ month: m, income: inc.total, expenses: exp.total, balance: inc.total - exp.total });
        }

        const yearIncome = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=? AND type='income' AND date LIKE ?`).get(userId, `${year}%`);
        const yearExpenses = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=? AND type='expense' AND date LIKE ?`).get(userId, `${year}%`);

        const categoryBreakdown = db.prepare(`
      SELECT c.name, c.color, c.icon, t.type, COALESCE(SUM(t.amount),0) as total
      FROM transactions t LEFT JOIN categories c ON t.category_id=c.id
      WHERE t.user_id=? AND t.date LIKE ? GROUP BY t.category_id, t.type ORDER BY total DESC
    `).all(userId, `${year}%`);

        res.json({ year: parseInt(year), monthlyData, yearTotals: { income: yearIncome.total, expenses: yearExpenses.total, balance: yearIncome.total - yearExpenses.total }, categoryBreakdown });
    } catch (err) { next(err); }
};

// GET /api/stats/notifications
const getNotifications = (req, res, next) => {
    try {
        const db = getDb();
        const notifications = db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 20').all(req.user.id);
        const unread = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id=? AND is_read=0').get(req.user.id);
        res.json({ notifications, unreadCount: unread.count });
    } catch (err) { next(err); }
};

// PATCH /api/stats/notifications/:id/read
const markNotificationRead = (req, res, next) => {
    try {
        const db = getDb();
        db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
        res.json({ message: 'Notification marquée comme lue' });
    } catch (err) { next(err); }
};

// PATCH /api/stats/notifications/read-all
const markAllRead = (req, res, next) => {
    try {
        const db = getDb();
        db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(req.user.id);
        res.json({ message: 'Toutes les notifications marquées comme lues' });
    } catch (err) { next(err); }
};

module.exports = { getDashboardStats, getYearlyStats, getNotifications, markNotificationRead, markAllRead };
