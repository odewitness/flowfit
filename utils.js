import { state } from './state.js';

// ── Exercise library ──
export const EXERCISE_LIBRARY = {
  'Jambes & Fessiers': ['Squat', 'Squat sumo', 'Fentes avant', 'Fentes latérales', 'Hip thrust', 'Romanian deadlift', 'Leg press', 'Leg extension', 'Leg curl', 'Mollets debout', 'Step-up', 'Glute bridge', 'Donkey kicks', 'Fire hydrant', 'Abduction machine'],
  'Dos':               ['Tractions', 'Tirage horizontal', 'Tirage vertical', 'Rowing barre', 'Rowing haltère', 'Deadlift', 'Hyperextensions', 'Face pull', 'Shrugs', 'Tirage poulie basse'],
  'Poitrine':          ['Développé couché barre', 'Développé couché haltères', 'Développé incliné', 'Écarté haltères', 'Écarté poulie', 'Pompes', 'Dips poitrine'],
  'Épaules':           ['Développé militaire', 'Développé Arnold', 'Élévations latérales', 'Élévations frontales', 'Oiseau', 'Upright row', 'Face pull épaules'],
  'Bras':              ['Curl biceps barre', 'Curl biceps haltères', 'Hammer curls', 'Curl concentré', 'Curl poulie', 'Extensions triceps poulie', 'Dips triceps', 'Overhead triceps', 'Skull crusher', 'Kickback triceps'],
  'Abdominaux':        ['Crunchs', 'Planche', 'Relevés de jambes', 'Russian twist', 'Ab wheel', 'Mountain climbers', 'Bicycle crunch', 'Gainage latéral'],
  'Cardio & Full body':['Burpees', 'Jumping jacks', 'Jump rope', 'Box jump', 'Kettlebell swing', 'Thrusters', 'Clean and press', 'Rowing machine', 'Vélo elliptique', 'Tapis de course'],
};

// ── Phases ──
export const PHASES = {
  mens:         { label: 'Règles',      cls: 'pill-mens',         color: '#d4827a', advice: 'Repose-toi. Yoga doux, étirements, marche légère.',                   emoji: '🌊' },
  folliculaire: { label: 'Folliculaire', cls: 'pill-folliculaire', color: '#b89fd4', advice: 'Énergie montante ! Idéal pour la force et les nouveaux défis.',       emoji: '🌱' },
  ovulation:    { label: 'Ovulation',   cls: 'pill-ovulation',    color: '#7ec8b8', advice: 'Pic d\'énergie ! HIIT, cardio intense, records personnels.',            emoji: '⚡' },
  luteale:      { label: 'Lutéale',     cls: 'pill-luteale',      color: '#d4aa6a', advice: 'Énergie décroissante. Pilates, yoga, entraînement modéré.',             emoji: '🍂' },
};

// ── Date helpers ──
export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

// ── HTML escape ──
export function escHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ── Phase calculator ──
export function getPhaseForDate(ds) {
  if (!state.cycle) return null;
  const { cycleLen, rulesLen } = state.cycle;
  const allStarts = [state.cycle.lastDate, ...(state.periodHistory || [])].filter(Boolean);
  const target = new Date(ds);
  let refDate = null;
  allStarts.forEach(d => {
    const dt = new Date(d);
    if (dt <= target) {
      if (!refDate || dt > new Date(refDate)) refDate = d;
    }
  });
  if (!refDate) return null;
  const diff = new Date(ds) - new Date(refDate);
  if (diff < 0) return null;
  const day = Math.floor(diff / 86400000) % cycleLen + 1;
  const ov = Math.round(cycleLen / 2);
  if (day <= rulesLen)    return 'mens';
  if (day <= ov - 2)      return 'folliculaire';
  if (day <= ov + 1)      return 'ovulation';
  return 'luteale';
}

// ── Toast ──
let _toastTimeout;
export function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimeout);
  _toastTimeout = setTimeout(() => el.classList.remove('show'), 2500);
}

// ── Modal ──
export function openModal(title, bodyHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').classList.add('open');
}

export function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.remove('open');
}

// ── YouTube helpers ──
export function ytVideoId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&\n]+)/);
  return m ? m[1] : null;
}
export function ytThumb(id) {
  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
}
