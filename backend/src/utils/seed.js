require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb, initDatabase } = require('../config/database');

async function seed() {
    console.log('🌱 Démarrage du seeding...');
    initDatabase();
    const db = getDb();

    // Supprimer les données existantes (sauf défauts)
    db.prepare("DELETE FROM notifications").run();
    db.prepare("DELETE FROM goals").run();
    db.prepare("DELETE FROM budgets").run();
    db.prepare("DELETE FROM transactions").run();
    db.prepare("DELETE FROM users").run();

    // Créer utilisateur de démo
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash('Demo1234!', 12);
    db.prepare(`INSERT INTO users (id, name, email, password, currency, role) VALUES (?, ?, ?, ?, ?, ?)`).run(userId, 'Marie Dupont', 'demo@budgapp.fr', hashedPassword, 'EUR', 'user');

    // Créer admin
    const adminId = uuidv4();
    const adminHash = await bcrypt.hash('Admin1234!', 12);
    db.prepare(`INSERT INTO users (id, name, email, password, currency, role) VALUES (?, ?, ?, ?, ?, ?)`).run(adminId, 'Admin BudgApp', 'admin@budgapp.fr', adminHash, 'EUR', 'admin');

    console.log('✅ Utilisateurs créés');

    // Catégories par défaut déjà en DB
    const categories = db.prepare('SELECT * FROM categories WHERE is_default = 1').all();
    const catMap = {};
    categories.forEach(c => { catMap[c.name] = c.id; });

    // Générer 6 mois de transactions
    const now = new Date(2026, 1, 25); // Feb 2026
    const transactions = [];

    for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
        const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
        const y = date.getFullYear();
        const m = date.getMonth() + 1;

        // Revenus mensuels
        transactions.push({ type: 'income', amount: 3200, desc: 'Salaire net', cat: 'Salaire', day: 1, method: 'virement' });
        if (monthOffset % 2 === 0) transactions.push({ type: 'income', amount: 800, desc: 'Mission freelance', cat: 'Freelance', day: 15, method: 'virement' });

        // Dépenses fixes
        transactions.push({ type: 'expense', amount: 950, desc: 'Loyer + charges', cat: 'Logement', day: 5, method: 'virement' });
        transactions.push({ type: 'expense', amount: 65, desc: 'Électricité EDF', cat: 'Factures', day: 10, method: 'prélèvement' });
        transactions.push({ type: 'expense', amount: 30, desc: 'Abonnement internet', cat: 'Technologie', day: 10, method: 'prélèvement' });
        transactions.push({ type: 'expense', amount: 15, desc: 'Netflix', cat: 'Loisirs', day: 12, method: 'prélèvement' });
        transactions.push({ type: 'expense', amount: 9.99, desc: 'Spotify', cat: 'Loisirs', day: 12, method: 'prélèvement' });

        // Dépenses variables
        const groceryDays = [3, 8, 14, 20, 26];
        groceryDays.forEach(d => transactions.push({
            type: 'expense', amount: Math.round(60 + Math.random() * 50), desc: 'Courses alimentaires', cat: 'Alimentation', day: d, method: 'card'
        }));

        transactions.push({ type: 'expense', amount: Math.round(50 + Math.random() * 80), desc: 'Restaurant', cat: 'Alimentation', day: 7, method: 'card' });
        transactions.push({ type: 'expense', amount: Math.round(60 + Math.random() * 40), desc: 'Carburant', cat: 'Transport', day: 5, method: 'card' });
        transactions.push({ type: 'expense', amount: 75, desc: 'Abonnement transport', cat: 'Transport', day: 2, method: 'prélèvement' });

        if (monthOffset <= 2) {
            transactions.push({ type: 'expense', amount: Math.round(30 + Math.random() * 100), desc: 'Pharmacie', cat: 'Santé', day: 18, method: 'card' });
        }
        if (monthOffset % 3 === 0) {
            transactions.push({ type: 'expense', amount: Math.round(40 + Math.random() * 80), desc: 'Vêtements', cat: 'Vêtements', day: 20, method: 'card' });
        }

        // Insérer les transactions du mois
        const stmt = db.prepare(`INSERT INTO transactions (id, user_id, category_id, type, amount, currency, description, date, payment_method, is_recurring) VALUES (?, ?, ?, ?, ?, 'EUR', ?, ?, ?, ?)`);
        const insertBatch = db.transaction(() => {
            for (const t of transactions.splice(0, transactions.length)) {
                const catId = catMap[t.cat] || null;
                const day = String(t.day).padStart(2, '0');
                const dateStr = `${y}-${String(m).padStart(2, '0')}-${day}`;
                const isRecurring = ['Salaire', 'Loyer + charges', 'Abonnement internet', 'Netflix', 'Spotify', 'Abonnement transport'].includes(t.desc) ? 1 : 0;
                stmt.run(uuidv4(), userId, catId, t.type, t.amount, t.desc, dateStr, t.method || 'card', isRecurring);
            }
        });
        insertBatch();
    }

    // Créer budgets pour mois courant
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const budgetData = [
        { cat: 'Alimentation', amount: 500, name: 'Budget Alimentation' },
        { cat: 'Transport', amount: 200, name: 'Budget Transport' },
        { cat: 'Loisirs', amount: 150, name: 'Budget Loisirs' },
        { cat: 'Logement', amount: 1100, name: 'Budget Logement' },
        { cat: 'Santé', amount: 100, name: 'Budget Santé' },
        { cat: 'Vêtements', amount: 100, name: 'Budget Vêtements' },
    ];

    for (const b of budgetData) {
        const catId = catMap[b.cat];
        if (catId) {
            db.prepare(`INSERT INTO budgets (id, user_id, category_id, name, amount, period, month, year) VALUES (?, ?, ?, ?, ?, 'monthly', ?, ?)`).run(uuidv4(), userId, catId, b.name, b.amount, currentMonth, currentYear);
        }
    }
    console.log('✅ Budgets créés');

    // Créer objectifs
    db.prepare(`INSERT INTO goals (id, user_id, name, description, target_amount, current_amount, currency, target_date, color, icon) VALUES (?, ?, ?, ?, ?, ?, 'EUR', ?, ?, ?)`).run(uuidv4(), userId, 'Épargne vacances 🏖️', 'Voyage en Bretagne été 2026', 3000, 1200, '2026-07-01', '#06b6d4', 'sun');
    db.prepare(`INSERT INTO goals (id, user_id, name, description, target_amount, current_amount, currency, target_date, color, icon) VALUES (?, ?, ?, ?, ?, ?, 'EUR', ?, ?, ?)`).run(uuidv4(), userId, 'Fonds d\'urgence', '3 mois de dépenses', 8000, 3500, '2026-12-31', '#10b981', 'shield');
    db.prepare(`INSERT INTO goals (id, user_id, name, description, target_amount, current_amount, currency, target_date, color, icon) VALUES (?, ?, ?, ?, ?, ?, 'EUR', ?, ?, ?)`).run(uuidv4(), userId, 'Nouveau MacBook Pro', 'Remplacement PC portable', 2500, 750, '2026-09-01', '#8b5cf6', 'laptop');
    console.log('✅ Objectifs créés');

    // Notifications de bienvenue
    db.prepare(`INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)`).run(uuidv4(), userId, 'Bienvenue sur BudgApp ! 🎉', 'Votre compte de démonstration est prêt avec des données d\'exemple.', 'success');
    db.prepare(`INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)`).run(uuidv4(), userId, '💡 Conseil de budget', 'La règle 50/30/20 recommande 50% besoins, 30% envies et 20% épargne.', 'info');
    console.log('✅ Notifications créées');

    console.log('\n🎉 Seeding terminé avec succès !');
    console.log('📧 Compte démo: demo@budgapp.fr / Demo1234!');
    console.log('👑 Compte admin: admin@budgapp.fr / Admin1234!');
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Erreur de seeding:', err);
    process.exit(1);
});
