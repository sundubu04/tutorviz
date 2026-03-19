const MAX_LATEX_FOR_PROMPT_CHARS = 150_000;

function extractJsonObject(text) {
  // Handles models that accidentally wrap JSON in extra text.
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Model did not return a JSON object');
  }
  const jsonText = text.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonText);
}

async function editLatex({ taskId, message, latexContent, history }) {
  if (!process.env.OPENAI_API_KEY) {
    // Best-effort: load OPENAI_API_KEY from a local .env if present.
    // In Docker, compose should inject OPENAI_API_KEY as an environment variable.
    const fs = require('fs');
    const path = require('path');
    const dotenv = require('dotenv');

    const candidatePaths = [
      // When running from repo root / dev shell
      path.join(process.cwd(), '.env'),
      // When running from backend workspace (where __dirname is backend/src/api/services)
      path.join(__dirname, '../../../../.env'),
    ];

    for (const p of candidatePaths) {
      if (process.env.OPENAI_API_KEY) break;
      try {
        if (fs.existsSync(p)) {
          dotenv.config({ path: p });
        }
      } catch {
        // Ignore dotenv load issues; we re-check below.
      }
    }
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
  }
  // Lazy-load OpenAI so backend startup doesn't fail if the dependency isn't present
  // (or if the endpoint is never called).
  const OpenAI = require('openai');
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  if (!taskId) {
    throw new Error('taskId is required');
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new Error('message must be a non-empty string');
  }
  if (!latexContent || typeof latexContent !== 'string' || !latexContent.trim()) {
    throw new Error('latexContent must be a non-empty string');
  }

  if (latexContent.length > MAX_LATEX_FOR_PROMPT_CHARS) {
    throw new Error(`latexContent is too large for the AI prompt (max ${MAX_LATEX_FOR_PROMPT_CHARS} chars)`);
  }

  // Prefer a dedicated editor model, but fall back to the general OpenAI model.
  // Ultimately default to a known-good model to avoid "missing model parameter" errors.
  const model = process.env.OPENAI_MODEL || 'gpt-5.2';

  const systemPrompt = [
    'You are an AI assistant that edits a full LaTeX document for a specific task.',
    'You are given:',
    '- taskId (string)',
    '- currentLatex (the entire LaTeX source document)',
    '- userRequest (what the user wants changed)',
    '',
    'Return ONLY a single valid JSON object with exactly these keys:',
    '- assistantMessage: a short user-facing explanation of what you changed',
    '- updatedLatex: the full updated LaTeX source document',
    '',
    'Rules:',
    '- Do not return markdown. Do not include code fences.',
    '- updatedLatex must be complete LaTeX source (not a diff).',
    '- Preserve the document structure unless the user requests otherwise.',
  ].join('\n');

  // MVP: include history best-effort, but always provide currentLatex explicitly.
  const historyMessages = Array.isArray(history) && history.length > 0
    ? history
        .slice(-10)
        .filter((m) => m && typeof m.content === 'string')
        .map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }))
    : [];

  const userPrompt = [
    `taskId: ${taskId}`,
    '',
    'currentLatex:',
    latexContent,
    '',
    `userRequest: ${message.trim()}`,
  ].join('\n');

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: userPrompt },
    ],
  });

  const content = completion?.choices?.[0]?.message?.content || '';
  const parsed = extractJsonObject(content);

  if (typeof parsed.assistantMessage !== 'string' || typeof parsed.updatedLatex !== 'string') {
    throw new Error('Returned JSON did not include { assistantMessage, updatedLatex } strings');
  }

  return {
    assistantMessage: parsed.assistantMessage.slice(0, 2000),
    updatedLatex: parsed.updatedLatex,
  };
}

module.exports = { editLatex };

