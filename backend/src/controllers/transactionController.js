const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const { getDb } = require('../config/database');

// GET /api/transactions
const getTransactions = (req, res, next) => {
    try {
        const db = getDb();
        const { type, category_id, start_date, end_date, search, payment_method, page = 1, limit = 50, sort = 'date', order = 'DESC' } = req.query;

        let query = `
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;
        const params = [req.user.id];

        if (type) { query += ' AND t.type = ?'; params.push(type); }
        if (category_id) { query += ' AND t.category_id = ?'; params.push(category_id); }
        if (start_date) { query += ' AND t.date >= ?'; params.push(start_date); }
        if (end_date) { query += ' AND t.date <= ?'; params.push(end_date); }
        if (payment_method) { query += ' AND t.payment_method = ?'; params.push(payment_method); }
        if (search) {
            query += ' AND (t.description LIKE ? OR t.notes LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        const allowedSorts = ['date', 'amount', 'description', 'created_at'];
        const safeSort = allowedSorts.includes(sort) ? sort : 'date';
        const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY t.${safeSort} ${safeOrder}`;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const transactions = db.prepare(query).all(...params);

        // Count total
        let countQuery = 'SELECT COUNT(*) as total FROM transactions t WHERE t.user_id = ?';
        const countParams = [req.user.id];
        if (type) { countQuery += ' AND t.type = ?'; countParams.push(type); }
        if (category_id) { countQuery += ' AND t.category_id = ?'; countParams.push(category_id); }
        if (start_date) { countQuery += ' AND t.date >= ?'; countParams.push(start_date); }
        if (end_date) { countQuery += ' AND t.date <= ?'; countParams.push(end_date); }
        if (search) {
            countQuery += ' AND (t.description LIKE ? OR t.notes LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`);
        }

        const { total } = db.prepare(countQuery).get(...countParams);

        res.json({
            transactions: transactions.map(formatTransaction),
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
        });
    } catch (err) { next(err); }
};

// GET /api/transactions/:id
const getTransaction = (req, res, next) => {
    try {
        const db = getDb();
        const transaction = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ? AND t.user_id = ?
    `).get(req.params.id, req.user.id);

        if (!transaction) return res.status(404).json({ error: 'Transaction non trouvée' });
        res.json({ transaction: formatTransaction(transaction) });
    } catch (err) { next(err); }
};

// POST /api/transactions
const createTransaction = (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });

        const { type, amount, currency, description, notes, date, category_id, payment_method, is_recurring, recurring_interval, tags } = req.body;
        const db = getDb();
        const id = uuidv4();
        const receipt_url = req.file ? `/uploads/${req.file.filename}` : null;

        db.prepare(`
      INSERT INTO transactions (id, user_id, category_id, type, amount, currency, description, notes, date, payment_method, receipt_url, is_recurring, recurring_interval, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, category_id || null, type, parseFloat(amount), currency || req.user.currency, description, notes || null, date, payment_method || 'card', receipt_url, is_recurring ? 1 : 0, recurring_interval || null, tags ? JSON.stringify(tags) : null);

        // Vérification des alertes budgétaires
        if (type === 'expense') checkBudgetAlerts(db, req.user.id, category_id, date);

        const transaction = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.id = ?
    `).get(id);

        res.status(201).json({ message: 'Transaction créée', transaction: formatTransaction(transaction) });
    } catch (err) { next(err); }
};

// PUT /api/transactions/:id
const updateTransaction = (req, res, next) => {
    try {
        const db = getDb();
        const existing = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
        if (!existing) return res.status(404).json({ error: 'Transaction non trouvée' });

        const { type, amount, currency, description, notes, date, category_id, payment_method, is_recurring, recurring_interval, tags } = req.body;
        const receipt_url = req.file ? `/uploads/${req.file.filename}` : existing.receipt_url;

        db.prepare(`
      UPDATE transactions SET type = ?, amount = ?, currency = ?, description = ?, notes = ?, date = ?,
      category_id = ?, payment_method = ?, receipt_url = ?, is_recurring = ?, recurring_interval = ?, tags = ?, updated_at = unixepoch()
      WHERE id = ? AND user_id = ?
    `).run(
            type || existing.type, parseFloat(amount) || existing.amount, currency || existing.currency,
            description || existing.description, notes !== undefined ? notes : existing.notes,
            date || existing.date, category_id || existing.category_id, payment_method || existing.payment_method,
            receipt_url, is_recurring !== undefined ? (is_recurring ? 1 : 0) : existing.is_recurring,
            recurring_interval !== undefined ? recurring_interval : existing.recurring_interval,
            tags ? JSON.stringify(tags) : existing.tags, req.params.id, req.user.id
        );

        const transaction = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.id = ?
    `).get(req.params.id);

        res.json({ message: 'Transaction mise à jour', transaction: formatTransaction(transaction) });
    } catch (err) { next(err); }
};

// DELETE /api/transactions/:id
const deleteTransaction = (req, res, next) => {
    try {
        const db = getDb();
        const result = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
        if (result.changes === 0) return res.status(404).json({ error: 'Transaction non trouvée' });
        res.json({ message: 'Transaction supprimée' });
    } catch (err) { next(err); }
};

// GET /api/transactions/summary/monthly
const getMonthlySummary = (req, res, next) => {
    try {
        const db = getDb();
        const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        const income = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'income' AND date BETWEEN ? AND ?`).get(req.user.id, startDate, endDate);
        const expense = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND date BETWEEN ? AND ?`).get(req.user.id, startDate, endDate);

        const byCategory = db.prepare(`
      SELECT c.name, c.color, c.icon, t.type, COALESCE(SUM(t.amount), 0) as total, COUNT(*) as count
      FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.date BETWEEN ? AND ?
      GROUP BY t.category_id, t.type ORDER BY total DESC
    `).all(req.user.id, startDate, endDate);

        res.json({
            year: parseInt(year), month: parseInt(month),
            income: income.total, expenses: expense.total,
            balance: income.total - expense.total,
            savingsRate: income.total > 0 ? ((income.total - expense.total) / income.total * 100).toFixed(1) : 0,
            byCategory
        });
    } catch (err) { next(err); }
};

function checkBudgetAlerts(db, userId, categoryId, date) {
    if (!categoryId) return;
    const [year, month] = date.split('-');
    const budget = db.prepare(`SELECT * FROM budgets WHERE user_id = ? AND category_id = ? AND year = ? AND month = ? AND is_active = 1`).get(userId, categoryId, parseInt(year), parseInt(month));

    if (!budget) return;

    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`;
    const spent = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id = ? AND category_id = ? AND type='expense' AND date BETWEEN ? AND ?`).get(userId, categoryId, startDate, endDate);

    const percentage = (spent.total / budget.amount) * 100;
    if (percentage >= budget.alert_threshold) {
        const cat = db.prepare('SELECT name FROM categories WHERE id = ?').get(categoryId);
        db.prepare(`INSERT OR IGNORE INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)`).run(
            uuidv4(), userId, `⚠️ Budget "${cat?.name}" dépassé à ${percentage.toFixed(0)}%`,
            `Vous avez dépensé ${spent.total.toFixed(2)}€ sur un budget de ${budget.amount.toFixed(2)}€.`, 'warning'
        );
    }
}

function formatTransaction(t) {
    return {
        id: t.id, userId: t.user_id, type: t.type, amount: t.amount, currency: t.currency,
        description: t.description, notes: t.notes, date: t.date, paymentMethod: t.payment_method,
        receiptUrl: t.receipt_url, isRecurring: Boolean(t.is_recurring), recurringInterval: t.recurring_interval,
        tags: t.tags ? JSON.parse(t.tags) : [],
        category: t.category_id ? { id: t.category_id, name: t.category_name, color: t.category_color, icon: t.category_icon } : null,
        createdAt: t.created_at, updatedAt: t.updated_at
    };
}

module.exports = { getTransactions, getTransaction, createTransaction, updateTransaction, deleteTransaction, getMonthlySummary };
