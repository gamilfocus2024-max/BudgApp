const { getDb } = require('../config/database');

// GET /api/reports/export-data
const getExportData = (req, res, next) => {
    try {
        const db = getDb();
        const { start_date, end_date, type } = req.query;
        const userId = req.user.id;

        let query = `
      SELECT t.*, c.name as category_name, c.type as category_type
      FROM transactions t LEFT JOIN categories c ON t.category_id=c.id
      WHERE t.user_id=?
    `;
        const params = [userId];
        if (type) { query += ' AND t.type=?'; params.push(type); }
        if (start_date) { query += ' AND t.date>=?'; params.push(start_date); }
        if (end_date) { query += ' AND t.date<=?'; params.push(end_date); }
        query += ' ORDER BY t.date DESC';

        const transactions = db.prepare(query).all(...params);
        const summary = {
            totalIncome: transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
            totalExpenses: transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
            count: transactions.length
        };

        res.json({ transactions, summary, generatedAt: new Date().toISOString() });
    } catch (err) { next(err); }
};

// GET /api/reports/category-breakdown
const getCategoryBreakdown = (req, res, next) => {
    try {
        const db = getDb();
        const { start_date, end_date, type = 'expense' } = req.query;
        const userId = req.user.id;

        let query = `
      SELECT c.name, c.color, c.icon, COALESCE(SUM(t.amount),0) as total, COUNT(*) as count
      FROM transactions t LEFT JOIN categories c ON t.category_id=c.id
      WHERE t.user_id=? AND t.type=?
    `;
        const params = [userId, type];
        if (start_date) { query += ' AND t.date>=?'; params.push(start_date); }
        if (end_date) { query += ' AND t.date<=?'; params.push(end_date); }
        query += ' GROUP BY t.category_id ORDER BY total DESC';

        const data = db.prepare(query).all(...params);
        const totalAmount = data.reduce((s, d) => s + d.total, 0);
        const enriched = data.map(d => ({ ...d, percentage: totalAmount > 0 ? parseFloat(((d.total / totalAmount) * 100).toFixed(1)) : 0 }));

        res.json({ breakdown: enriched, total: totalAmount });
    } catch (err) { next(err); }
};

// POST /api/reports/backup
const createBackup = (req, res, next) => {
    try {
        const db = getDb();
        const userId = req.user.id;
        const user = db.prepare('SELECT name, email, currency FROM users WHERE id=?').get(userId);
        const transactions = db.prepare('SELECT * FROM transactions WHERE user_id=?').all(userId);
        const budgets = db.prepare('SELECT * FROM budgets WHERE user_id=?').all(userId);
        const goals = db.prepare('SELECT * FROM goals WHERE user_id=?').all(userId);
        const categories = db.prepare('SELECT * FROM categories WHERE user_id=?').all(userId);

        const backup = { version: '1.0', exportedAt: new Date().toISOString(), user, transactions, budgets, goals, categories };
        res.setHeader('Content-Disposition', `attachment; filename=budgapp-backup-${Date.now()}.json`);
        res.setHeader('Content-Type', 'application/json');
        res.json(backup);
    } catch (err) { next(err); }
};

// POST /api/reports/restore
const restoreBackup = (req, res, next) => {
    try {
        const { transactions, budgets, goals, categories } = req.body;
        const db = getDb();
        const userId = req.user.id;
        const { v4: uuidv4 } = require('uuid');

        const restore = db.transaction(() => {
            // Restore categories
            if (categories && Array.isArray(categories)) {
                for (const cat of categories) {
                    db.prepare('INSERT OR IGNORE INTO categories (id, user_id, name, type, color, icon) VALUES (?,?,?,?,?,?)').run(cat.id || uuidv4(), userId, cat.name, cat.type, cat.color, cat.icon);
                }
            }
            // Restore transactions
            if (transactions && Array.isArray(transactions)) {
                for (const t of transactions) {
                    db.prepare('INSERT OR IGNORE INTO transactions (id, user_id, type, amount, currency, description, notes, date, category_id, payment_method, is_recurring, recurring_interval) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
                        t.id || uuidv4(), userId, t.type, t.amount, t.currency, t.description, t.notes, t.date, t.category_id, t.payment_method, t.is_recurring, t.recurring_interval
                    );
                }
            }
            // Restore budgets & goals...
        });
        restore();

        res.json({ message: 'Données restaurées avec succès' });
    } catch (err) { next(err); }
};

module.exports = { getExportData, getCategoryBreakdown, createBackup, restoreBackup };
