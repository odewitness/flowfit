import { sb, DB } from './supabase.js';

// ── State (initialisé depuis le cache local, écrasé par Supabase au login) ──
export let state = {
  workouts:      DB.get('ff_workouts', []),
  sessions:      DB.get('ff_sessions', []),
  cycle:         DB.get('ff_cycle', null),
  logs:          DB.get('ff_logs', {}),
  health:        Object.assign({ weight: [], temperature: [], measurements: [] }, DB.get('ff_health', {})),
  videos:        DB.get('ff_videos', []),
  planning:      DB.get('ff_planning', {}),
  periodHistory: DB.get('ff_period_history', []),
  pas:           DB.get('ff_pas', {}),
  pasGoal:       DB.get('ff_pas_goal', 10000),
  challenges:    DB.get('ff_challenges', []),
};

export let _currentUserId = null;
export function setCurrentUserId(id) { _currentUserId = id; }
export function setState(newState) { Object.assign(state, newState); }

let _saveTimeout = null;

// ── Sync indicator ──
export function setSyncStatus(s) {
  const el = document.getElementById('sync-indicator');
  if (!el) return;
  el.className = '';
  el.classList.add(s);
  if (s === 'syncing')     el.textContent = '⟳';
  else if (s === 'saved')  el.textContent = '✓';
  else                     el.textContent = '!';
}

// ── Save : écrit dans Supabase + cache local ──
export async function save() {
  // Cache local toujours mis à jour (offline-first)
  DB.set('ff_workouts',       state.workouts);
  DB.set('ff_sessions',       state.sessions);
  DB.set('ff_cycle',          state.cycle);
  DB.set('ff_logs',           state.logs);
  DB.set('ff_health',         state.health);
  DB.set('ff_videos',         state.videos);
  DB.set('ff_planning',       state.planning || {});
  DB.set('ff_period_history', state.periodHistory || []);
  DB.set('ff_pas',            state.pas || {});
  DB.set('ff_pas_goal',       state.pasGoal || 10000);
  DB.set('ff_challenges',     state.challenges || []);

  if (!_currentUserId) return; // pas connecté, on s'arrête là

  // Debounce : on attend 800ms d'inactivité avant d'écrire en BDD
  clearTimeout(_saveTimeout);
  setSyncStatus('syncing');
  _saveTimeout = setTimeout(async () => {
    try {
      const { error } = await sb.from('user_data').upsert({
        user_id:        _currentUserId,
        workouts:       state.workouts,
        sessions:       state.sessions,
        cycle:          state.cycle,
        logs:           state.logs,
        health:         state.health,
        videos:         state.videos,
        planning:       state.planning || {},
        period_history: state.periodHistory || [],
        pas:            state.pas || {},
        pas_goal:       state.pasGoal || 10000,
        challenges:     state.challenges || [],
        updated_at:     new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (error) throw error;
      setSyncStatus('saved');
    } catch (e) {
      console.error('Supabase save error:', e);
      setSyncStatus('error');
      showToast('⚠️ Erreur de synchronisation');
    }
  }, 800);
}

// ── Load depuis Supabase ──
export async function loadFromSupabase(userId) {
  try {
    const { data, error } = await sb.from('user_data').select('*').eq('user_id', userId).single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    if (data) {
      state.workouts      = data.workouts || [];
      state.sessions      = data.sessions || [];
      state.cycle         = data.cycle || null;
      state.logs          = data.logs || {};
      state.health        = Object.assign({ weight: [], temperature: [], measurements: [] }, data.health || {});
      state.videos        = data.videos || [];
      state.planning      = data.planning || {};
      state.periodHistory = data.period_history || [];
      state.pas           = data.pas || {};
      state.pasGoal       = data.pas_goal || 10000;
      state.challenges    = data.challenges || [];
      // Met à jour le cache local avec les données du serveur
      DB.set('ff_workouts',       state.workouts);
      DB.set('ff_sessions',       state.sessions);
      DB.set('ff_cycle',          state.cycle);
      DB.set('ff_logs',           state.logs);
      DB.set('ff_health',         state.health);
      DB.set('ff_videos',         state.videos);
      DB.set('ff_planning',       state.planning);
      DB.set('ff_period_history', state.periodHistory);
      DB.set('ff_pas',            state.pas);
      DB.set('ff_pas_goal',       state.pasGoal);
      DB.set('ff_challenges',     state.challenges);
    } else {
      // Nouvel utilisateur : BDD vide, on ne pousse rien
      setSyncStatus('saved');
    }
  } catch (e) {
    console.error('Supabase load error:', e);
    showToast('⚠️ Chargement depuis le cache local');
  }
}
