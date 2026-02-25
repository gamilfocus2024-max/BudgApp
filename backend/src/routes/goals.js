const express = require('express');
const router = express.Router();
const { getGoals, createGoal, updateGoal, deleteGoal, addDeposit } = require('../controllers/goalController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', getGoals);
router.post('/', createGoal);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);
router.patch('/:id/deposit', addDeposit);

module.exports = router;
