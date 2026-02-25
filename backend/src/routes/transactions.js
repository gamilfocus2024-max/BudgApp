const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { getTransactions, getTransaction, createTransaction, updateTransaction, deleteTransaction, getMonthlySummary } = require('../controllers/transactionController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticate);

const transactionValidation = [
    body('type').isIn(['income', 'expense']).withMessage('Type invalide'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Montant invalide'),
    body('description').trim().notEmpty().withMessage('Description requise').isLength({ max: 255 }),
    body('date').isDate().withMessage('Date invalide')
];

router.get('/', getTransactions);
router.get('/summary/monthly', getMonthlySummary);
router.get('/:id', getTransaction);
router.post('/', upload.single('receipt'), transactionValidation, createTransaction);
router.put('/:id', upload.single('receipt'), updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
