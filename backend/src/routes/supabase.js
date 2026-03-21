const express = require('express');
const router = express.Router();

// Public-only config for initializing the Supabase JS client in the browser.
// Never expose the service role key to the client.
router.get('/config', (req, res) => {
  // The backend may run in Docker; for the browser we need a URL that is resolvable from the host.
  const supabaseUrlRaw =
    (process.env.SUPABASE_BROWSER_URL || process.env.SUPABASE_URL)?.trim() || '';
  const anonKey = (process.env.SUPABASE_ANON_KEY || '').trim();

  // If the backend is configured with a Docker-only hostname, rewrite it for the browser.
  const supabaseUrl = supabaseUrlRaw.replace('host.docker.internal', 'localhost');

  const siteUrl = (
    process.env.PUBLIC_APP_URL ||
    process.env.CORS_ORIGIN ||
    ''
  )
    .trim()
    .replace(/\/$/, '');

  if (!supabaseUrl || !anonKey) {
    return res.status(500).json({
      error: 'Supabase config missing',
      message: 'SUPABASE_URL and SUPABASE_ANON_KEY must be configured in the environment.'
    });
  }

  res.json({ url: supabaseUrl, anonKey, siteUrl: siteUrl || undefined });
});

module.exports = router;

