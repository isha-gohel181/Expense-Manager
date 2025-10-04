const express = require('express');
const UserController = require('../controllers/userController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Admin only routes
router.post(
  '/',
  auth,
  authorize('admin'),
  UserController.createUser
);

router.get(
  '/',
  auth,
  authorize('admin'),
  UserController.getUsers
);

router.get(
  '/managers',
  auth,
  authorize('admin'),
  UserController.getManagers
);

router.get(
  '/:id',
  auth,
  authorize('admin'),
  UserController.getUserById
);

router.put(
  '/:id',
  auth,
  authorize('admin'),
  UserController.updateUser
);

router.delete(
  '/:id',
  auth,
  authorize('admin'),
  UserController.deleteUser
);

// User profile routes
router.put(
  '/profile/update',
  auth,
  UserController.updateProfile
);

module.exports = router;