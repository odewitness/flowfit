// ── ⚙️ CONFIGURATION SUPABASE ─────────────────────────────────────────────
// Remplace ces deux valeurs par celles de ton projet Supabase
// (Settings → API dans le dashboard Supabase)
const SUPABASE_URL = 'https://ycedpogtlfgbpbvnuexz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZWRwb2d0bGZnYnBidm51ZXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5ODQwNDUsImV4cCI6MjA5MTU2MDA0NX0.xj1fGWEsRw--EX-KtuNDJaL0TiuDdusE5MyXuTZxIXE';
// ──────────────────────────────────────────────────────────────────────────

const { createClient } = supabase;
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── LocalStorage fallback (cache offline) ──
export const DB = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    } catch {
      return d;
    }
  },
  set(k, v) {
    localStorage.setItem(k, JSON.stringify(v));
  },
};
