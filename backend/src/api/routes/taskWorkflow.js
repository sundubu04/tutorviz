const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../../middleware/auth');
const { isUuid } = require('../../utils/uuid');
const { indexOfSseEventBoundary, parseSseEventBlock, sseFrameSeparator } = require('../../utils/sseParse');
const { startWorkflow, streamWorkflow } = require('../services/langgraphClient');

const router = express.Router();
const prisma = new PrismaClient();

async function requireOwnedTask(taskId, userId) {
  if (!isUuid(taskId)) return { status: 400, error: 'Invalid taskId (expected UUID)' };
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, createdBy: true, content: true },
  });
  if (!task) return { status: 404, error: 'Task not found' };
  if (task.createdBy !== userId) return { status: 403, error: 'Access denied' };
  return { status: 200, task };
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

router.post('/tasks/:taskId/ai/workflow/start', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { message, latexContent } = req.body || {};
    console.log('[workflow] start', { taskId, userId: req.user?.id });

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: "Missing or invalid 'message'" });
    }

    const ownership = await requireOwnedTask(taskId, req.user.id);
    if (ownership.status !== 200) return res.status(ownership.status).json({ error: ownership.error });

    await prisma.taskChatMessage.create({
      data: {
        taskId,
        createdBy: req.user.id,
        role: 'user',
        content: message.trim(),
      },
    });

    const currentLatex =
      typeof latexContent === 'string' && latexContent.trim()
        ? latexContent.trim()
        : ownership.task.content || '';

    const lastMessages = await prisma.taskChatMessage.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { role: true, content: true },
    });
    const history = lastMessages.reverse().map((m) => ({ role: m.role, content: m.content }));

    const started = await startWorkflow({
      taskId,
      message: message.trim(),
      latexContent: currentLatex,
      history,
    });
    return res.json(started);
  } catch (error) {
    console.error('Workflow start error:', error);
    return res.status(500).json({ error: 'Failed to start workflow', message: error?.message || 'Internal error' });
  }
});

router.get('/tasks/:taskId/ai/workflow/stream/:workflowRunId', authenticateToken, async (req, res) => {
  const { taskId, workflowRunId } = req.params;
  console.log('[workflow] stream', { taskId, workflowRunId, userId: req.user?.id });
  const ownership = await requireOwnedTask(taskId, req.user.id);
  if (ownership.status !== 200) return res.status(ownership.status).json({ error: ownership.error });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const controller = new AbortController();
  req.on('close', () => controller.abort());

  try {
    const upstream = await streamWorkflow({ workflowRunId, signal: controller.signal });

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';

    const persistIfNeeded = async (evtName, dataStr) => {
      if (evtName !== 'latex_proposed') return;
      const obj = safeJsonParse(dataStr);
      if (!obj || obj.type !== 'workflow_event') return;

      const content = JSON.stringify(obj);
      const proposedLatex =
        obj?.payload?.updatedLatex && typeof obj.payload.updatedLatex === 'string'
          ? obj.payload.updatedLatex
          : null;

      await prisma.taskChatMessage.create({
        data: {
          taskId,
          createdBy: req.user.id,
          role: 'assistant',
          content,
          proposedLatex,
        },
      });
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary;
      while ((boundary = indexOfSseEventBoundary(buffer))) {
        const { idx, sepLen } = boundary;
        const rawEvent = buffer.slice(0, idx);
        buffer = buffer.slice(idx + sepLen);

        res.write(rawEvent + sseFrameSeparator(sepLen));

        const { evtName, dataStr } = parseSseEventBlock(rawEvent);
        if (dataStr) {
          void persistIfNeeded(evtName, dataStr);
        }
      }
    }
  } catch (error) {
    console.error('Workflow stream proxy error:', error);
    res.write(`event: error\ndata: ${JSON.stringify({ error: 'stream_failed', message: error?.message || 'unknown' })}\n\n`);
  } finally {
    res.end();
  }
});

module.exports = router;
