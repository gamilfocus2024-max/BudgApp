const errorHandler = (err, req, res, next) => {
    console.error('❌ Erreur:', err.message);
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }

    // Erreur de validation express-validator
    if (err.type === 'validation') {
        return res.status(400).json({ error: err.message, details: err.details });
    }

    // Erreur SQLite - contrainte unique
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'Cette valeur existe déjà' });
    }

    // Erreur SQLite générique
    if (err.code && err.code.startsWith('SQLITE_')) {
        return res.status(500).json({ error: 'Erreur de base de données' });
    }

    // Erreur de format JSON
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Format JSON invalide' });
    }

    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Erreur interne du serveur';

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
