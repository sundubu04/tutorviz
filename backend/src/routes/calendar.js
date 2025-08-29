const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');

const router = express.Router();

// Get all calendar events (authenticated access - user-specific)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { start, end, classId } = req.query;
    
    let query = `
      SELECT 
        ce.id, ce.title, ce.description, ce.start_time, ce.end_time, 
        ce.event_type, ce.created_at, ce.class_id,
        c.name as class_name, c.description as class_description,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name
      FROM calendar_events ce
      LEFT JOIN classes c ON ce.class_id = c.id
      LEFT JOIN users u ON ce.created_by = u.id
      WHERE ce.created_by = $1
    `;
    const params = [req.user.id];
    let paramCount = 2;

    // Filter by user who created the events

    if (start) {
      query += ` AND ce.end_time >= $${paramCount}`;
      params.push(start);
      paramCount++;
    }

    if (end) {
      query += ` AND ce.start_time <= $${paramCount}`;
      params.push(end);
      paramCount++;
    }

    if (classId) {
      query += ` AND ce.class_id = $${paramCount}`;
      params.push(classId);
      paramCount++;
    }

    query += ' ORDER BY ce.start_time ASC';

    const result = await pool.query(query, params);
    
    const events = result.rows.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      startTime: event.start_time,
      endTime: event.end_time,
      eventType: event.event_type,
      classId: event.class_id,
      className: event.class_name,
      classDescription: event.class_description,
      createdBy: event.created_by_first_name && event.created_by_last_name ? {
        firstName: event.created_by_first_name,
        lastName: event.created_by_last_name
      } : null,
      createdAt: event.created_at
    }));

    res.json({ events });
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

    const result = await pool.query(`
      SELECT 
        ce.id, ce.title, ce.description, ce.start_time, ce.end_time, 
        ce.event_type, ce.created_at, ce.class_id,
        c.name as class_name, c.description as class_description,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name
      FROM calendar_events ce
      LEFT JOIN classes c ON ce.class_id = c.id
      LEFT JOIN users u ON ce.created_by = u.id
      WHERE ce.id = $1 AND ce.created_by = $2
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Event not found',
        message: 'The requested event does not exist or you do not have access to it'
      });
    }

    const event = result.rows[0];

    // User can only access their own events

    res.json({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        startTime: event.start_time,
        endTime: event.end_time,
        eventType: event.event_type,
        isAllDay: event.is_all_day,
        classId: event.class_id,
        className: event.class_name,
        classDescription: event.class_description,
        createdBy: event.created_by_first_name && event.created_by_last_name ? {
          firstName: event.created_by_first_name,
          lastName: event.created_by_last_name
        } : null,
        createdAt: event.created_at
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

    // Verify table structure before insert
    try {
      const tableCheck = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'calendar_events' 
        ORDER BY ordinal_position
      `);
      console.log('Calendar events table structure:', tableCheck.rows);
    } catch (tableError) {
      console.error('Error checking table structure:', tableError);
    }

    const result = await pool.query(
      `INSERT INTO calendar_events (title, description, start_time, end_time, event_type, class_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, description, start_time, end_time, event_type, class_id, created_at`,
      [title, description, startTime, endTime, eventType, processedClassId, req.user.id]
    );

    const newEvent = result.rows[0];

    // Get class information if class_id exists
    let classInfo = null;
    if (newEvent.class_id) {
      try {
        const classResult = await pool.query(
          'SELECT id, name, description FROM classes WHERE id = $1',
          [newEvent.class_id]
        );
        if (classResult.rows.length > 0) {
          classInfo = classResult.rows[0];
        }
      } catch (error) {
        console.error('Error fetching class info:', error);
      }
    }

    res.status(201).json({
      message: 'Event created successfully',
      event: {
        id: newEvent.id,
        title: newEvent.title,
        description: newEvent.description,
        startTime: newEvent.start_time,
        endTime: newEvent.end_time,
        eventType: newEvent.event_type,
        classId: newEvent.class_id,
        className: classInfo ? classInfo.name : null,
        createdAt: newEvent.created_at
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

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (title) {
      updateFields.push(`title = $${paramCount++}`);
      updateValues.push(title);
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      updateValues.push(description);
    }

    if (startTime) {
      updateFields.push(`start_time = $${paramCount++}`);
      updateValues.push(startTime);
    }

    if (endTime) {
      updateFields.push(`end_time = $${paramCount++}`);
      updateValues.push(endTime);
    }

    if (eventType) {
      updateFields.push(`event_type = $${paramCount++}`);
      updateValues.push(eventType);
    }

    if (classId !== undefined) {
      updateFields.push(`class_id = $${paramCount++}`);
      updateValues.push(classId);
    }


    if (updateFields.length === 0) {
      return res.status(400).json({ 
        error: 'No updates provided',
        message: 'Please provide at least one field to update'
      });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const result = await pool.query(
      `UPDATE calendar_events SET ${updateFields.join(', ')} WHERE id = $${paramCount}
       RETURNING id, title, description, start_time, end_time, event_type, updated_at`,
      updateValues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Event not found',
        message: 'The requested event does not exist'
      });
    }

    const updatedEvent = result.rows[0];

    res.json({
      message: 'Event updated successfully',
      event: {
        id: updatedEvent.id,
        title: updatedEvent.title,
        description: updatedEvent.description,
        startTime: updatedEvent.start_time,
        endTime: updatedEvent.end_time,
        eventType: updatedEvent.event_type,
        updatedAt: updatedEvent.updated_at
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

    const result = await pool.query(
      'DELETE FROM calendar_events WHERE id = $1 AND created_by = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Event not found',
        message: 'The requested event does not exist or you do not have permission to delete it'
      });
    }

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
    const result = await pool.query(
      'DELETE FROM calendar_events WHERE created_by = $1 RETURNING id',
      [req.user.id]
    );

    res.json({
      message: `Successfully deleted ${result.rows.length} of your events`,
      deletedCount: result.rows.length
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