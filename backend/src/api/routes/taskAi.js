const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../../middleware/auth');

const { editLatex } = require('../services/openaiTaskEditor');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/tasks/:taskId/ai/latex-edit', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { message, latexContent, history } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: "Missing or invalid 'message'" });
    }

    let currentLatex = typeof latexContent === 'string' ? latexContent : '';

    // Fallback: attempt to load LaTeX from DB if the client didn't send it.
    if (!currentLatex.trim()) {
      try {
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        currentLatex = task?.content || '';
      } catch (e) {
        // Most commonly: taskId isn't a valid UUID (e.g. demo task IDs).
        currentLatex = '';
      }
    }

    if (!currentLatex.trim()) {
      return res.status(400).json({ error: 'Missing LaTeX context (provide latexContent or create a valid taskId)' });
    }

    const aiResult = await editLatex({
      taskId,
      message,
      latexContent: currentLatex,
      history,
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

