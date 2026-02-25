const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './database/budgapp.db';
const dbDir = path.dirname(path.resolve(DB_PATH));

let db;

function getDb() {
    if (!db) {
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        db = new Database(path.resolve(DB_PATH));
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        db.pragma('synchronous = NORMAL');
    }
    return db;
}

function initDatabase() {
    const db = getDb();

    db.exec(`
    -- Table des utilisateurs
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT,
      currency TEXT DEFAULT 'EUR',
      locale TEXT DEFAULT 'fr-FR',
      theme TEXT DEFAULT 'light',
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      reset_token TEXT,
      reset_token_expires INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    -- Table des catégories
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      color TEXT DEFAULT '#6366f1',
      icon TEXT DEFAULT 'tag',
      is_default INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Table des transactions
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id TEXT,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      description TEXT NOT NULL,
      notes TEXT,
      date TEXT NOT NULL,
      payment_method TEXT DEFAULT 'card',
      receipt_url TEXT,
      is_recurring INTEGER DEFAULT 0,
      recurring_interval TEXT,
      tags TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    -- Table des budgets
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id TEXT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      period TEXT DEFAULT 'monthly' CHECK(period IN ('monthly', 'weekly', 'yearly')),
      month INTEGER,
      year INTEGER,
      alert_threshold REAL DEFAULT 80,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    -- Table des objectifs financiers
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      currency TEXT DEFAULT 'EUR',
      target_date TEXT,
      color TEXT DEFAULT '#6366f1',
      icon TEXT DEFAULT 'target',
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'paused', 'cancelled')),
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Table des notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info' CHECK(type IN ('info', 'warning', 'success', 'error')),
      is_read INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Index pour les performances
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
    CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
    CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  `);

    // Insérer les catégories par défaut
    insertDefaultCategories(db);

    console.log('✅ Base de données initialisée avec succès');
}

function insertDefaultCategories(db) {
    const existing = db.prepare('SELECT COUNT(*) as count FROM categories WHERE is_default = 1').get();
    if (existing.count > 0) return;

    const defaultCategories = [
        // Revenus
        { id: 'cat_salary', name: 'Salaire', type: 'income', color: '#10b981', icon: 'briefcase' },
        { id: 'cat_freelance', name: 'Freelance', type: 'income', color: '#06b6d4', icon: 'laptop' },
        { id: 'cat_investment', name: 'Investissements', type: 'income', color: '#8b5cf6', icon: 'trending-up' },
        { id: 'cat_rental', name: 'Location', type: 'income', color: '#f59e0b', icon: 'home' },
        { id: 'cat_other_income', name: 'Autres revenus', type: 'income', color: '#6366f1', icon: 'plus-circle' },
        // Dépenses
        { id: 'cat_housing', name: 'Logement', type: 'expense', color: '#ef4444', icon: 'home' },
        { id: 'cat_food', name: 'Alimentation', type: 'expense', color: '#f97316', icon: 'shopping-cart' },
        { id: 'cat_transport', name: 'Transport', type: 'expense', color: '#eab308', icon: 'car' },
        { id: 'cat_health', name: 'Santé', type: 'expense', color: '#ec4899', icon: 'heart' },
        { id: 'cat_entertainment', name: 'Loisirs', type: 'expense', color: '#a855f7', icon: 'music' },
        { id: 'cat_education', name: 'Éducation', type: 'expense', color: '#3b82f6', icon: 'book' },
        { id: 'cat_clothing', name: 'Vêtements', type: 'expense', color: '#14b8a6', icon: 'shopping-bag' },
        { id: 'cat_tech', name: 'Technologie', type: 'expense', color: '#64748b', icon: 'smartphone' },
        { id: 'cat_utilities', name: 'Factures', type: 'expense', color: '#84cc16', icon: 'zap' },
        { id: 'cat_other_expense', name: 'Autres dépenses', type: 'expense', color: '#6b7280', icon: 'more-horizontal' },
    ];

    const stmt = db.prepare(`
    INSERT OR IGNORE INTO categories (id, user_id, name, type, color, icon, is_default)
    VALUES (?, NULL, ?, ?, ?, ?, 1)
  `);

    const insertMany = db.transaction((cats) => {
        for (const cat of cats) {
            stmt.run(cat.id, cat.name, cat.type, cat.color, cat.icon);
        }
    });

    insertMany(defaultCategories);
}

module.exports = { getDb, initDatabase };
