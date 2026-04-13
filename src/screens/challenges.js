import { state } from '../state.js';
import { save } from '../state.js';
import { todayStr, escHtml, showToast, openModal, getPhaseForDate } from '../utils.js';
import { renderHome } from './home.js';

export const CHALLENGE_MOTIVATIONS = [
  "Tu es une machine ! 💪", "Continue, tu es à mi-chemin ! 🔥", "Chaque jour compte ! ⚡",
  "Tu es plus forte que tu ne le crois ! 🌟", "La régularité, c'est ta superpuissance ! 🚀",
  "Pas de génie sans effort quotidien ! 💎", "Tu ne regretteras jamais une séance faite ! ✨",
  "La discipline surpasse la motivation ! 🏆", "Regarde ton streak, tu déchires ! 🔥",
  "Un jour à la fois, une victoire à la fois ! 🌸"
];

// Expose helpers on window for home.js renderHomeChallenges
window._CHALLENGE_MOTIVATIONS = CHALLENGE_MOTIVATIONS;
window._challengeHelpers = { getChallengeCompleted, getChallengeStreak, getChallengeRemaining, isChallengeToday };

export function getChallengeStreak(ch) {
  const logs = ch.logs || {}; let streak = 0; const d = new Date();
  while (true) { const ds = d.toISOString().slice(0, 10); if (logs[ds]?.done) streak++; else break; d.setDate(d.getDate() - 1); }
  return streak;
}
export function getChallengeCompleted(ch) { return Object.values(ch.logs || {}).filter(l => l.done).length; }
export function getChallengeRemaining(ch) {
  const start = new Date(ch.startDate), end = new Date(start); end.setDate(end.getDate() + ch.totalDays - 1);
  return Math.max(0, Math.ceil((end - new Date(todayStr())) / 86400000));
}
export function isChallengeToday(ch) { return !!(ch.logs && ch.logs[todayStr()]?.done); }

export function renderChallengesScreen() {
  const el = document.getElementById('challenges-list'); if (!el) return;
  const chs = state.challenges || [];
  if (!chs.length) {
    el.innerHTML = `<div class="card" style="text-align:center;color:var(--text2);padding:24px 16px;">
      <div style="font-size:36px;margin-bottom:10px;">🏆</div>
      <div style="font-size:15px;font-weight:600;margin-bottom:6px;">Aucun défi en cours</div>
      <div style="font-size:13px;">Lance un défi quotidien pour booster ta régularité !</div>
    </div>`; return;
  }
  const active = chs.filter(c => c.active && !c.archived), archived = chs.filter(c => c.archived);
  let html = '';
  if (active.length) html += active.map(ch => challengeCard(ch)).join('');
  if (archived.length) html += `<div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text3);margin:16px 0 8px;">Archivés</div>` + archived.map(ch => challengeCard(ch, true)).join('');
  el.innerHTML = html;
}

function challengeCard(ch, archived = false) {
  const completed = getChallengeCompleted(ch), pct = Math.min(100, Math.round((completed / ch.totalDays) * 100));
  const streak = getChallengeStreak(ch), remaining = getChallengeRemaining(ch), doneToday = isChallengeToday(ch);
  const typeIcon = ch.type === 'timer' ? '⏱' : '💪';
  const targetLabel = ch.type === 'timer'
    ? `${Math.floor(ch.targetValue / 60) ? Math.floor(ch.targetValue / 60) + 'min ' : ''}${ch.targetValue % 60 ? ch.targetValue % 60 + 's' : ''}`
    : `${ch.targetValue} ${ch.unit || 'reps'}`;
  return `<div class="card" style="${archived ? 'opacity:.6;' : ''}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <div style="font-size:15px;font-weight:700;">${typeIcon} ${escHtml(ch.name)}</div>
      <div style="display:flex;align-items:center;gap:6px;">
        ${streak > 0 ? `<span style="font-size:11px;font-weight:700;color:var(--peche);">🔥 ${streak}j</span>` : ''}
        ${doneToday ? `<span style="font-size:11px;font-weight:700;color:var(--menthe);">✓ Fait !</span>` : remaining > 0 ? `<span style="font-size:11px;color:var(--text3);">${remaining}j restants</span>` : ''}
      </div>
    </div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:8px;">${targetLabel} · ${completed}/${ch.totalDays} jours · ${pct}%</div>
    <div class="challenge-progress-bar" style="height:6px;background:var(--bg3);border-radius:20px;overflow:hidden;margin-bottom:12px;">
      <div class="challenge-progress-fill" style="width:${pct}%;height:100%;background:linear-gradient(90deg,var(--rose),var(--lilas));border-radius:20px;transition:width .4s;"></div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      ${!archived && !doneToday && remaining > 0 ? `<button class="btn btn-primary btn-sm" style="flex:1;" onclick="openChallengeSession('${ch.id}')">▶ Faire le défi</button>` : ''}
      ${!archived ? `<label class="toggle-switch" title="${ch.active ? 'Désactiver' : 'Activer'}"><input type="checkbox" ${ch.active ? 'checked' : ''} onchange="toggleChallengeActive('${ch.id}',this.checked)"/><span class="toggle-slider"></span></label>` : ''}
      ${!archived && completed >= ch.totalDays ? `<button class="btn btn-ghost btn-sm" onclick="archiveChallenge('${ch.id}')" style="width:auto;padding:8px 12px;">📦</button>` : ''}
      <button class="btn btn-ghost btn-sm" onclick="deleteChallenge('${ch.id}')" style="color:var(--rouge);border-color:rgba(212,130,122,.25);width:auto;padding:8px 12px;">🗑</button>
    </div>
  </div>`;
}

export function toggleChallengeActive(id, val) {
  const ch = (state.challenges || []).find(c => c.id === id); if (!ch) return;
  ch.active = val; save(); renderChallengesScreen(); renderHome();
  showToast(val ? '✅ Défi activé — affiché sur l\'accueil !' : '⏸ Défi désactivé');
}
export function deleteChallenge(id) {
  if (!confirm('Supprimer ce défi ?')) return;
  state.challenges = (state.challenges || []).filter(c => c.id !== id);
  save(); renderChallengesScreen(); renderHome(); showToast('🗑 Défi supprimé');
}
export function archiveChallenge(id) {
  const ch = (state.challenges || []).find(c => c.id === id); if (!ch) return;
  ch.active = false; ch.archived = true; save(); renderChallengesScreen(); renderHome(); showToast('📦 Défi archivé !');
}

export function openNewChallenge() {
  openModal('🏆 Nouveau défi', `
    <div class="field"><label>Nom du défi</label><input id="ch-name" placeholder="Ex: 3 min de planche par jour"/></div>
    <div class="field"><label>Type d'exercice</label>
      <div style="display:flex;gap:8px;margin-top:4px;">
        <div id="ch-type-timer" class="mode-opt active" style="flex:1;" onclick="selectChallengeType('timer')">⏱ Durée<br><span style="font-size:10px;font-weight:400;">Planche, gainage…</span></div>
        <div id="ch-type-reps" class="mode-opt" style="flex:1;" onclick="selectChallengeType('reps')">💪 Répétitions<br><span style="font-size:10px;font-weight:400;">Squats, pompes…</span></div>
      </div>
    </div>
    <div class="field" id="ch-val-field"><label id="ch-val-label">Durée cible (secondes)</label><input id="ch-val" type="number" min="1" placeholder="180" inputmode="numeric"/></div>
    <div class="field" id="ch-unit-field" style="display:none;"><label>Unité</label><input id="ch-unit" placeholder="reps" value="reps"/></div>
    <div class="field"><label>Durée du défi (jours)</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
        <button class="btn btn-ghost btn-sm" onclick="setChallengedays(7)">7 jours</button>
        <button class="btn btn-ghost btn-sm" onclick="setChallengedays(21)">21 jours</button>
        <button class="btn btn-ghost btn-sm" onclick="setChallengedays(30)">30 jours</button>
        <button class="btn btn-ghost btn-sm" onclick="setChallengedays(60)">60 jours</button>
      </div>
      <input id="ch-days" type="number" min="1" max="365" placeholder="30" inputmode="numeric"/>
    </div>
    <div style="margin-bottom:16px;padding:12px 14px;background:var(--lilas-lt);border-radius:var(--radius-sm);border:1px solid rgba(184,159,212,.3);">
      <div style="font-size:10px;font-weight:700;color:var(--lilas);letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px;">💡 Idées de défis</div>
      <div style="font-size:12px;color:var(--text2);line-height:1.7;">⏱ 1 min de planche · 3 min de gainage · 5 min de méditation<br>💪 50 squats · 20 pompes · 100 jumping jacks · 30 abdos</div>
    </div>
    <button class="btn btn-primary" onclick="saveNewChallenge()">🏆 Créer le défi</button>`);
  window._challengeType = 'timer';
}

export function selectChallengeType(t) {
  window._challengeType = t;
  document.getElementById('ch-type-timer')?.classList.toggle('active', t === 'timer');
  document.getElementById('ch-type-reps')?.classList.toggle('active', t === 'reps');
  const valLabel = document.getElementById('ch-val-label');
  const unitField = document.getElementById('ch-unit-field');
  if (valLabel) valLabel.textContent = t === 'timer' ? 'Durée cible (secondes)' : 'Nombre de répétitions';
  if (unitField) unitField.style.display = t === 'reps' ? '' : 'none';
  document.getElementById('ch-val').placeholder = t === 'timer' ? '180' : '50';
}

export function setChallengedays(n) { const el = document.getElementById('ch-days'); if (el) el.value = n; }

export function saveNewChallenge() {
  const name = document.getElementById('ch-name')?.value?.trim(); if (!name) { showToast('❌ Donne un nom au défi'); return; }
  const targetValue = parseInt(document.getElementById('ch-val')?.value); if (!targetValue || targetValue < 1) { showToast('❌ Valeur cible invalide'); return; }
  const totalDays = parseInt(document.getElementById('ch-days')?.value) || 30; if (totalDays < 1) { showToast('❌ Durée invalide'); return; }
  const type = window._challengeType || 'timer';
  const unit = type === 'reps' ? (document.getElementById('ch-unit')?.value?.trim() || 'reps') : 'sec';
  const ch = { id: Date.now().toString(), name, type, targetValue, totalDays, unit, active: true, startDate: todayStr(), createdAt: todayStr(), logs: {} };
  if (!state.challenges) state.challenges = [];
  state.challenges.push(ch); save();
  document.getElementById('modal-overlay').classList.remove('open');
  renderChallengesScreen(); renderHome(); showToast('🏆 Défi créé et activé !');
}

// ── Challenge session ──
let _activeChallengeId = null, _challengeChronoInterval = null, _challengeElapsed = 0, _challengeRepsDone = 0, _challengeTimerRunning = false;

export function openChallengeSession(id) {
  const ch = (state.challenges || []).find(c => c.id === id); if (!ch) return;
  _activeChallengeId = id; _challengeElapsed = 0; _challengeRepsDone = 0; _challengeTimerRunning = false;
  clearInterval(_challengeChronoInterval);
  const motiv = CHALLENGE_MOTIVATIONS[Math.floor(Math.random() * CHALLENGE_MOTIVATIONS.length)];
  const streak = getChallengeStreak(ch), remaining = getChallengeRemaining(ch);
  const streakHtml = streak > 0 ? `<div style="text-align:center;margin-bottom:8px;"><span class="challenge-streak" style="font-size:14px;">🔥 Streak : ${streak} jour${streak > 1 ? 's' : ''} consécutifs !</span></div>` : '';

  if (ch.type === 'timer') {
    const targetMin = Math.floor(ch.targetValue / 60), targetSec = ch.targetValue % 60;
    const targetStr = targetMin > 0 ? `${targetMin}min${targetSec ? targetSec + 's' : ''}` : `${ch.targetValue}s`;
    openModal(`⏱ ${escHtml(ch.name)}`, `
      ${streakHtml}
      <div style="text-align:center;margin-bottom:6px;font-size:13px;color:var(--text2);">${motiv}</div>
      <div style="text-align:center;font-size:12px;color:var(--text3);margin-bottom:12px;">Objectif : ${targetStr} · Il reste ${remaining} jour${remaining > 1 ? 's' : ''}</div>
      <div class="challenge-timer-display" id="ch-timer-disp">00:00</div>
      <div style="text-align:center;margin-bottom:16px;">
        <div style="background:var(--bg3);border-radius:20px;height:8px;overflow:hidden;max-width:260px;margin:8px auto 4px;">
          <div id="ch-timer-bar" style="background:linear-gradient(90deg,var(--lilas),var(--rose));height:100%;border-radius:20px;width:0%;transition:width .5s;"></div>
        </div>
        <div style="font-size:11px;color:var(--text3);" id="ch-timer-lbl">0 / ${ch.targetValue}s</div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <button class="btn btn-primary" id="ch-start-btn" style="flex:1;" onclick="challengeTimerToggle()">▶ Démarrer</button>
        <button class="btn btn-ghost btn-sm" onclick="challengeTimerReset()" style="width:auto;padding:8px 14px;">↺</button>
      </div>
      <button class="btn btn-ghost" style="margin-top:4px;" onclick="completeChallengeSession(false)">✓ Valider sans minuteur</button>`);
  } else {
    openModal(`💪 ${escHtml(ch.name)}`, `
      ${streakHtml}
      <div style="text-align:center;margin-bottom:6px;font-size:13px;color:var(--text2);">${motiv}</div>
      <div style="text-align:center;font-size:12px;color:var(--text3);margin-bottom:14px;">Objectif : ${ch.targetValue} ${ch.unit} · Il reste ${remaining} jour${remaining > 1 ? 's' : ''}</div>
      <div class="challenge-reps-display" id="ch-reps-disp">0</div>
      <div style="text-align:center;font-size:14px;color:var(--text2);margin-bottom:4px;">/ ${ch.targetValue} ${ch.unit}</div>
      <div style="background:var(--bg3);border-radius:20px;height:8px;overflow:hidden;max-width:260px;margin:8px auto 16px;">
        <div id="ch-reps-bar" style="background:linear-gradient(90deg,var(--rose),var(--peche));height:100%;border-radius:20px;width:0%;transition:width .3s;"></div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <button class="btn btn-ghost" style="flex:1;font-size:20px;padding:14px;" onclick="adjustReps(-5)">−5</button>
        <button class="btn btn-ghost" style="flex:1;font-size:20px;padding:14px;" onclick="adjustReps(-1)">−1</button>
        <button class="btn btn-primary" style="flex:1;font-size:20px;padding:14px;" onclick="adjustReps(1)">+1</button>
        <button class="btn btn-primary" style="flex:1;font-size:20px;padding:14px;" onclick="adjustReps(5)">+5</button>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:12px;margin-bottom:10px;">
        <div style="font-size:11px;color:var(--text3);margin-bottom:8px;text-align:center;">+ Ajouter les minutes d'activité</div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-size:20px;">⏱</span>
          <input type="number" id="ch-reps-min" min="0" max="120" placeholder="0" inputmode="numeric" style="flex:1;padding:10px;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius-xs);font-size:16px;font-family:var(--font-display);color:var(--text);text-align:center;"/>
          <span style="font-size:13px;color:var(--text2);font-weight:600;">min</span>
        </div>
      </div>
      <button class="btn btn-primary" onclick="completeChallengeReps()">✓ Valider</button>`);
  }
}

export function challengeTimerToggle() {
  const ch = (state.challenges || []).find(c => c.id === _activeChallengeId); if (!ch) return;
  _challengeTimerRunning = !_challengeTimerRunning;
  const btn = document.getElementById('ch-start-btn');
  if (_challengeTimerRunning) {
    if (btn) btn.textContent = '⏸ Pause';
    _challengeChronoInterval = setInterval(() => {
      _challengeElapsed++; updateChallengeTimerDisplay(ch);
      if (_challengeElapsed >= ch.targetValue) { clearInterval(_challengeChronoInterval); _challengeTimerRunning = false; updateChallengeTimerDisplay(ch); completeChallengeSession(true); }
    }, 1000);
  } else { clearInterval(_challengeChronoInterval); if (btn) btn.textContent = '▶ Reprendre'; }
}

export function challengeTimerReset() {
  clearInterval(_challengeChronoInterval); _challengeElapsed = 0; _challengeTimerRunning = false;
  const ch = (state.challenges || []).find(c => c.id === _activeChallengeId); if (ch) updateChallengeTimerDisplay(ch);
  const btn = document.getElementById('ch-start-btn'); if (btn) btn.textContent = '▶ Démarrer';
}

export function updateChallengeTimerDisplay(ch) {
  const disp = document.getElementById('ch-timer-disp'), bar = document.getElementById('ch-timer-bar'), lbl = document.getElementById('ch-timer-lbl');
  if (!disp) return;
  const m = String(Math.floor(_challengeElapsed / 60)).padStart(2, '0'), s = String(_challengeElapsed % 60).padStart(2, '0');
  disp.textContent = `${m}:${s}`;
  if (bar) bar.style.width = Math.min(100, Math.round((_challengeElapsed / ch.targetValue) * 100)) + '%';
  if (lbl) lbl.textContent = `${_challengeElapsed} / ${ch.targetValue}s`;
}

export function adjustReps(n) {
  _challengeRepsDone = Math.max(0, _challengeRepsDone + n);
  const ch = (state.challenges || []).find(c => c.id === _activeChallengeId);
  const disp = document.getElementById('ch-reps-disp'), bar = document.getElementById('ch-reps-bar');
  if (disp) disp.textContent = _challengeRepsDone;
  if (bar && ch) bar.style.width = Math.min(100, Math.round((_challengeRepsDone / ch.targetValue) * 100)) + '%';
}

export function completeChallengeSession(auto = false) {
  clearInterval(_challengeChronoInterval);
  const ch = (state.challenges || []).find(c => c.id === _activeChallengeId); if (!ch) return;
  _completeChallengeCommon(ch, Math.round(_challengeElapsed / 60) || 0, auto);
}

export function completeChallengeReps() {
  const ch = (state.challenges || []).find(c => c.id === _activeChallengeId); if (!ch) return;
  _completeChallengeCommon(ch, parseInt(document.getElementById('ch-reps-min')?.value) || 0, false);
}

function _completeChallengeCommon(ch, durationMin, auto) {
  if (!ch.logs) ch.logs = {};
  ch.logs[todayStr()] = { done: true, durationMin, ts: Date.now() };
  if (durationMin > 0) {
    state.sessions.push({ id: Date.now().toString(), workoutId: ch.id, workoutName: '🏆 ' + ch.name, date: todayStr(), phase: getPhaseForDate(todayStr()) || '', mode: 'challenge', durationMin, logs: [], rpe: 0, mood: 0, kcal: 0, isChallenge: true });
  }
  save(); document.getElementById('modal-overlay').classList.remove('open');
  renderChallengesScreen(); renderHome();
  const streak = getChallengeStreak(ch), remaining = getChallengeRemaining(ch);
  const motiv = CHALLENGE_MOTIVATIONS[Math.floor(Math.random() * CHALLENGE_MOTIVATIONS.length)];
  if (remaining === 0 && getChallengeCompleted(ch) >= ch.totalDays) showToast('🏆 Défi terminé ! Félicitations !');
  else showToast(auto ? `⏱ Temps atteint ! ${streak > 1 ? '🔥 Streak ' + streak + ' jours !' : ''}` : `✅ Défi du jour validé ! ${streak > 1 ? '🔥 ' + streak + ' jours de suite !' : motiv}`);
}
