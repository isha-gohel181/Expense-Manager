const express = require('express');
const AuthController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { validateSignup, validateLogin } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/signup', validateSignup, AuthController.signup);
router.post('/login', validateLogin, AuthController.login);

// Protected routes
router.get('/profile', auth, AuthController.getProfile);

module.exports = router;