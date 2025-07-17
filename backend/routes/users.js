const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// User registration
router.post('/register', userController.register);

// User login
router.post('/login', userController.login);

// Get user profile
router.get('/profile', userController.getProfile);

// Update user profile
router.put('/profile', userController.updateProfile);

// Get all users (for collaboration)
router.get('/', userController.getAllUsers);

module.exports = router; 