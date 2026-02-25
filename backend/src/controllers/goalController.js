const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/database');

// GET /api/goals
const getGoals = (req, res, next) => {
    try {
        const db = getDb();
        const goals = db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
        res.json({ goals: goals.map(formatGoal) });
    } catch (err) { next(err); }
};

// POST /api/goals
const createGoal = (req, res, next) => {
    try {
        const { name, description, target_amount, current_amount, currency, target_date, color, icon } = req.body;
        if (!name || !target_amount) return res.status(400).json({ error: 'Nom et montant cible requis' });

        const db = getDb();
        const id = uuidv4();
        db.prepare(`
      INSERT INTO goals (id, user_id, name, description, target_amount, current_amount, currency, target_date, color, icon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, name, description || null, parseFloat(target_amount),
            parseFloat(current_amount) || 0, currency || req.user.currency,
            target_date || null, color || '#6366f1', icon || 'target');

        const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
        res.status(201).json({ message: 'Objectif créé', goal: formatGoal(goal) });
    } catch (err) { next(err); }
};

// PUT /api/goals/:id
const updateGoal = (req, res, next) => {
    try {
        const db = getDb();
        const existing = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
        if (!existing) return res.status(404).json({ error: 'Objectif non trouvé' });

        const { name, description, target_amount, current_amount, currency, target_date, color, icon, status } = req.body;

        const newCurrent = parseFloat(current_amount) !== undefined ? parseFloat(current_amount) : existing.current_amount;
        const newTarget = parseFloat(target_amount) || existing.target_amount;
        const newStatus = newCurrent >= newTarget ? 'completed' : (status || existing.status);

        db.prepare(`
      UPDATE goals SET name=?, description=?, target_amount=?, current_amount=?, currency=?, target_date=?, color=?, icon=?, status=?, updated_at=unixepoch()
      WHERE id=? AND user_id=?
    `).run(name || existing.name, description !== undefined ? description : existing.description,
            newTarget, newCurrent, currency || existing.currency, target_date !== undefined ? target_date : existing.target_date,
            color || existing.color, icon || existing.icon, newStatus, req.params.id, req.user.id);

        const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
        res.json({ message: 'Objectif mis à jour', goal: formatGoal(goal) });
    } catch (err) { next(err); }
};

// DELETE /api/goals/:id
const deleteGoal = (req, res, next) => {
    try {
        const db = getDb();
        const result = db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
        if (result.changes === 0) return res.status(404).json({ error: 'Objectif non trouvé' });
        res.json({ message: 'Objectif supprimé' });
    } catch (err) { next(err); }
};

// PATCH /api/goals/:id/deposit
const addDeposit = (req, res, next) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Montant invalide' });

        const db = getDb();
        const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
        if (!goal) return res.status(404).json({ error: 'Objectif non trouvé' });

        const newAmount = Math.min(goal.current_amount + parseFloat(amount), goal.target_amount);
        const newStatus = newAmount >= goal.target_amount ? 'completed' : goal.status;

        db.prepare('UPDATE goals SET current_amount=?, status=?, updated_at=unixepoch() WHERE id=?').run(newAmount, newStatus, req.params.id);

        if (newStatus === 'completed') {
            const { v4 } = require('uuid');
            db.prepare(`INSERT INTO notifications (id, user_id, title, message, type) VALUES (?,?,?,?,?)`).run(
                v4(), req.user.id, `🎉 Objectif "${goal.name}" atteint !`, `Félicitations ! Vous avez atteint votre objectif de ${goal.target_amount}€.`, 'success'
            );
        }

        res.json({ message: 'Dépôt effectué', newAmount, status: newStatus });
    } catch (err) { next(err); }
};

function formatGoal(g) {
    const progress = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
    return {
        id: g.id, userId: g.user_id, name: g.name, description: g.description,
        targetAmount: g.target_amount, currentAmount: g.current_amount, currency: g.currency,
        targetDate: g.target_date, color: g.color, icon: g.icon, status: g.status,
        progress: parseFloat(Math.min(100, progress).toFixed(1)),
        remaining: Math.max(0, g.target_amount - g.current_amount),
        createdAt: g.created_at, updatedAt: g.updated_at
    };
}

module.exports = { getGoals, createGoal, updateGoal, deleteGoal, addDeposit };
