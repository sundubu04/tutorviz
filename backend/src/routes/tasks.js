const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all tasks (with optional filtering)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { class_id, task_type, difficulty_level, tags, search } = req.query;
    let query = `
      SELECT t.*, u.first_name, u.last_name, c.name as class_name
      FROM tasks t
      JOIN users u ON t.created_by = u.id
      LEFT JOIN classes c ON t.class_id = c.id
      WHERE t.is_active = true
    `;
    const params = [];
    let paramCount = 0;

    if (class_id) {
      paramCount++;
      query += ` AND t.class_id = $${paramCount}`;
      params.push(class_id);
    }

    if (task_type) {
      paramCount++;
      query += ` AND t.task_type = $${paramCount}`;
      params.push(task_type);
    }

    if (difficulty_level) {
      paramCount++;
      query += ` AND t.difficulty_level = $${paramCount}`;
      params.push(difficulty_level);
    }

    if (tags && tags.length > 0) {
      paramCount++;
      query += ` AND t.tags && $${paramCount}`;
      params.push(tags);
    }

    if (search) {
      paramCount++;
      query += ` AND (t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount} OR t.content ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get a single task by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT t.*, u.first_name, u.last_name, c.name as class_name
      FROM tasks t
      JOIN users u ON t.created_by = u.id
      LEFT JOIN classes c ON t.class_id = c.id
      WHERE t.id = $1 AND t.is_active = true
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create a new task
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, content, task_type, difficulty_level, estimated_time, class_id, tags } = req.body;
    const created_by = req.user.id;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const query = `
      INSERT INTO tasks (title, description, content, task_type, difficulty_level, estimated_time, class_id, created_by, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const params = [
      title,
      description || '',
      content,
      task_type || 'general',
      difficulty_level || 'medium',
      estimated_time || 30,
      class_id || null,
      created_by,
      tags || []
    ];

    const result = await pool.query(query, params);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update a task
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, content, task_type, difficulty_level, estimated_time, class_id, tags, is_active } = req.body;
    const user_id = req.user.id;

    // Check if user owns the task or is a teacher
    const ownershipQuery = `
      SELECT t.created_by, u.role
      FROM tasks t
      JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `;
    
    const ownershipResult = await pool.query(ownershipQuery, [id]);
    
    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = ownershipResult.rows[0];
    if (task.created_by !== user_id && task.role !== 'teacher') {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    const query = `
      UPDATE tasks 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          content = COALESCE($3, content),
          task_type = COALESCE($4, task_type),
          difficulty_level = COALESCE($5, difficulty_level),
          estimated_time = COALESCE($6, estimated_time),
          class_id = COALESCE($7, class_id),
          tags = COALESCE($8, tags),
          is_active = COALESCE($9, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;
    
    const params = [
      title,
      description,
      content,
      task_type,
      difficulty_level,
      estimated_time,
      class_id,
      tags,
      is_active,
      id
    ];

    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a task (soft delete by setting is_active to false)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Check if user owns the task or is a teacher
    const ownershipQuery = `
      SELECT t.created_by, u.role
      FROM tasks t
      JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `;
    
    const ownershipResult = await pool.query(ownershipQuery, [id]);
    
    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = ownershipResult.rows[0];
    if (task.created_by !== user_id && task.role !== 'teacher') {
      return res.status(403).json({ error: 'Not authorized to delete this task' });
    }

    // Soft delete by setting is_active to false
    const query = `
      UPDATE tasks 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [id]);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Get task statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_tasks,
        COUNT(CASE WHEN task_type = 'programming' THEN 1 END) as programming_tasks,
        COUNT(CASE WHEN task_type = 'math' THEN 1 END) as math_tasks,
        COUNT(CASE WHEN task_type = 'writing' THEN 1 END) as writing_tasks,
        COUNT(CASE WHEN difficulty_level = 'beginner' THEN 1 END) as beginner_tasks,
        COUNT(CASE WHEN difficulty_level = 'intermediate' THEN 1 END) as intermediate_tasks,
        COUNT(CASE WHEN difficulty_level = 'advanced' THEN 1 END) as advanced_tasks
      FROM tasks
    `;
    
    const result = await pool.query(statsQuery);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching task statistics:', error);
    res.status(500).json({ error: 'Failed to fetch task statistics' });
  }
});

module.exports = router;
