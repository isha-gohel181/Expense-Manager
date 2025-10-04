const express = require('express');
const ExpenseController = require('../controllers/expenseController');
const { auth, authorize } = require('../middleware/auth');
const { validateExpense } = require('../middleware/validation');
const upload = require('../middleware/upload');

const router = express.Router();

// New route for real-time OCR processing
router.post(
  '/process-receipt',
  auth,
  upload.single('receipt'),
  ExpenseController.processReceiptForOcr
);

// Employee routes
router.post(
  '/',
  auth,
  authorize('employee', 'manager', 'admin'),
  upload.single('receipt'),
  validateExpense,
  ExpenseController.createExpense
);

router.get(
  '/',
  auth,
  ExpenseController.getExpenses
);

router.get(
  '/:id',
  auth,
  ExpenseController.getExpenseById
);

router.put(
  '/:id',
  auth,
  authorize('employee'),
  validateExpense,
  ExpenseController.updateExpense
);

router.delete(
  '/:id',
  auth,
  authorize('employee'),
  ExpenseController.deleteExpense
);

// Manager/Admin routes
router.get(
  '/pending/approvals',
  auth,
  authorize('manager', 'admin'),
  ExpenseController.getPendingApprovals
);

router.post(
  '/:id/approve',
  auth,
  authorize('manager', 'admin'),
  ExpenseController.approveExpense
);

module.exports = router;