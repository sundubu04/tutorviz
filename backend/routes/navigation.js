const express = require('express');
const router = express.Router();

// Navigation routes for different sections
router.get('/dashboard', (req, res) => {
    res.json({
        success: true,
        data: {
            section: 'dashboard',
            message: 'Dashboard data loaded'
        }
    });
});

router.get('/calendar', (req, res) => {
    res.json({
        success: true,
        data: {
            section: 'calendar',
            message: 'Calendar data loaded'
        }
    });
});

router.get('/recording', (req, res) => {
    res.json({
        success: true,
        data: {
            section: 'recording',
            message: 'Recording data loaded'
        }
    });
});

router.get('/students', (req, res) => {
    res.json({
        success: true,
        data: {
            section: 'students',
            message: 'Students data loaded'
        }
    });
});

router.get('/whiteboards', (req, res) => {
    res.json({
        success: true,
        data: {
            section: 'whiteboards',
            message: 'Whiteboards data loaded'
        }
    });
});

router.get('/profile', (req, res) => {
    res.json({
        success: true,
        data: {
            section: 'profile',
            message: 'Profile data loaded'
        }
    });
});

router.get('/task-maker', (req, res) => {
    res.json({
        success: true,
        data: {
            section: 'task-maker',
            message: 'Task Maker data loaded'
        }
    });
});

module.exports = router; 