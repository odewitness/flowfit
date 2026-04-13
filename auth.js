import { sb, DB } from './supabase.js';
import { state, setState, setCurrentUserId, setSyncStatus, loadFromSupabase } from './state.js';
import { showToast } from './utils.js';
import { renderHome } from './screens/home.js';

let _authTab = 'login';

export function switchAuthTab(tab) {
  _authTab = tab;
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('auth-confirm-field').style.display = tab === 'signup' ? '' : 'none';
  document.getElementById('auth-firstname-field').style.display = tab === 'signup' ? '' : 'none';
  document.getElementById('auth-submit-btn').textContent = tab === 'login' ? 'Se connecter' : 'Créer mon compte';
  document.getElementById('auth-footer-reset').style.display = tab === 'login' ? '' : 'none';
  document.getElementById('auth-error').classList.remove('show');
}

export function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.add('show');
}

export async function handleAuth() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  document.getElementById('auth-error').classList.remove('show');
  if (!email || !password) { showAuthError('Remplis tous les champs.'); return; }

  if (_authTab === 'signup') {
    const confirm = document.getElementById('auth-confirm').value;
    if (password !== confirm) { showAuthError('Les mots de passe ne correspondent pas.'); return; }
    if (password.length < 6) { showAuthError('Mot de passe trop court (6 caractères min).'); return; }
    const { error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { firstname: document.getElementById('auth-firstname').value.trim() } }
    });
    if (error) { showAuthError(error.message); return; }
    showAuthError('✅ Vérifie ton email pour confirmer ton compte.');
    document.getElementById('auth-error').style.background = 'var(--menthe-lt)';
    document.getElementById('auth-error').style.color = 'var(--menthe)';
    document.getElementById('auth-error').style.borderColor = 'rgba(126,200,184,.3)';
  } else {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { showAuthError('Email ou mot de passe incorrect.'); return; }
    await onAuthSuccess(data.user);
  }
}

export async function handleForgotPassword() {
  const email = document.getElementById('auth-email').value.trim();
  if (!email) { showAuthError('Entre ton email d\'abord.'); return; }
  const { error } = await sb.auth.resetPasswordForEmail(email);
  if (error) { showAuthError(error.message); return; }
  showAuthError('✅ Email de réinitialisation envoyé !');
}

export async function handleLogout() {
  closeBurger();
  await sb.auth.signOut();
  setCurrentUserId(null);
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-password').value = '';
  setSyncStatus('saved');
  showToast('👋 Déconnectée');
}

export async function onAuthSuccess(user) {
  setCurrentUserId(user.id);
  let firstname = user.user_metadata?.firstname || DB.get('ff_firstname', '');
  document.getElementById('burger-user-email').textContent = user.email;
  document.getElementById('burger-user-label').textContent = firstname ? `Bonjour ${firstname} 🌸` : 'Compte connecté';
  document.getElementById('auth-screen').classList.add('hidden');
  setSyncStatus('syncing');

  // Réinitialise le state et le cache local avant de charger
  setState({
    workouts: [], sessions: [], cycle: null, logs: {},
    health: { weight: [], temperature: [], measurements: [] },
    videos: [], planning: {}, periodHistory: [], pas: {}, pasGoal: 10000,
  });
  ['ff_workouts','ff_sessions','ff_cycle','ff_logs',
   'ff_health','ff_videos','ff_planning','ff_period_history','ff_pas','ff_pas_goal']
    .forEach(k => localStorage.removeItem(k));

  if (firstname) DB.set('ff_firstname', firstname);

  await loadFromSupabase(user.id);
  setSyncStatus('saved');
  renderHome();
}

export async function initApp() {
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    await onAuthSuccess(session.user);
  }
  sb.auth.onAuthStateChange(async (event, session) => {
    // Import here to avoid circular dependency at load time
    const { _currentUserId } = await import('./state.js');
    if (event === 'SIGNED_IN' && session?.user && !_currentUserId) {
      await onAuthSuccess(session.user);
    }
    if (event === 'SIGNED_OUT') {
      setCurrentUserId(null);
    }
  });
}
