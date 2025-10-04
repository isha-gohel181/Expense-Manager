const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

const validateSignup = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('companyName').trim().isLength({ min: 1 }),
  body('country').trim().isLength({ min: 1 }),
  validateRequest
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }),
  validateRequest
];

const validateExpense = [
  body('amount').isNumeric().isFloat({ min: 0 }),
  body('currency').isLength({ min: 3, max: 3 }),
  body('category').isIn(['travel', 'food', 'accommodation', 'transportation', 'office_supplies', 'entertainment', 'other']),
  body('description').trim().isLength({ min: 1 }),
  body('expenseDate').isISO8601(),
  validateRequest
];

module.exports = {
  validateSignup,
  validateLogin,
  validateExpense,
  validateRequest
};