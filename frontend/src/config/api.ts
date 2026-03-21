/**
 * Build-time API base (CRA): `/api` in production (same-origin via nginx) or full URL in dev.
 * Override with REACT_APP_API_BASE, e.g. http://localhost:5001/api
 */
export function getApiBase(): string {
  const fromEnv = process.env.REACT_APP_API_BASE?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return 'http://localhost:5001/api';
}

/**
 * Origin for URLs like `${origin}/api/...`. Empty = relative (same host as the SPA).
 */
export function getBackendOriginForConfig(): string {
  const explicit =
    process.env.REACT_APP_BACKEND_URL?.trim() || process.env.REACT_APP_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const base = getApiBase();
  if (base.startsWith('http://') || base.startsWith('https://')) {
    try {
      return new URL(base).origin;
    } catch {
      return 'http://localhost:5001';
    }
  }
  return '';
}

/** Public browser origin for Supabase emailRedirectTo; backend can override via /api/supabase/config `siteUrl`. */
export function getPublicAppOriginFromEnv(): string {
  const fromEnv = process.env.REACT_APP_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin.replace(/\/$/, '');
  return 'http://localhost:3000';
}
