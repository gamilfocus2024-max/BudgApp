const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/database');

// GET /api/budgets
const getBudgets = (req, res, next) => {
    try {
        const db = getDb();
        const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

        const budgets = db.prepare(`
      SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM budgets b LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ? AND b.year = ? AND b.month = ? AND b.is_active = 1
      ORDER BY c.name
    `).all(req.user.id, parseInt(year), parseInt(month));

        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        const enriched = budgets.map(b => {
            const spent = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM transactions
        WHERE user_id = ? AND category_id = ? AND type = 'expense' AND date BETWEEN ? AND ?
      `).get(req.user.id, b.category_id, startDate, endDate);

            const spentAmount = spent.total;
            const percentage = b.amount > 0 ? (spentAmount / b.amount) * 100 : 0;

            return {
                id: b.id, name: b.name, amount: b.amount, period: b.period,
                month: b.month, year: b.year, alertThreshold: b.alert_threshold,
                category: b.category_id ? { id: b.category_id, name: b.category_name, color: b.category_color, icon: b.category_icon } : null,
                spent: spentAmount, remaining: Math.max(0, b.amount - spentAmount),
                percentage: Math.min(100, parseFloat(percentage.toFixed(1))),
                isExceeded: percentage > 100, isWarning: percentage >= b.alert_threshold,
                createdAt: b.created_at
            };
        });

        res.json({ budgets: enriched });
    } catch (err) { next(err); }
};

// POST /api/budgets
const createBudget = (req, res, next) => {
    try {
        const { name, amount, category_id, period, month, year, alert_threshold } = req.body;
        const db = getDb();

        if (!name || !amount || !category_id) {
            return res.status(400).json({ error: 'Nom, montant et catégorie sont requis' });
        }

        const currentDate = new Date();
        const id = uuidv4();
        db.prepare(`
      INSERT INTO budgets (id, user_id, category_id, name, amount, period, month, year, alert_threshold)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, category_id, name, parseFloat(amount),
            period || 'monthly', month || currentDate.getMonth() + 1, year || currentDate.getFullYear(),
            alert_threshold || 80);

        const budget = db.prepare(`
      SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM budgets b LEFT JOIN categories c ON b.category_id = c.id WHERE b.id = ?
    `).get(id);

        res.status(201).json({ message: 'Budget créé', budget });
    } catch (err) { next(err); }
};

// PUT /api/budgets/:id
const updateBudget = (req, res, next) => {
    try {
        const db = getDb();
        const existing = db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
        if (!existing) return res.status(404).json({ error: 'Budget non trouvé' });

        const { name, amount, alert_threshold } = req.body;
        db.prepare(`UPDATE budgets SET name = ?, amount = ?, alert_threshold = ?, updated_at = unixepoch() WHERE id = ?`)
            .run(name || existing.name, parseFloat(amount) || existing.amount, alert_threshold || existing.alert_threshold, req.params.id);

        res.json({ message: 'Budget mis à jour' });
    } catch (err) { next(err); }
};

// DELETE /api/budgets/:id
const deleteBudget = (req, res, next) => {
    try {
        const db = getDb();
        const result = db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
        if (result.changes === 0) return res.status(404).json({ error: 'Budget non trouvé' });
        res.json({ message: 'Budget supprimé' });
    } catch (err) { next(err); }
};

module.exports = { getBudgets, createBudget, updateBudget, deleteBudget };
