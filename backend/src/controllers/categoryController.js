const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/database');

// GET /api/categories
const getCategories = (req, res, next) => {
    try {
        const db = getDb();
        const { type } = req.query;
        let query = 'SELECT * FROM categories WHERE (user_id = ? OR is_default = 1)';
        const params = [req.user.id];
        if (type) { query += ' AND type = ?'; params.push(type); }
        query += ' ORDER BY is_default DESC, name ASC';
        const categories = db.prepare(query).all(...params);
        res.json({ categories });
    } catch (err) { next(err); }
};

// POST /api/categories
const createCategory = (req, res, next) => {
    try {
        const { name, type, color, icon } = req.body;
        if (!name || !type) return res.status(400).json({ error: 'Nom et type requis' });

        const db = getDb();
        const id = uuidv4();
        db.prepare('INSERT INTO categories (id, user_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?, ?)')
            .run(id, req.user.id, name, type, color || '#6366f1', icon || 'tag');

        const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
        res.status(201).json({ message: 'Catégorie créée', category });
    } catch (err) { next(err); }
};

// PUT /api/categories/:id
const updateCategory = (req, res, next) => {
    try {
        const db = getDb();
        const existing = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
        if (!existing) return res.status(404).json({ error: 'Catégorie non trouvée ou non modifiable' });

        const { name, color, icon } = req.body;
        db.prepare('UPDATE categories SET name=?, color=?, icon=? WHERE id=?')
            .run(name || existing.name, color || existing.color, icon || existing.icon, req.params.id);

        res.json({ message: 'Catégorie mise à jour' });
    } catch (err) { next(err); }
};

// DELETE /api/categories/:id
const deleteCategory = (req, res, next) => {
    try {
        const db = getDb();
        const existing = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
        if (!existing) return res.status(404).json({ error: 'Catégorie non trouvée ou non supprimable' });
        if (existing.is_default) return res.status(403).json({ error: 'Impossible de supprimer une catégorie par défaut' });

        db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
        res.json({ message: 'Catégorie supprimée' });
    } catch (err) { next(err); }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
