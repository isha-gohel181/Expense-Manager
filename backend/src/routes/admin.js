const express = require('express');
const AdminController = require('../controllers/adminController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require admin role
router.use(auth, authorize('admin'));

// Dashboard
router.get('/dashboard', AdminController.getDashboardStats);

// Approval Rules
router.post('/approval-rules', AdminController.createApprovalRule);
router.get('/approval-rules', AdminController.getApprovalRules);
router.put('/approval-rules/:id', AdminController.updateApprovalRule);
router.delete('/approval-rules/:id', AdminController.deleteApprovalRule);

// Expense Management
router.get('/expenses', AdminController.getAllExpenses);
router.post('/expenses/:id/override', AdminController.overrideApproval);

// Company Settings
router.put('/company/settings', AdminController.updateCompanySettings);

module.exports = router;