const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all tasks (with optional filtering)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { classId, taskType, difficultyLevel, tags, search } = req.query;
    let query = `
      SELECT t.*, u.first_name, u.last_name, c.name as class_name
      FROM tasks t
      JOIN users u ON t.created_by = u.id
      LEFT JOIN classes c ON t.class_id = c.id
      WHERE t.is_active = true
    `;
    const params = [];
    let paramCount = 0;

    if (classId) {
      paramCount++;
      query += ` AND t.class_id = $${paramCount}`;
      params.push(classId);
    }

    if (taskType) {
      paramCount++;
      query += ` AND t.task_type = $${paramCount}`;
      params.push(taskType);
    }

    if (difficultyLevel) {
      paramCount++;
      query += ` AND t.difficulty_level = $${paramCount}`;
      params.push(difficultyLevel);
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

    const result = await prisma.task.findMany({
      where: {
        isActive: true,
        ...(classId && { classId }),
        ...(taskType && { taskType }),
        ...(difficultyLevel && { difficultyLevel }),
        ...(tags && tags.length > 0 && { tags: { has: tags } }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        class: {
          select: {
            name: true,
          },
        },
      },
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get a single task by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Prisma expects UUIDs for the `id` field; handle non-UUID ids (e.g. demo-task) gracefully.
    const isUuid =
      typeof id === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        class: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create a new task
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, content, taskType, difficultyLevel, estimatedTime, classId, tags } = req.body;
    const createdBy = req.user.id;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: description || '',
        content,
        taskType: taskType || 'general',
        difficultyLevel: difficultyLevel || 'medium',
        estimatedTime: estimatedTime || 30,
        classId: classId || null,
        createdBy,
        tags: tags || [],
      },
    });
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update a task
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, content, taskType, difficultyLevel, estimatedTime, classId, tags, isActive } = req.body;
    const userId = req.user.id;

    // Check if user owns the task or is a teacher
    const ownershipResult = await prisma.task.findUnique({
      where: { id },
      select: {
        createdBy: true,
        creator: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!ownershipResult) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = ownershipResult;
    if (task.createdBy !== userId && task.creator.role !== 'teacher') {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title: title || undefined,
        description: description || undefined,
        content: content || undefined,
        taskType: taskType || undefined,
        difficultyLevel: difficultyLevel || undefined,
        estimatedTime: estimatedTime || undefined,
        classId: classId || undefined,
        tags: tags || undefined,
        isActive: isActive || undefined,
        updatedAt: new Date(),
      },
    });
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a task (soft delete by setting is_active to false)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user owns the task or is a teacher
    const ownershipResult = await prisma.task.findUnique({
      where: { id },
      select: {
        createdBy: true,
        creator: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!ownershipResult) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = ownershipResult;
    if (task.createdBy !== userId && task.creator.role !== 'teacher') {
      return res.status(403).json({ error: 'Not authorized to delete this task' });
    }

    // Soft delete by setting isActive to false
    const deletedTask = await prisma.task.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Get task statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const stats = await prisma.task.aggregate({
      _count: {
        id: true,
      },
      where: {
        isActive: true,
      },
    });
    res.json(stats);
  } catch (error) {
    console.error('Error fetching task statistics:', error);
    res.status(500).json({ error: 'Failed to fetch task statistics' });
  }
});

module.exports = router;
