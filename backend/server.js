require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { initDatabase } = require('./src/config/database');
const errorHandler = require('./src/middleware/errorHandler');

// Routes
const authRoutes = require('./src/routes/auth');
const transactionRoutes = require('./src/routes/transactions');
const budgetRoutes = require('./src/routes/budgets');
const goalRoutes = require('./src/routes/goals');
const categoryRoutes = require('./src/routes/categories');
const reportRoutes = require('./src/routes/reports');
const statsRoutes = require('./src/routes/stats');

const app = express();
const PORT = process.env.PORT || 5000;

// Sécurité
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Trop de requêtes, réessayez plus tard.' }
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Trop de tentatives de connexion, réessayez dans 15 minutes.' }
});

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging en développement
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Fichiers statiques (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialiser la base de données
initDatabase();

// Routes API
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'BudgApp API opérationnelle',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Gestionnaire d'erreurs global
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 BudgApp API démarrée sur http://localhost:${PORT}`);
  console.log(`📊 Environnement: ${process.env.NODE_ENV}`);
  console.log(`🗄️  Base de données: ${process.env.DB_PATH}\n`);
});

module.exports = app;
