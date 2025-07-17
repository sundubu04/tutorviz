const express = require('express');
const router = express.Router();
const whiteboardController = require('../controllers/whiteboardController');

// Get all whiteboards for a user
router.get('/', whiteboardController.getAllWhiteboards);

// Get a specific whiteboard by ID
router.get('/:id', whiteboardController.getWhiteboardById);

// Create a new whiteboard
router.post('/', whiteboardController.createWhiteboard);

// Update a whiteboard
router.put('/:id', whiteboardController.updateWhiteboard);

// Delete a whiteboard
router.delete('/:id', whiteboardController.deleteWhiteboard);

// Update whiteboard content
router.patch('/:id/content', whiteboardController.updateWhiteboardContent);

// Share whiteboard
router.post('/:id/share', whiteboardController.shareWhiteboard);

// Get whiteboard collaborators
router.get('/:id/collaborators', whiteboardController.getCollaborators);

module.exports = router; 