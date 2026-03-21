const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { isUuid } = require('../utils/uuid');

const router = express.Router();
const prisma = new PrismaClient();

const requireOwnedTask = async (taskId, userId) => {
  if (!isUuid(taskId)) return { status: 400, error: 'Invalid taskId' };

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, createdBy: true }
  });

  if (!task) return { status: 404, error: 'Task not found' };
  if (task.createdBy !== userId) return { status: 403, error: 'Access denied' };

  return { status: 200, task };
};

// Get all tasks (with optional filtering)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { classId, taskType, difficultyLevel, tags, search } = req.query;

    const result = await prisma.task.findMany({
      where: {
        isActive: true,
        createdBy: req.user.id,
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

// Must be registered before `GET /:id` so "stats" is not treated as a task id.
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const stats = await prisma.task.aggregate({
      _count: {
        id: true,
      },
      where: {
        isActive: true,
        createdBy: req.user.id,
      },
    });
    res.json(stats);
  } catch (error) {
    console.error('Error fetching task statistics:', error);
    res.status(500).json({ error: 'Failed to fetch task statistics' });
  }
});

// Get a single task by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Prisma expects UUIDs for the `id` field; handle non-UUID ids (e.g. demo-task) gracefully.
    if (!isUuid(id)) {
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

    if (task.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
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

    // Create initial LaTeX version snapshot for persistence.
    await prisma.taskVersion.create({
      data: {
        taskId: task.id,
        versionNumber: 1,
        latexContent: task.content,
        changeSummary: 'Initial snapshot',
        createdBy: req.user.id,
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

    const ownershipResult = await prisma.task.findUnique({
      where: { id },
      select: {
        createdBy: true,
        content: true,
      },
    });

    if (!ownershipResult) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = ownershipResult;
    if (task.createdBy !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    const willUpdateContent = typeof content === 'string' && content !== task.content;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title: title || undefined,
        description: description || undefined,
        content: typeof content === 'string' ? content : undefined,
        taskType: taskType || undefined,
        difficultyLevel: difficultyLevel || undefined,
        estimatedTime: estimatedTime || undefined,
        classId: classId || undefined,
        tags: tags || undefined,
        isActive: isActive || undefined,
        updatedAt: new Date(),
      },
    });

    // Create a new snapshot only when the LaTeX source changes.
    if (willUpdateContent) {
      const max = await prisma.taskVersion.aggregate({
        _max: { versionNumber: true },
        where: { taskId: id },
      });
      const nextVersionNumber = (max._max.versionNumber || 0) + 1;

      await prisma.taskVersion.create({
        data: {
          taskId: id,
          versionNumber: nextVersionNumber,
          latexContent: content,
          changeSummary: 'LaTeX content updated',
          createdBy: req.user.id,
        },
      });
    }

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

    const ownershipResult = await prisma.task.findUnique({
      where: { id },
      select: {
        createdBy: true,
      },
    });

    if (!ownershipResult) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = ownershipResult;
    if (task.createdBy !== userId) {
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

// ----------------------------
// Task LaTeX versions endpoints
// ----------------------------

router.get('/:taskId/versions', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const ownership = await requireOwnedTask(taskId, req.user.id);
    if (ownership.status !== 200) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const versions = await prisma.taskVersion.findMany({
      where: { taskId },
      orderBy: { versionNumber: 'desc' },
    });

    res.json(versions);
  } catch (error) {
    console.error('Error fetching task versions:', error);
    res.status(500).json({ error: 'Failed to fetch task versions' });
  }
});

router.get('/:taskId/versions/:versionNumber', authenticateToken, async (req, res) => {
  try {
    const { taskId, versionNumber } = req.params;
    const parsedVersionNumber = Number(versionNumber);
    if (!Number.isInteger(parsedVersionNumber) || parsedVersionNumber < 1) {
      return res.status(400).json({ error: 'Invalid versionNumber' });
    }

    const ownership = await requireOwnedTask(taskId, req.user.id);
    if (ownership.status !== 200) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const version = await prisma.taskVersion.findFirst({
      where: { taskId, versionNumber: parsedVersionNumber },
    });

    if (!version) return res.status(404).json({ error: 'Version not found' });
    res.json(version);
  } catch (error) {
    console.error('Error fetching task version:', error);
    res.status(500).json({ error: 'Failed to fetch task version' });
  }
});

router.post('/:taskId/versions', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const ownership = await requireOwnedTask(taskId, req.user.id);
    if (ownership.status !== 200) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const { latexContent, changeSummary } = req.body || {};

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { content: true },
    });

    if (!task) return res.status(404).json({ error: 'Task not found' });

    const snapshotLatex =
      typeof latexContent === 'string' && latexContent.trim()
        ? latexContent
        : task.content;

    const max = await prisma.taskVersion.aggregate({
      _max: { versionNumber: true },
      where: { taskId }
    });

    const nextVersionNumber = (max._max.versionNumber || 0) + 1;

    const created = await prisma.taskVersion.create({
      data: {
        taskId,
        versionNumber: nextVersionNumber,
        latexContent: snapshotLatex,
        changeSummary:
          typeof changeSummary === 'string' && changeSummary.trim()
            ? changeSummary.trim()
            : 'Manual snapshot',
        createdBy: req.user.id,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating task version:', error);
    res.status(500).json({ error: 'Failed to create task version' });
  }
});

router.delete('/:taskId/versions/:versionNumber', authenticateToken, async (req, res) => {
  try {
    const { taskId, versionNumber } = req.params;
    const parsedVersionNumber = Number(versionNumber);
    if (!Number.isInteger(parsedVersionNumber) || parsedVersionNumber < 1) {
      return res.status(400).json({ error: 'Invalid versionNumber' });
    }

    const ownership = await requireOwnedTask(taskId, req.user.id);
    if (ownership.status !== 200) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const deleted = await prisma.taskVersion.deleteMany({
      where: { taskId, versionNumber: parsedVersionNumber },
    });

    if (deleted.count === 0) return res.status(404).json({ error: 'Version not found' });
    res.json({ message: 'Version deleted successfully' });
  } catch (error) {
    console.error('Error deleting task version:', error);
    res.status(500).json({ error: 'Failed to delete task version' });
  }
});

// Apply a historical version by updating the current task latex content
// and creating an additional snapshot (append-only history).
router.post('/:taskId/versions/:versionNumber/apply', authenticateToken, async (req, res) => {
  try {
    const { taskId, versionNumber } = req.params;
    const parsedVersionNumber = Number(versionNumber);
    if (!Number.isInteger(parsedVersionNumber) || parsedVersionNumber < 1) {
      return res.status(400).json({ error: 'Invalid versionNumber' });
    }

    const ownership = await requireOwnedTask(taskId, req.user.id);
    if (ownership.status !== 200) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const targetVersion = await prisma.taskVersion.findFirst({
      where: { taskId, versionNumber: parsedVersionNumber },
    });

    if (!targetVersion) return res.status(404).json({ error: 'Version not found' });

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        content: targetVersion.latexContent,
        updatedAt: new Date(),
      },
    });

    const max = await prisma.taskVersion.aggregate({
      _max: { versionNumber: true },
      where: { taskId }
    });
    const nextVersionNumber = (max._max.versionNumber || 0) + 1;

    const newSnapshot = await prisma.taskVersion.create({
      data: {
        taskId,
        versionNumber: nextVersionNumber,
        latexContent: targetVersion.latexContent,
        changeSummary: `Applied version ${parsedVersionNumber}`,
        createdBy: req.user.id,
      },
    });

    res.json({ task: updatedTask, appliedVersion: newSnapshot });
  } catch (error) {
    console.error('Error applying task version:', error);
    res.status(500).json({ error: 'Failed to apply task version' });
  }
});

// ----------------------------
// Task chat endpoints
// ----------------------------

router.get('/:taskId/chat/messages', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const ownership = await requireOwnedTask(taskId, req.user.id);
    if (ownership.status !== 200) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const messages = await prisma.taskChatMessage.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        proposedLatex: true,
        createdAt: true,
      },
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching task chat messages:', error);
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
});

router.post('/:taskId/chat/messages', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const ownership = await requireOwnedTask(taskId, req.user.id);
    if (ownership.status !== 200) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const { content } = req.body || {};
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: "Missing or invalid 'content'" });
    }

    const created = await prisma.taskChatMessage.create({
      data: {
        taskId,
        createdBy: req.user.id,
        role: 'user',
        content: content.trim(),
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating task chat message:', error);
    res.status(500).json({ error: 'Failed to create chat message' });
  }
});

router.patch('/:taskId/chat/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { taskId, messageId } = req.params;
    if (!isUuid(messageId)) return res.status(400).json({ error: 'Invalid messageId' });

    const existing = await prisma.taskChatMessage.findFirst({
      where: { id: messageId, taskId },
      select: { id: true, createdBy: true },
    });

    if (!existing) return res.status(404).json({ error: 'Message not found' });
    if (existing.createdBy !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    const { content, proposedLatex } = req.body || {};
    const updateData = {};

    if (typeof content === 'string') updateData.content = content;
    if (typeof proposedLatex === 'string') updateData.proposedLatex = proposedLatex;
    if (proposedLatex === null) updateData.proposedLatex = null;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updated = await prisma.taskChatMessage.update({
      where: { id: messageId },
      data: updateData,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating task chat message:', error);
    res.status(500).json({ error: 'Failed to update chat message' });
  }
});

router.delete('/:taskId/chat/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { taskId, messageId } = req.params;
    if (!isUuid(messageId)) return res.status(400).json({ error: 'Invalid messageId' });

    const existing = await prisma.taskChatMessage.findFirst({
      where: { id: messageId, taskId },
      select: { id: true, createdBy: true },
    });

    if (!existing) return res.status(404).json({ error: 'Message not found' });
    if (existing.createdBy !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    await prisma.taskChatMessage.delete({
      where: { id: messageId },
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting task chat message:', error);
    res.status(500).json({ error: 'Failed to delete chat message' });
  }
});

module.exports = router;
