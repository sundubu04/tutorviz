const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all calendar events (authenticated access - user-specific)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { start, end, classId } = req.query;
    
    const where = {
      createdBy: req.user.id
    };

    if (start) {
      where.endTime = {
        gte: new Date(start)
      };
    }

    if (end) {
      where.startTime = {
        lte: new Date(end)
      };
    }

    if (classId) {
      where.classId = classId;
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        class: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });
    
    const formattedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      eventType: event.eventType,
      classId: event.classId,
      className: event.class?.name || null,
      classDescription: event.class?.description || null,
      createdBy: event.creator ? {
        firstName: event.creator.firstName,
        lastName: event.creator.lastName
      } : null,
      createdAt: event.createdAt
    }));

    res.json({ events: formattedEvents });
  } catch (error) {
    console.error('Calendar events fetch error:', error);
    res.status(500).json({ 
      error: 'Calendar events fetch failed',
      message: 'An error occurred while fetching calendar events'
    });
  }
});

// Get single event by ID (authenticated access - user-specific)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: id,
        createdBy: req.user.id
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ 
        error: 'Event not found',
        message: 'The requested event does not exist or you do not have access to it'
      });
    }

    res.json({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        eventType: event.eventType,
        classId: event.classId,
        className: event.class?.name || null,
        classDescription: event.class?.description || null,
        createdBy: event.creator ? {
          firstName: event.creator.firstName,
          lastName: event.creator.lastName
        } : null,
        createdAt: event.createdAt
      }
    });
  } catch (error) {
    console.error('Event fetch error:', error);
    res.status(500).json({ 
      error: 'Event fetch failed',
      message: 'An error occurred while fetching event details'
    });
  }
});

// Create new event
router.post('/', authenticateToken, [
  body('title').trim().isLength({ min: 1, max: 255 }),
  body('description').optional().trim(),
  body('startTime').isISO8601(),
  body('endTime').isISO8601(),
  body('eventType').isIn(['class', 'assignment', 'exam', 'meeting', 'other']),
  body('classId').optional().isUUID().withMessage('Invalid class ID. Must be a valid UUID.'),

], async (req, res) => {
  try {
    console.log('Received event creation request:');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, description, startTime, endTime, eventType, classId } = req.body;

    // Validate time range
    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ 
        error: 'Invalid time range',
        message: 'End time must be after start time'
      });
    }

    // Handle classId - convert empty string or undefined to null
    const processedClassId = classId && classId.trim() !== '' ? classId : null;

    console.log('Processing event creation with data:', {
      title, description, startTime, endTime, eventType, 
      classId: processedClassId, createdBy: req.user.id
    });

    // If classId is provided, verify it exists
    if (processedClassId) {
      const classExists = await prisma.class.findUnique({
        where: { id: processedClassId }
      });
      
      if (!classExists) {
        return res.status(400).json({
          error: 'Invalid class ID',
          message: 'The specified class does not exist'
        });
      }
    }

    const newEvent = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        eventType,
        classId: processedClassId,
        createdBy: req.user.id
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Event created successfully',
      event: {
        id: newEvent.id,
        title: newEvent.title,
        description: newEvent.description,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        eventType: newEvent.eventType,
        classId: newEvent.classId,
        className: newEvent.class?.name || null,
        createdAt: newEvent.createdAt
      }
    });
  } catch (error) {
    console.error('Event creation error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({ 
      error: 'Event creation failed',
      message: 'An error occurred while creating the event'
    });
  }
});

// Update event
router.put('/:id', authenticateToken, requireOwnership('calendar_events', 'id', 'created_by'), [
  body('title').optional().trim().isLength({ min: 1, max: 255 }),
  body('description').optional().trim(),
  body('startTime').optional().isISO8601(),
  body('endTime').optional().isISO8601(),
  body('eventType').optional().isIn(['class', 'assignment', 'exam', 'meeting', 'other']),
  body('classId').optional().isUUID().withMessage('Invalid class ID. Must be a valid UUID.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { title, description, startTime, endTime, eventType, classId } = req.body;

    // Validate time range if both times are provided
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ 
        error: 'Invalid time range',
        message: 'End time must be after start time'
      });
    }

    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (eventType !== undefined) updateData.eventType = eventType;
    if (classId !== undefined) updateData.classId = classId;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        error: 'No updates provided',
        message: 'Please provide at least one field to update'
      });
    }

    updateData.updatedAt = new Date();

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id },
      data: updateData
    });

    res.json({
      message: 'Event updated successfully',
      event: {
        id: updatedEvent.id,
        title: updatedEvent.title,
        description: updatedEvent.description,
        startTime: updatedEvent.startTime,
        endTime: updatedEvent.endTime,
        eventType: updatedEvent.eventType,
        updatedAt: updatedEvent.updatedAt
      }
    });
  } catch (error) {
    console.error('Event update error:', error);
    res.status(500).json({ 
      error: 'Event update failed',
      message: 'An error occurred while updating the event'
    });
  }
});

// Delete event (authenticated access - user can only delete their own events)
router.delete('/:id', authenticateToken, requireOwnership('calendar_events', 'id', 'created_by'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.calendarEvent.delete({
      where: { id }
    });

    res.json({
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Event deletion error:', error);
    res.status(500).json({ 
      error: 'Event deletion failed',
      message: 'An error occurred while deleting the event'
    });
  }
});

// Delete all user's events (authenticated access - user can only delete their own events)
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const result = await prisma.calendarEvent.deleteMany({
      where: { createdBy: req.user.id }
    });

    res.json({
      message: `Successfully deleted ${result.count} of your events`,
      deletedCount: result.count
    });
  } catch (error) {
    console.error('Bulk event deletion error:', error);
    res.status(500).json({ 
      error: 'Bulk event deletion failed',
      message: 'An error occurred while deleting events'
    });
  }
});

module.exports = router;