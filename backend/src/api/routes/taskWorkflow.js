const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../../middleware/auth');
const { isUuid } = require('../../utils/uuid');
const { startWorkflow, approveWorkflow, streamWorkflow } = require('../services/langgraphClient');

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

// Start a workflow run: persists the user message, then starts Python workflow.
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

    // Persist user message in chat history (console can render it uniformly).
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

    const started = await startWorkflow({ taskId, message: message.trim(), latexContent: currentLatex });
    return res.json(started);
  } catch (error) {
    console.error('Workflow start error:', error);
    return res.status(500).json({ error: 'Failed to start workflow', message: error?.message || 'Internal error' });
  }
});

// Approve / reject a checkpoint (MVP: plan approval).
router.post('/tasks/:taskId/ai/workflow/approve', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { workflowRunId, checkpointId, approved, edits } = req.body || {};

    if (typeof workflowRunId !== 'string' || !workflowRunId.trim()) {
      return res.status(400).json({ error: "Missing or invalid 'workflowRunId'" });
    }
    if (typeof checkpointId !== 'string' || !checkpointId.trim()) {
      return res.status(400).json({ error: "Missing or invalid 'checkpointId'" });
    }
    if (typeof approved !== 'boolean') {
      return res.status(400).json({ error: "Missing or invalid 'approved' (expected boolean)" });
    }

    const ownership = await requireOwnedTask(taskId, req.user.id);
    if (ownership.status !== 200) return res.status(ownership.status).json({ error: ownership.error });

    const result = await approveWorkflow({
      workflowRunId: workflowRunId.trim(),
      checkpointId: checkpointId.trim(),
      approved,
      edits: edits && typeof edits === 'object' ? edits : undefined,
    });

    return res.json(result);
  } catch (error) {
    console.error('Workflow approve error:', error);
    return res.status(500).json({ error: 'Failed to approve workflow', message: error?.message || 'Internal error' });
  }
});

// Proxy SSE from Python service and optionally persist selected events as assistant messages.
router.get('/tasks/:taskId/ai/workflow/stream/:workflowRunId', authenticateToken, async (req, res) => {
  const { taskId, workflowRunId } = req.params;
  console.log('[workflow] stream', { taskId, workflowRunId, userId: req.user?.id });
  const ownership = await requireOwnedTask(taskId, req.user.id);
  if (ownership.status !== 200) return res.status(ownership.status).json({ error: ownership.error });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const controller = new AbortController();
  req.on('close', () => controller.abort());

  try {
    const upstream = await streamWorkflow({ workflowRunId, signal: controller.signal });

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';

    const persistIfNeeded = async (evtName, dataStr) => {
      // Only persist high-signal events; the UI will still receive everything live.
      if (!['classified', 'plan_proposed', 'web_search_results', 'latex_proposed'].includes(evtName)) return;
      const obj = safeJsonParse(dataStr);
      if (!obj || obj.type !== 'workflow_event') return;

      const content = JSON.stringify(obj);
      const proposedLatex =
        evtName === 'latex_proposed' && obj?.payload?.updatedLatex && typeof obj.payload.updatedLatex === 'string'
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

    // Minimal SSE parse loop: looks for `event:` + `data:` blocks.
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by a blank line.
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        // Forward upstream event block as-is.
        res.write(rawEvent + '\n\n');

        // Extract event name + data for persistence.
        let evtName = 'message';
        let dataStr = '';
        for (const line of rawEvent.split('\n')) {
          if (line.startsWith('event:')) evtName = line.slice('event:'.length).trim();
          if (line.startsWith('data:')) dataStr += line.slice('data:'.length).trim();
        }
        if (dataStr) {
          // Fire and forget persistence to avoid blocking the stream.
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

