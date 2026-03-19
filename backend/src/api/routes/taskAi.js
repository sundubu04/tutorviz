const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../../middleware/auth');

const { editLatex } = require('../services/openaiTaskEditor');

const router = express.Router();
const prisma = new PrismaClient();

const { isUuid } = require('../../utils/uuid');

router.post('/tasks/:taskId/ai/latex-edit', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { message, latexContent } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: "Missing or invalid 'message'" });
    }

    if (!isUuid(taskId)) {
      return res.status(400).json({ error: 'Invalid taskId (expected UUID)' });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, content: true, createdBy: true },
    });

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.createdBy !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    let currentLatex =
      typeof latexContent === 'string' && latexContent.trim() ? latexContent.trim() : task.content;

    if (!currentLatex.trim()) {
      return res
        .status(400)
        .json({ error: 'Missing LaTeX context (provide latexContent or ensure the task has content)' });
    }

    // Persist the user message first so it becomes part of the AI context.
    await prisma.taskChatMessage.create({
      data: {
        taskId,
        createdBy: req.user.id,
        role: 'user',
        content: message.trim(),
      },
    });

    const lastMessages = await prisma.taskChatMessage.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { role: true, content: true },
    });

    const history = lastMessages
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }));

    const aiResult = await editLatex({
      taskId,
      message,
      latexContent: currentLatex,
      history,
    });

    // Persist the assistant message and the proposed updated LaTeX.
    await prisma.taskChatMessage.create({
      data: {
        taskId,
        createdBy: req.user.id,
        role: 'assistant',
        content: aiResult.assistantMessage,
        proposedLatex: aiResult.updatedLatex,
      },
    });

    return res.json(aiResult);
  } catch (error) {
    console.error('AI latex-edit error:', error);
    return res.status(500).json({
      error: 'Failed to edit LaTeX with AI',
      message: error?.message || 'Internal server error',
    });
  }
});

module.exports = router;

