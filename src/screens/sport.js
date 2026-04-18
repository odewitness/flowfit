import { state } from '../state.js';
import { save } from '../state.js';
import { PHASES, EXERCISE_LIBRARY, todayStr, formatDate, escHtml, getPhaseForDate, showToast, openModal, ytVideoId, ytThumb } from '../utils.js';

let _sportTab = 'seances';
let _videoPhaseFilter2 = '', _videoInstructorFilter2 = '';
let _videoSubTab = 'liste'; // 'liste' | 'instructeurs'

const _SPORT_TABS = ['seances', 'videos', 'pas', 'entrees', 'challenges'];
let _swipeInitDone = false;

// ── CSS slider (injecté une seule fois) ──
function _injectSliderCSS() {
  if (document.getElementById('sport-slider-css')) return;
  const style = document.createElement('style');
  style.id = 'sport-slider-css';
  style.textContent = `
    .sport-slider-viewport { overflow: hidden; position: relative; width: 100%; }
    .sport-slider-track { display: flex; width: 500%; will-change: transform; }
    .sport-slider-track > .sport-slide { width: 20%; flex-shrink: 0; min-width: 0; }
    .sport-slider-track.is-animating { transition: transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94); }
    .sport-tab-indicator { position:absolute; bottom:0; height:2px; background:var(--rose); border-radius:2px 2px 0 0; transition: left 0.28s cubic-bezier(0.25,0.46,0.45,0.94), width 0.28s cubic-bezier(0.25,0.46,0.45,0.94); pointer-events:none; }
  `;
  document.head.appendChild(style);
}

// ── Construit la structure viewport > track > slides ──
function _initSliderStructure() {
  const firstPanel = document.getElementById('sport-panel-seances');
  if (!firstPanel) return false;
  const container = firstPanel.parentElement;
  if (!container || container.classList.contains('sport-slider-viewport')) return true;
  _injectSliderCSS();
  const panels = _SPORT_TABS.map(t => document.getElementById('sport-panel-' + t)).filter(Boolean);
  const viewport = document.createElement('div');
  viewport.className = 'sport-slider-viewport';
  const track = document.createElement('div');
  track.className = 'sport-slider-track';
  track.id = 'sport-slider-track';
  panels.forEach(p => {
    const slide = document.createElement('div');
    slide.className = 'sport-slide';
    p.style.display = '';
    slide.appendChild(p);
    track.appendChild(slide);
  });
  viewport.appendChild(track);
  container.appendChild(viewport);
  // Indicateur animé sur la barre d'onglets
  const tabBar = document.getElementById('sport-tab-seances')?.parentElement;
  if (tabBar && !tabBar.querySelector('.sport-tab-indicator')) {
    tabBar.style.position = 'relative';
    const ind = document.createElement('div');
    ind.className = 'sport-tab-indicator';
    tabBar.appendChild(ind);
  }
  return true;
}

function _updateTabIndicator(tab, animate) {
  const btn = document.getElementById('sport-tab-' + tab);
  const ind = document.querySelector('.sport-tab-indicator');
  if (!btn || !ind) return;
  ind.style.transition = animate ? '' : 'none';
  ind.style.left = btn.offsetLeft + 'px';
  ind.style.width = btn.offsetWidth + 'px';
}

function _slideTo(tab, animate) {
  const track = document.getElementById('sport-slider-track');
  if (!track) return;
  const idx = _SPORT_TABS.indexOf(tab);
  if (idx < 0) return;
  const pct = idx * 20; // 100% / 5 onglets
  if (animate) {
    track.classList.add('is-animating');
    track.addEventListener('transitionend', () => track.classList.remove('is-animating'), { once: true });
  } else {
    track.classList.remove('is-animating');
  }
  track.style.transform = `translateX(-${pct}%)`;
  _updateTabIndicator(tab, animate);
}

function _initSportSwipe() {
  if (_swipeInitDone) return;
  const track = document.getElementById('sport-slider-track');
  if (!track) return;
  _swipeInitDone = true;
  let _tx = 0, _ty = 0, _dragging = false, _locked = false, _startX = 0;

  function getCurrentTranslateX() {
    return new DOMMatrix(window.getComputedStyle(track).transform).m41;
  }

  track.addEventListener('touchstart', e => {
    _tx = e.changedTouches[0].clientX;
    _ty = e.changedTouches[0].clientY;
    _dragging = false; _locked = false;
    _startX = getCurrentTranslateX();
    track.classList.remove('is-animating');
  }, { passive: true });

  track.addEventListener('touchmove', e => {
    if (_locked) return;
    const dx = e.changedTouches[0].clientX - _tx;
    const dy = e.changedTouches[0].clientY - _ty;
    if (!_dragging && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      if (Math.abs(dy) > Math.abs(dx) * 0.8) { _locked = true; return; }
      _dragging = true;
    }
    if (!_dragging) return;
    const trackW = track.parentElement.offsetWidth;
    let newX = _startX + dx;
    const minX = -((_SPORT_TABS.length - 1) * trackW);
    if (newX > 0) newX = dx * 0.2;
    if (newX < minX) newX = minX + (newX - minX) * 0.2;
    track.style.transform = `translateX(${newX}px)`;
    // Indicateur suit le doigt en temps réel
    const ind = document.querySelector('.sport-tab-indicator');
    if (ind) {
      const progress = -newX / trackW;
      const i1 = Math.max(0, Math.min(_SPORT_TABS.length - 2, Math.floor(progress)));
      const frac = Math.max(0, Math.min(1, progress - i1));
      const b1 = document.getElementById('sport-tab-' + _SPORT_TABS[i1]);
      const b2 = document.getElementById('sport-tab-' + _SPORT_TABS[i1 + 1]);
      if (b1 && b2) {
        ind.style.transition = 'none';
        ind.style.left = (b1.offsetLeft + (b2.offsetLeft - b1.offsetLeft) * frac) + 'px';
        ind.style.width = (b1.offsetWidth + (b2.offsetWidth - b1.offsetWidth) * frac) + 'px';
      }
    }
  }, { passive: true });

  track.addEventListener('touchend', e => {
    if (!_dragging) return;
    const dx = e.changedTouches[0].clientX - _tx;
    const trackW = track.parentElement.offsetWidth;
    const idx = _SPORT_TABS.indexOf(_sportTab);
    let targetIdx = idx;
    if (dx < -(trackW * 0.25) && idx < _SPORT_TABS.length - 1) targetIdx = idx + 1;
    else if (dx > (trackW * 0.25) && idx > 0) targetIdx = idx - 1;
    switchSportTab(_SPORT_TABS[targetIdx]);
  }, { passive: true });
}

export function renderSportScreen() {
  _initSliderStructure();
  switchSportTab(_sportTab, true);
  setTimeout(() => _initSportSwipe(), 50);
}

export function switchSportTab(tab, force) {
  if (_sportTab === tab && !force) return;
  _sportTab = tab;
  _SPORT_TABS.forEach(p => {
    const btn = document.getElementById('sport-tab-' + p);
    if (!btn) return;
    const active = p === tab;
    btn.style.background = active ? 'var(--bg2)' : 'none';
    btn.style.color = active ? 'var(--text)' : 'var(--text2)';
    btn.style.boxShadow = active ? '0 1px 3px rgba(180,130,110,.1)' : 'none';
  });
  if (tab === 'seances')    renderWorkouts2();
  if (tab === 'videos')     renderVideosScreen2();
  if (tab === 'pas')        renderPasScreen();
  if (tab === 'entrees')    renderEntrees2();
  if (tab === 'challenges') renderChallengesScreen();
  _slideTo(tab, !force);
}

// ── Helpers instructeurs ──

/** Retourne la liste des instructeurs depuis state.instructors (table dédiée) */
function getInstructors() {
  return state.instructors || [];
}

/** Trouve un instructeur par son ID */
function getInstructorById(id) {
  return getInstructors().find(i => i.id === id) || null;
}

/** Retourne le nom affichable d'un instructeur à partir de son ID */
function instructorName(id) {
  if (!id) return '';
  const inst = getInstructorById(id);
  return inst ? inst.name : '';
}

// ── Workouts ──
let editingWorkoutId = null, tempExercises = [], workoutMode = 'sequential';

export function renderWorkouts2() {
  const el = document.getElementById('workouts-list2'); if (!el) return;
  if (!state.workouts.length) { el.innerHTML = `<div class="card" style="text-align:center;color:var(--text2);">Aucune séance créée.<br>Crée ta première séance ! 🌸</div>`; return; }
  el.innerHTML = state.workouts.map(w => {
    const phaseLabels = w.phases?.length
      ? w.phases.map(p => `<span class="pill ${PHASES[p]?.cls || ''}" style="font-size:10px;">${PHASES[p]?.emoji || ''} ${PHASES[p]?.label || ''}</span>`).join('')
      : w.phase ? `<span class="pill ${PHASES[w.phase]?.cls || ''}">${PHASES[w.phase]?.emoji || ''} ${PHASES[w.phase]?.label || ''}</span>` : '';
    return `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
        <div style="font-size:15px;font-weight:600;">${escHtml(w.name)}</div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="editWorkout('${w.id}')" style="width:auto;padding:6px 10px;">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteWorkout('${w.id}')" style="color:var(--rouge);border-color:rgba(212,130,122,.25);width:auto;padding:6px 10px;">🗑</button>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">${phaseLabels}</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:10px;">${w.exercises.length} exercices · ~${w.estimatedMin || '?'} min · <em>${w.mode === 'circuit' ? 'Circuit' : 'Exercice par exercice'}</em></div>
      <button class="btn btn-primary btn-sm" onclick="startWorkoutById('${w.id}')">▶ Démarrer</button>
    </div>`;
  }).join('');
}

export function openNewWorkout() { editingWorkoutId = null; tempExercises = []; workoutMode = 'sequential'; openModal('Nouvelle séance', workoutForm(null)); renderTempExercises(); }

export function editWorkout(id) {
  const w = state.workouts.find(x => x.id === id); if (!w) return;
  editingWorkoutId = id; tempExercises = JSON.parse(JSON.stringify(w.exercises)); workoutMode = w.mode || 'sequential';
  openModal('Modifier la séance', workoutForm(w));
  renderTempExercises(); selectMode(workoutMode);
}

function workoutForm(w) {
  const selectedPhases = w?.phases?.length ? w.phases : (w?.phase ? [w.phase] : []);
  const phaseOptions = Object.entries(PHASES).map(([k, p]) => `
    <label class="phases-multi-option${selectedPhases.includes(k) ? ' selected-' + k : ''}" onclick="toggleWorkoutPhase('${k}',this)">
      <input type="checkbox" name="wf-phase" value="${k}" ${selectedPhases.includes(k) ? 'checked' : ''}/>
      <span style="font-size:16px;">${p.emoji}</span>
      <span class="phase-opt-label">${p.label}</span>
    </label>`).join('');
  const mc = w?.mode === 'circuit';
  return `
    <div class="wf-section">
      <div class="wf-section-title">📋 Informations</div>
      <div class="field"><label>Nom de la séance</label><input id="wf-name" placeholder="Ex: Full body force" value="${escHtml(w?.name || '')}"/></div>
      <div class="field"><label>Durée estimée (min)</label><input id="wf-min" type="number" min="5" max="180" placeholder="45" value="${w?.estimatedMin || ''}"/></div>
    </div>
    <div class="wf-section">
      <div class="wf-section-title">🌸 Phases du cycle ciblées</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:10px;">Sélectionne une ou plusieurs phases (ou aucune pour toutes)</div>
      <div class="phases-multi-select" id="wf-phases-select">${phaseOptions}</div>
    </div>
    <div class="wf-section">
      <div class="wf-section-title">⚙️ Mode d'exécution</div>
      <div class="mode-toggle">
        <div class="mode-opt ${!mc ? 'active' : ''}" id="mode-sequential" onclick="selectMode('sequential')">📋 Exercice par exercice<br><span style="font-size:10px;font-weight:400;opacity:.8">Tous les sets d'un exo, puis le suivant</span></div>
        <div class="mode-opt ${mc ? 'active' : ''}" id="mode-circuit" onclick="selectMode('circuit')">🔄 Circuit<br><span style="font-size:10px;font-weight:400;opacity:.8">Un set de chaque, on répète X tours</span></div>
      </div>
      <div id="circuit-rounds-field" style="${mc ? '' : 'display:none'}">
        <div class="field" style="margin-bottom:0"><label>Nombre de tours</label><input id="wf-rounds" type="number" min="1" max="20" placeholder="3" value="${w?.rounds || 3}"/></div>
      </div>
    </div>
    <div class="wf-section">
      <div class="wf-section-title">💪 Exercices</div>
      <div id="wf-exos"></div>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn btn-ghost btn-sm" style="flex:1" onclick="openExoLibrary()">📚 Bibliothèque</button>
        <button class="btn btn-ghost btn-sm" style="flex:1" onclick="addExerciseCustom()">✏️ Personnalisé</button>
      </div>
    </div>
    <button class="btn btn-primary" style="margin-top:4px" onclick="saveWorkout()">💾 Enregistrer</button>`;
}

export function toggleWorkoutPhase(key, labelEl) {
  const cb = labelEl.querySelector('input[type=checkbox]'); cb.checked = !cb.checked;
  Object.keys(PHASES).forEach(k => labelEl.classList.remove('selected-' + k));
  if (cb.checked) labelEl.classList.add('selected-' + key);
}
export function selectMode(m) {
  workoutMode = m;
  document.getElementById('mode-sequential')?.classList.toggle('active', m === 'sequential');
  document.getElementById('mode-circuit')?.classList.toggle('active', m === 'circuit');
  const rf = document.getElementById('circuit-rounds-field'); if (rf) rf.style.display = m === 'circuit' ? '' : 'none';
}

export function renderTempExercises() {
  const el = document.getElementById('wf-exos'); if (!el) return;
  el.innerHTML = tempExercises.length ? tempExercises.map((ex, i) => `
    <div class="wf-exo-card">
      <div class="wf-exo-card-header">
        <div class="wf-exo-card-name">💪 ${escHtml(ex.name)}</div>
        <button class="btn btn-ghost btn-sm" onclick="removeExercise(${i})" style="color:var(--rouge);padding:5px 10px;width:auto;border-color:rgba(212,130,122,.25);">✕ Retirer</button>
      </div>
      <div class="wf-exo-params">
        <div class="wf-exo-param"><label>Séries</label><input type="number" min="1" max="20" value="${ex.sets || 3}" onchange="updateExo(${i},'sets',this.value)"/></div>
        <div class="wf-exo-param"><label>Répétitions</label><input type="number" min="1" max="100" value="${ex.reps || 10}" onchange="updateExo(${i},'reps',this.value)"/></div>
        <div class="wf-exo-param"><label>Poids (kg)</label><input type="number" min="0" max="500" step="0.5" value="${ex.weight || ''}" placeholder="0" onchange="updateExo(${i},'weight',this.value)"/></div>
        <div class="wf-exo-param"><label>Repos (sec)</label><input type="number" min="0" max="600" step="5" value="${ex.rest || 90}" onchange="updateExo(${i},'rest',this.value)"/></div>
      </div>
    </div>`).join('')
    : `<div style="color:var(--text3);font-size:13px;padding:12px 4px;text-align:center;">Aucun exercice — ajoute-en via la bibliothèque ! 💪</div>`;
}
export function openExoLibrary() {
  let html = `<input id="lib-search" placeholder="🔍 Rechercher un exercice…" oninput="filterLib()" style="width:100%;padding:10px 14px;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius-sm);font-size:14px;margin-bottom:12px;color:var(--text);"/><div id="lib-body">`;
  for (const [cat, exos] of Object.entries(EXERCISE_LIBRARY)) {
    html += `<div class="exo-lib-category">${cat}</div>`;
    exos.forEach(e => { const already = tempExercises.some(t => t.name === e); html += `<div class="exo-lib-item${already ? ' selected' : ''}" onclick="toggleLibExo('${escHtml(e)}',this)"><span style="font-size:14px;">${escHtml(e)}</span><span style="font-size:18px;">${already ? '✓' : ''}</span></div>`; });
  }
  html += `</div><button class="btn btn-primary" style="margin-top:12px" onclick="closeLibrary()">Confirmer ✓</button>`;
  openModal('Bibliothèque d\'exercices', html);
}
export function filterLib() {
  const q = (document.getElementById('lib-search')?.value || '').toLowerCase();
  document.querySelectorAll('.exo-lib-item').forEach(el => { el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none'; });
  document.querySelectorAll('.exo-lib-category').forEach(cat => {
    let el = cat.nextElementSibling, has = false;
    while (el && el.classList.contains('exo-lib-item')) { if (el.style.display !== 'none') has = true; el = el.nextElementSibling; }
    cat.style.display = has ? '' : 'none';
  });
}
export function toggleLibExo(name, el) {
  const idx = tempExercises.findIndex(t => t.name === name);
  if (idx >= 0) { tempExercises.splice(idx, 1); el.classList.remove('selected'); el.querySelector('span:last-child').textContent = ''; }
  else { tempExercises.push({ name, sets: 3, reps: 10, weight: 0, rest: 90 }); el.classList.add('selected'); el.querySelector('span:last-child').textContent = '✓'; }
}
export function closeLibrary() {
  document.getElementById('modal-overlay').classList.remove('open');
  setTimeout(() => {
    const w = editingWorkoutId ? state.workouts.find(x => x.id === editingWorkoutId) : null;
    openModal(editingWorkoutId ? 'Modifier la séance' : 'Nouvelle séance', workoutForm(w));
    renderTempExercises(); selectMode(workoutMode);
  }, 60);
}
export function addExerciseCustom() { const n = prompt('Nom de l\'exercice :'); if (!n?.trim()) return; tempExercises.push({ name: n.trim(), sets: 3, reps: 10, weight: 0, rest: 90 }); renderTempExercises(); }
export function removeExercise(i) { tempExercises.splice(i, 1); renderTempExercises(); }
export function updateExo(i, f, v) { tempExercises[i][f] = f === 'weight' ? parseFloat(v) || 0 : parseInt(v) || 0; }
export function deleteWorkout(id) { if (!confirm('Supprimer cette séance ?')) return; state.workouts = state.workouts.filter(w => w.id !== id); save(); renderWorkouts2(); showToast('🗑 Séance supprimée'); }
export function saveWorkout() {
  const name = document.getElementById('wf-name')?.value?.trim();
  if (!name) { showToast('❌ Donne un nom à ta séance'); return; }
  const mode = document.getElementById('mode-circuit')?.classList.contains('active') ? 'circuit' : 'sequential';
  const checkedPhases = [...document.querySelectorAll('#wf-phases-select input[type=checkbox]:checked')].map(cb => cb.value);
  const wo = { id: editingWorkoutId || Date.now().toString(), name, phases: checkedPhases, phase: checkedPhases[0] || '', estimatedMin: parseInt(document.getElementById('wf-min')?.value) || 0, mode, rounds: mode === 'circuit' ? (parseInt(document.getElementById('wf-rounds')?.value) || 3) : 1, exercises: tempExercises.map(e => ({ ...e })) };
  if (editingWorkoutId) { const i = state.workouts.findIndex(w => w.id === editingWorkoutId); if (i >= 0) state.workouts[i] = { ...state.workouts[i], ...wo }; }
  else state.workouts.push(wo);
  save(); document.getElementById('modal-overlay').classList.remove('open'); renderWorkouts2(); showToast('✅ Séance enregistrée !');
}

// ── Session active ──
let activeSession = null, chronoInterval = null, chronoSeconds = 0;

function fmtTime(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }

export function startWorkoutById(id) {
  const w = state.workouts.find(x => x.id === id); if (!w) return;
  if (w.type === 'youtube') { window.open(w.url, '_blank'); return; }
  if (!w.exercises.length) { showToast('❌ Ajoute des exercices !'); return; }
  activeSession = {
    workoutId: w.id, workoutName: w.name, date: todayStr(), phase: getPhaseForDate(todayStr()) || '',
    mode: w.mode || 'sequential', totalRounds: w.mode === 'circuit' ? (w.rounds || 3) : 1, currentRound: 1,
    logs: w.exercises.map(ex => ({ name: ex.name, targetSets: ex.sets, targetReps: ex.reps, targetWeight: ex.weight, completedSets: [], rest: ex.rest })),
    currentExo: 0,
  };
  chronoSeconds = 0;
  openModal('🌸 ' + w.name, renderSessionModal());
  clearInterval(chronoInterval);
  chronoInterval = setInterval(() => { chronoSeconds++; const el = document.getElementById('chrono-display'); if (el) el.textContent = fmtTime(chronoSeconds); }, 1000);
}

function renderSessionModal() {
  if (!activeSession) return '';
  const { logs, currentExo, mode, currentRound, totalRounds } = activeSession;
  const ex = logs[currentExo]; const isC = mode === 'circuit';
  const prog = logs.map((l, i) => {
    let bg; if (isC) { bg = i === currentExo ? 'var(--rose)' : 'var(--bg4)'; } else { bg = i === currentExo ? 'var(--rose)' : l.completedSets.length > 0 ? 'var(--menthe)' : 'var(--bg4)'; }
    return `<div style="width:28px;height:4px;border-radius:2px;background:${bg}"></div>`;
  }).join('');
  return `
    <div id="chrono-display">${fmtTime(chronoSeconds)}</div>
    <div style="font-size:11px;color:var(--text3);text-align:center;margin-bottom:6px;">Exercice ${currentExo + 1}/${logs.length}${isC ? ' · Tour ' + currentRound + '/' + totalRounds : ''}</div>
    <div style="display:flex;gap:4px;margin-bottom:14px;">${prog}</div>
    <div style="background:var(--rose-lt);border-radius:var(--radius);padding:14px;margin-bottom:14px;border:1px solid rgba(232,130,154,.2);">
      <div style="font-size:18px;font-weight:700;margin-bottom:10px;">${escHtml(ex.name)}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">
        <div class="metric" style="background:rgba(255,255,255,.6);"><div class="metric-val" style="font-size:22px;">${isC ? 1 : ex.targetSets}</div><div class="metric-lbl">${isC ? 'Set' : 'Séries'}</div></div>
        <div class="metric" style="background:rgba(255,255,255,.6);"><div class="metric-val" style="font-size:22px;">${ex.targetReps}</div><div class="metric-lbl">Reps</div></div>
        <div class="metric" style="background:rgba(255,255,255,.6);"><div class="metric-val" style="font-size:22px;">${ex.targetWeight || 0}</div><div class="metric-lbl">kg</div></div>
      </div>
      ${!isC ? `<div style="font-size:11px;color:var(--text2);margin-bottom:8px;">Sets : ${ex.completedSets.length}/${ex.targetSets}</div>` : ''}
      <button class="btn btn-primary" onclick="logSet()">✓ Set terminé · repos ${ex.rest}s</button>
    </div>
    <div style="display:flex;gap:8px;">
      ${currentExo > 0 ? `<button class="btn btn-ghost btn-sm" style="flex:1" onclick="prevExo()">‹ Préc.</button>` : ''}
      ${currentExo < logs.length - 1 ? `<button class="btn btn-ghost btn-sm" style="flex:1" onclick="nextExo()">Suiv. ›</button>` : ''}
      <button class="btn btn-ghost btn-sm" style="flex:1;color:var(--menthe);border-color:rgba(126,200,184,.3);" onclick="finishSession()">🏁 Terminer</button>
    </div>`;
}

export function logSet() {
  if (!activeSession) return;
  const { logs, currentExo, mode, currentRound, totalRounds } = activeSession;
  const ex = logs[currentExo]; const isC = mode === 'circuit';
  logs[currentExo].completedSets.push({ reps: ex.targetReps || 0, weight: ex.targetWeight || 0 });
  if (isC) {
    if (currentExo < logs.length - 1) { activeSession.currentExo++; showToast('✅ Suivant !'); }
    else if (currentRound < totalRounds) { activeSession.currentRound++; activeSession.currentExo = 0; showToast('🔄 Tour ' + activeSession.currentRound + ' !'); }
    else showToast('🎉 Circuit terminé !');
  } else {
    if (logs[currentExo].completedSets.length >= logs[currentExo].targetSets) {
      if (currentExo < logs.length - 1) { activeSession.currentExo++; showToast('✅ Exercice suivant !'); }
      else showToast('🎉 Terminé !');
    } else showToast('✅ Set enregistré !');
  }
  document.getElementById('modal-body').innerHTML = renderSessionModal();
}
export function nextExo() { if (activeSession && activeSession.currentExo < activeSession.logs.length - 1) { activeSession.currentExo++; document.getElementById('modal-body').innerHTML = renderSessionModal(); } }
export function prevExo() { if (activeSession && activeSession.currentExo > 0) { activeSession.currentExo--; document.getElementById('modal-body').innerHTML = renderSessionModal(); } }

let finRPE = 0, finMood = 0;
export function finishSession() {
  if (!activeSession) return;
  clearInterval(chronoInterval);
  const dm = Math.round(chronoSeconds / 60);
  openModal('🎀 Séance terminée !', `
    <div style="text-align:center;margin-bottom:20px;"><div style="font-family:var(--font-display);font-size:52px;color:var(--rose);">${fmtTime(chronoSeconds)}</div><div style="font-size:12px;color:var(--text2);margin-top:2px;">Durée réelle</div></div>
    <div class="metrics" style="margin-bottom:16px;grid-template-columns:1fr 1fr;">
      <div class="metric"><div class="metric-val" style="font-size:20px;">${activeSession.logs.length}</div><div class="metric-lbl">Exercices</div></div>
      <div class="metric"><div class="metric-val" style="font-size:20px;">${activeSession.logs.reduce((a, l) => a + l.completedSets.length, 0)}</div><div class="metric-lbl">Sets</div></div>
      <div class="metric"><div class="metric-val" style="font-size:20px;">${dm}</div><div class="metric-lbl">Minutes</div></div>
    </div>
    <div class="kcal-row"><div class="kcal-icon">🔥</div><input type="number" id="finish-kcal" min="0" max="5000" placeholder="0" inputmode="numeric"/><div class="kcal-lbl">kcal brûlées</div></div>
    <div class="field"><label>Effort perçu (RPE)</label>
      <div class="rpe-row" id="finish-rpe" style="flex-wrap:wrap;gap:4px;">
        ${[1,2,3,4,5,6,7,8,9,10].map(n => `<div class="rpe-btn" style="flex:none;min-width:28px;padding:6px 4px;font-size:12px;" onclick="selRPE(${n},this)">${n}</div>`).join('')}
      </div>
    </div>
    <div class="field"><label>Humeur post-séance</label>
      <div class="rpe-row" id="finish-mood">
        ${['😢','😕','😐','🙂','😄'].map((e, i) => `<div class="rpe-btn" onclick="selMoodF(${i + 1},this)">${e}</div>`).join('')}
      </div>
    </div>
    <button class="btn btn-primary" style="margin-top:8px" onclick="saveSession(${dm})">💾 Enregistrer</button>`);
}
export function selRPE(v, el) { finRPE = v; el.closest('.rpe-row').querySelectorAll('.rpe-btn').forEach(b => b.classList.remove('selected')); el.classList.add('selected'); }
export function selMoodF(v, el) { finMood = v; el.closest('.rpe-row').querySelectorAll('.rpe-btn').forEach(b => b.classList.remove('selected')); el.classList.add('selected'); }
export function saveSession(dm) {
  const kcal = parseInt(document.getElementById('finish-kcal')?.value) || 0;
  state.sessions.push({ id: Date.now().toString(), workoutId: activeSession.workoutId, workoutName: activeSession.workoutName, date: activeSession.date, phase: activeSession.phase, mode: activeSession.mode, durationMin: dm, logs: activeSession.logs, rpe: finRPE, mood: finMood, kcal });
  save(); activeSession = null; finRPE = 0; finMood = 0;
  document.getElementById('modal-overlay').classList.remove('open');
  showToast('🎉 Séance enregistrée !');
  window.goTo?.('home');
}

// ── Videos ──

export function renderVideosScreen2() {
  const panel = document.getElementById('sport-panel-videos'); if (!panel) return;

  // Injecter la structure de sous-onglets si pas encore présente
  if (!panel.querySelector('#vsub-bar')) {
    panel.insertAdjacentHTML('afterbegin', `
      <div id="vsub-bar" style="display:flex;gap:6px;margin-bottom:14px;background:var(--bg3);border-radius:var(--radius-sm);padding:4px;">
        <button id="vsub-btn-liste" onclick="switchVideoSubTab('liste')"
          style="flex:1;padding:7px 0;border:none;border-radius:var(--radius-sm);font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;background:transparent;color:var(--text2);">
          ▶ Vidéos
        </button>
        <button id="vsub-btn-instructeurs" onclick="switchVideoSubTab('instructeurs')"
          style="flex:1;padding:7px 0;border:none;border-radius:var(--radius-sm);font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;background:transparent;color:var(--text2);">
          👩‍🏫 Instructrices
        </button>
      </div>
      <div id="vsub-panel-liste"></div>
      <div id="vsub-panel-instructeurs" style="display:none;"></div>`);

    // Déplacer les éléments HTML existants (filtres, liste, bouton ajout) dans le panel liste
    const listePanel = panel.querySelector('#vsub-panel-liste');
    [...panel.children].forEach(child => {
      if (!child.id?.startsWith('vsub')) listePanel.appendChild(child);
    });
  }

  // Mettre à jour l'apparence des boutons
  const btnListe = panel.querySelector('#vsub-btn-liste');
  const btnInst  = panel.querySelector('#vsub-btn-instructeurs');
  if (btnListe) {
    btnListe.style.background    = _videoSubTab === 'liste' ? 'var(--bg2)' : 'transparent';
    btnListe.style.color         = _videoSubTab === 'liste' ? 'var(--text)' : 'var(--text2)';
    btnListe.style.boxShadow     = _videoSubTab === 'liste' ? '0 1px 3px rgba(180,130,110,.1)' : 'none';
  }
  if (btnInst) {
    btnInst.style.background     = _videoSubTab === 'instructeurs' ? 'var(--bg2)' : 'transparent';
    btnInst.style.color          = _videoSubTab === 'instructeurs' ? 'var(--text)' : 'var(--text2)';
    btnInst.style.boxShadow      = _videoSubTab === 'instructeurs' ? '0 1px 3px rgba(180,130,110,.1)' : 'none';
  }

  panel.querySelector('#vsub-panel-liste').style.display         = _videoSubTab === 'liste' ? '' : 'none';
  panel.querySelector('#vsub-panel-instructeurs').style.display  = _videoSubTab === 'instructeurs' ? '' : 'none';

  if (_videoSubTab === 'liste') _renderVideoListe();
  else _renderInstructeursTab();
}

export function switchVideoSubTab(tab) {
  _videoSubTab = tab;
  renderVideosScreen2();
}

function _renderVideoListe() {
  const el = document.getElementById('videos-list2'); if (!el) return;
  const filtered = (state.videos || []).filter(v => {
    if (_videoPhaseFilter2 && !(v.phases?.includes(_videoPhaseFilter2))) return false;
    if (_videoInstructorFilter2 && v.instructorId !== _videoInstructorFilter2) return false;
    return true;
  });

  const instEl = document.getElementById('video-instructor-filter2');
  if (instEl) {
    const instructors = getInstructors();
    const usedIds = new Set((state.videos || []).map(v => v.instructorId).filter(Boolean));
    const usedInstructors = instructors.filter(i => usedIds.has(i.id));
    instEl.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-start;margin-bottom:12px;';
    instEl.innerHTML = usedInstructors.length
      ? [`<div onclick="filterInstructor2('')" style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;">
            <div style="width:40px;height:40px;border-radius:50%;background:${!_videoInstructorFilter2 ? 'var(--rose)' : 'var(--bg3)'};display:flex;align-items:center;justify-content:center;font-size:20px;border:2px solid ${!_videoInstructorFilter2 ? 'var(--rose)' : 'var(--border2)'};">👸</div>
            <span style="font-size:10px;font-weight:600;color:${!_videoInstructorFilter2 ? 'var(--rose)' : 'var(--text2)'};">Tous</span>
          </div>`]
        .concat(usedInstructors.map(ins => `
          <div onclick="filterInstructor2('${escHtml(ins.id)}')" style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;">
            <div style="width:40px;height:40px;border-radius:50%;background:${_videoInstructorFilter2 === ins.id ? 'var(--rose)' : 'var(--bg3)'};display:flex;align-items:center;justify-content:center;font-size:20px;border:2px solid ${_videoInstructorFilter2 === ins.id ? 'var(--rose)' : 'var(--border2)'};">👸</div>
            <span style="font-size:10px;font-weight:600;color:${_videoInstructorFilter2 === ins.id ? 'var(--rose)' : 'var(--text2)'};text-align:center;max-width:56px;line-height:1.2;">${escHtml(ins.name.split(' ')[0])}</span>
          </div>`)).join('')
      : '';
  }

  if (!filtered.length) { el.innerHTML = `<div class="card" style="text-align:center;color:var(--text2);">Aucune vidéo${_videoPhaseFilter2 ? ' pour cette phase' : ''}. Ajoute-en une ! 🎬</div>`; return; }
  el.innerHTML = filtered.map(v => {
    const phasePills = v.phases?.length ? `<div class="yt-phases-row">${v.phases.map(p => `<span class="pill ${PHASES[p]?.cls || 'pill-neutre'}" style="font-size:10px;">${PHASES[p]?.emoji || ''} ${PHASES[p]?.label || p}</span>`).join('')}</div>` : '';
    const doneBadge = v.done ? `<span class="yt-done-badge">✓ Fait le ${formatDate(v.doneDate || '')}</span>` : '';
    const kcalBadge = v.done && v.kcal ? `<span class="pill pill-neutre" style="font-size:10px;">🔥 ${v.kcal} kcal</span>` : '';
    const minBadge = v.minutes ? `<span class="pill pill-neutre" style="font-size:10px;">⏱ ${v.minutes} min</span>` : '';
    const instName = instructorName(v.instructorId);
    return `<div class="yt-card${v.done ? ' done' : ''}">
      ${v.videoId ? `<div class="yt-thumbnail-container" onclick="openYtVideo('${escHtml(v.url)}')"><img class="yt-thumbnail" src="${ytThumb(v.videoId)}" alt="${escHtml(v.name)}" loading="lazy"/><div class="yt-play-btn"><div class="yt-play-icon"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></div></div></div>` : ''}
      <div class="yt-card-body">
        ${phasePills}
        <div class="yt-card-title">${escHtml(v.name)}</div>
        <div class="yt-card-meta">${instName ? `<span style="cursor:pointer;color:var(--rose);" onclick="switchVideoSubTab('instructeurs')">${escHtml(instName)}</span> · ` : ''}<span class="yt-badge">▶ YouTube</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">${minBadge}${doneBadge}${kcalBadge}</div>
        <div class="yt-card-actions">
          <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="markVideoDone('${v.id}')">${v.done ? '↩ Refaire' : '✓ Marquer faite'}</button>
          <button class="btn btn-ghost btn-sm" onclick="editVideo('${v.id}')" style="width:auto;padding:8px 12px;">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteVideo('${v.id}')" style="color:var(--rouge);border-color:rgba(212,130,122,.25);width:auto;padding:8px 12px;">🗑</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function _renderInstructeursTab() {
  const el = document.getElementById('vsub-panel-instructeurs'); if (!el) return;
  const instructors = getInstructors();
  const videos = state.videos || [];

  if (!instructors.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:32px 16px;color:var(--text2);">
        <div style="font-size:40px;margin-bottom:12px;">👩‍🏫</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:6px;color:var(--text);">Aucune instructrice encore</div>
        <div style="font-size:13px;margin-bottom:18px;">Ajoute tes instructrices favories pour les associer à tes vidéos.</div>
        <button class="btn btn-primary" onclick="openNewInstructorModal()">＋ Ajouter une instructrice</button>
      </div>`;
    return;
  }

  const totalVideos = videos.length;
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <div style="font-size:13px;color:var(--text2);">${instructors.length} instructeur${instructors.length > 1 ? 's' : ''} · ${totalVideos} vidéo${totalVideos > 1 ? 's' : ''}</div>
      <button class="btn btn-primary btn-sm" onclick="openNewInstructorModal()" style="width:auto;padding:6px 14px;font-size:13px;">＋ Ajouter</button>
    </div>
    ${instructors.map(inst => {
      const instVideos = videos.filter(v => v.instructorId === inst.id);
      const totalMin   = instVideos.reduce((s, v) => s + (v.minutes || 0), 0);
      const doneCount  = instVideos.filter(v => v.done).length;
      const pct        = instVideos.length ? Math.round((doneCount / instVideos.length) * 100) : null;
      return `
        <div class="card" style="margin-bottom:10px;cursor:pointer;transition:box-shadow .15s;" onclick="openInstructorDetail('${inst.id}')">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:700;margin-bottom:3px;">${escHtml(inst.name)}</div>
              ${inst.note ? `<div style="font-size:12px;color:var(--text2);margin-bottom:4px;">🏷 ${escHtml(inst.note)}</div>` : ''}
              ${inst.channel ? `<a href="${escHtml(inst.channel)}" target="_blank" onclick="event.stopPropagation()" style="font-size:12px;color:var(--rose);text-decoration:none;">🔗 Voir la chaîne</a>` : ''}
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;margin-left:10px;">
              <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();editInstructor('${inst.id}')" style="width:auto;padding:6px 10px;">✏️</button>
              <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();deleteInstructor('${inst.id}')" style="color:var(--rouge);border-color:rgba(212,130,122,.25);width:auto;padding:6px 10px;">🗑</button>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center;">
            <span class="pill pill-neutre" style="font-size:11px;">▶ ${instVideos.length} vidéo${instVideos.length > 1 ? 's' : ''}</span>
            ${totalMin ? `<span class="pill pill-neutre" style="font-size:11px;">⏱ ${totalMin} min</span>` : ''}
            ${instVideos.length ? `<span class="pill pill-neutre" style="font-size:11px;">✅ ${doneCount}/${instVideos.length} faites</span>` : ''}
            ${pct !== null && instVideos.length > 0 ? `
              <div style="flex:1;min-width:80px;height:4px;background:var(--bg3);border-radius:2px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:var(--menthe);border-radius:2px;transition:width .3s;"></div>
              </div>` : ''}
          </div>
        </div>`;
    }).join('')}`;
}

export function openInstructorDetail(id) {
  const inst = getInstructorById(id); if (!inst) return;
  const instVideos = (state.videos || []).filter(v => v.instructorId === id);
  const totalMin   = instVideos.reduce((s, v) => s + (v.minutes || 0), 0);
  const doneCount  = instVideos.filter(v => v.done).length;

  const videosHtml = instVideos.length
    ? instVideos.map(v => {
        const thumb      = v.videoId ? `<img src="${ytThumb(v.videoId)}" style="width:80px;height:52px;object-fit:cover;border-radius:6px;flex-shrink:0;" alt=""/>` : '';
        const phasePills = (v.phases || []).map(p => `<span class="pill ${PHASES[p]?.cls || ''}" style="font-size:9px;padding:2px 6px;">${PHASES[p]?.emoji || ''} ${PHASES[p]?.label || ''}</span>`).join('');
        return `
          <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border2);">
            ${thumb}
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:600;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(v.name)}</div>
              <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;">
                ${v.minutes ? `<span style="font-size:11px;color:var(--text2);">⏱ ${v.minutes} min</span>` : ''}
                ${v.done ? `<span style="font-size:11px;color:var(--menthe);">✅ Faite</span>` : `<span style="font-size:11px;color:var(--text3);">À faire</span>`}
                ${phasePills}
              </div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="openYtVideo('${escHtml(v.url)}')" style="width:auto;padding:6px 10px;flex-shrink:0;" title="Ouvrir la vidéo">▶</button>
          </div>`;
      }).join('')
    : `<div style="color:var(--text3);font-size:13px;padding:14px 0;text-align:center;">Aucune vidéo associée à cette instructrice.</div>`;

  openModal(escHtml(inst.name), `
    <div style="margin-bottom:16px;">
      ${inst.note ? `<div style="font-size:13px;color:var(--text2);margin-bottom:6px;">🏷 ${escHtml(inst.note)}</div>` : ''}
      ${inst.channel ? `<a href="${escHtml(inst.channel)}" target="_blank" style="font-size:13px;color:var(--rose);text-decoration:none;display:inline-flex;align-items:center;gap:4px;margin-bottom:12px;">🔗 <span style="text-overflow:ellipsis;overflow:hidden;white-space:nowrap;max-width:220px;">${escHtml(inst.channel)}</span></a>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <span class="pill pill-neutre">▶ ${instVideos.length} vidéo${instVideos.length > 1 ? 's' : ''}</span>
        ${totalMin ? `<span class="pill pill-neutre">⏱ ${totalMin} min</span>` : ''}
        ${instVideos.length ? `<span class="pill pill-neutre">✅ ${doneCount}/${instVideos.length} faites</span>` : ''}
      </div>
    </div>
    <div style="font-size:12px;font-weight:700;letter-spacing:.05em;color:var(--text3);margin-bottom:4px;">VIDÉOS ASSOCIÉES</div>
    ${videosHtml}
    <div style="display:flex;gap:8px;margin-top:16px;">
      <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="editInstructor('${id}')">✏️ Modifier</button>
      <button class="btn btn-ghost btn-sm" style="flex:1;color:var(--rouge);border-color:rgba(212,130,122,.25);" onclick="deleteInstructor('${id}')">🗑 Supprimer</button>
    </div>`);
}

export function filterVideos2(phase) { _videoPhaseFilter2 = phase; renderVideosScreen2(); }
/** Filtre désormais par ID d'instructeur (plus par nom brut) */
export function filterInstructor2(instructorId) { _videoInstructorFilter2 = instructorId; renderVideosScreen2(); }
export function openYtVideo(url) { window.open(url, '_blank'); }
export function deleteVideo(id) { if (!confirm('Supprimer cette vidéo ?')) return; state.videos = state.videos.filter(v => v.id !== id); save(); renderVideosScreen2(); showToast('🗑 Vidéo supprimée'); }

export function markVideoDone(id) {
  const v = state.videos.find(x => x.id === id); if (!v) return;
  if (!v.done) {
    openModal('🔥 Séance terminée !', `
      <div style="text-align:center;margin-bottom:16px;font-size:16px;">Super ! Tu as terminé :<br><strong>${escHtml(v.name)}</strong></div>
      <div class="kcal-row" style="margin-bottom:14px;"><div class="kcal-icon">⏱</div><input type="number" id="vid-finish-min" min="0" max="300" placeholder="${v.minutes || 0}" inputmode="numeric" style="font-family:var(--font-display);font-size:20px;flex:1;text-align:center;background:none;border:none;"/><div class="kcal-lbl">minutes réelles</div></div>
      <div class="kcal-row"><div class="kcal-icon">🔥</div><input type="number" id="vid-finish-kcal" min="0" max="5000" placeholder="0" inputmode="numeric"/><div class="kcal-lbl">kcal brûlées</div></div>
      <button class="btn btn-primary" onclick="confirmVideoDone('${id}')">✓ Confirmer</button>
      <button class="btn btn-ghost" style="margin-top:8px" onclick="confirmVideoDone('${id}',true)">Passer sans détails</button>`);
  } else {
    v.done = false; v.kcal = 0; v.doneDate = null; v.realMinutes = null;
    save(); renderVideosScreen2(); showToast('↩ Marquée à refaire');
  }
}
export function confirmVideoDone(id, skip = false) {
  const v = state.videos.find(x => x.id === id); if (!v) return;
  const kcal = skip ? 0 : (parseInt(document.getElementById('vid-finish-kcal')?.value) || 0);
  const realMin = skip ? null : (parseInt(document.getElementById('vid-finish-min')?.value) || null);
  v.done = true; v.kcal = kcal; v.doneDate = todayStr(); if (realMin !== null) v.realMinutes = realMin;
  const durationMin = realMin !== null ? realMin : (v.minutes || v.durationMinutes || 0);
  state.sessions.push({ id: Date.now().toString(), workoutId: v.id, workoutName: v.name, date: todayStr(), phase: getPhaseForDate(todayStr()) || '', mode: 'youtube', durationMin, logs: [], rpe: 0, mood: 0, kcal, isVideo: true });
  save(); document.getElementById('modal-overlay').classList.remove('open'); renderVideosScreen2(); showToast('🎉 Vidéo marquée comme faite !');
}

// ── Formulaire vidéo — sélecteur d'instructeur ──

/**
 * Génère le <select> d'instructeurs pour les formulaires d'ajout/édition de vidéo.
 * Un lien "＋ Nouvel instructeur" permet de créer à la volée.
 */
function instructorSelectHtml(selectedId = '') {
  const instructors = getInstructors();
  const options = instructors.map(i =>
    `<option value="${escHtml(i.id)}"${selectedId === i.id ? ' selected' : ''}>${escHtml(i.name)}</option>`
  ).join('');
  return `
    <select id="vid-instructor-id">
      <option value="">— Aucune instructrice —</option>
      ${options}
    </select>
    <button type="button" class="btn btn-ghost btn-sm" style="margin-top:6px;width:auto;" onclick="openNewInstructorModal()">＋ Nouvelle instructrice</button>`;
}

export function openAddVideo() {
  const phaseOptions = Object.entries(PHASES).map(([k, p]) => `<label class="phases-multi-option" onclick="toggleVideoPhase('${k}',this)"><input type="checkbox" value="${k}"/><span style="font-size:16px;">${p.emoji}</span><span class="phase-opt-label">${p.label}</span></label>`).join('');
  openModal('🎬 Ajouter une vidéo', `
    <div class="field"><label>Lien YouTube</label><input id="vid-url" placeholder="https://youtube.com/watch?v=..." oninput="previewYtThumb()"/></div>
    <div id="vid-thumb-preview" style="margin-bottom:12px;border-radius:var(--radius-sm);overflow:hidden;display:none;"><img id="vid-thumb-img" style="width:100%;aspect-ratio:16/9;object-fit:cover;" alt=""/></div>
    <div class="field"><label>Nom de la séance</label><input id="vid-name" placeholder="Ex: Yoga doux menstruel"/></div>
    <div class="field"><label>Durée (minutes)</label><input id="vid-minutes" type="number" min="0" max="300" placeholder="Ex: 30" inputmode="numeric" oninput="this.value=this.value.replace(/[^0-9]/g,'')"/></div>
    <div class="field"><label>Instructrice / Chaîne</label>${instructorSelectHtml()}</div>
    <div class="field"><label>Phases du cycle</label><div style="font-size:12px;color:var(--text2);margin-bottom:8px;">Associe cette vidéo à une ou plusieurs phases</div><div class="phases-multi-select" id="vid-phases">${phaseOptions}</div></div>
    <button class="btn btn-primary" style="margin-top:8px" onclick="saveVideo()">💾 Ajouter</button>`);
}

export function toggleVideoPhase(key, labelEl) {
  const cb = labelEl.querySelector('input[type=checkbox]'); cb.checked = !cb.checked;
  Object.keys(PHASES).forEach(k => labelEl.classList.remove('selected-' + k));
  if (cb.checked) labelEl.classList.add('selected-' + key);
}
export function previewYtThumb() {
  const url = document.getElementById('vid-url')?.value;
  const id = ytVideoId(url || '');
  const prev = document.getElementById('vid-thumb-preview'); const img = document.getElementById('vid-thumb-img');
  if (id && prev && img) { img.src = ytThumb(id); prev.style.display = ''; } else if (prev) prev.style.display = 'none';
}

export function saveVideo() {
  const url = document.getElementById('vid-url')?.value?.trim(); if (!url) { showToast('❌ Colle un lien YouTube'); return; }
  const name = document.getElementById('vid-name')?.value?.trim() || 'Séance YouTube';
  const videoId = ytVideoId(url);
  const phases = [...document.querySelectorAll('#vid-phases input[type=checkbox]:checked')].map(cb => cb.value);
  const minutes = parseInt(document.getElementById('vid-minutes')?.value) || 0;
  // On stocke l'ID de l'instructeur, plus son nom en clair
  const instructorId = document.getElementById('vid-instructor-id')?.value || '';
  state.videos.push({ id: Date.now().toString(), url, videoId, name, minutes, instructorId, phases });
  save(); document.getElementById('modal-overlay').classList.remove('open'); renderVideosScreen2(); showToast('✅ Vidéo ajoutée !');
}

export function editVideo(id) {
  const v = state.videos.find(x => x.id === id); if (!v) return;
  const phaseOptions = Object.entries(PHASES).map(([k, p]) => `<label class="phases-multi-option${v.phases?.includes(k) ? ' selected-' + k : ''}" onclick="toggleVideoPhase('${k}',this)"><input type="checkbox" value="${k}"${v.phases?.includes(k) ? ' checked' : ''}/><span style="font-size:16px;">${p.emoji}</span><span class="phase-opt-label">${p.label}</span></label>`).join('');
  openModal('✏️ Modifier la vidéo', `
    <div class="field"><label>Lien YouTube</label><input id="vid-url" value="${escHtml(v.url)}" oninput="previewYtThumb()"/></div>
    <div id="vid-thumb-preview" style="margin-bottom:12px;border-radius:var(--radius-sm);overflow:hidden;${v.videoId ? '' : 'display:none'}"><img id="vid-thumb-img" src="${v.videoId ? ytThumb(v.videoId) : ''}" style="width:100%;aspect-ratio:16/9;object-fit:cover;" alt=""/></div>
    <div class="field"><label>Nom</label><input id="vid-name" value="${escHtml(v.name)}"/></div>
    <div class="field"><label>Durée (minutes)</label><input id="vid-minutes" type="number" min="0" max="300" value="${v.minutes || ''}" inputmode="numeric"/></div>
    <div class="field"><label>Instructrice / Chaîne</label>${instructorSelectHtml(v.instructorId || '')}</div>
    <div class="field"><label>Phases du cycle</label><div class="phases-multi-select" id="vid-phases">${phaseOptions}</div></div>
    <button class="btn btn-primary" style="margin-top:8px" onclick="saveVideoEdit('${id}')">💾 Enregistrer</button>`);
}

export function saveVideoEdit(id) {
  const v = state.videos.find(x => x.id === id); if (!v) return;
  const url = document.getElementById('vid-url')?.value?.trim(); if (!url) { showToast('❌ Lien YouTube requis'); return; }
  v.url = url; v.videoId = ytVideoId(url) || v.videoId;
  v.name = document.getElementById('vid-name')?.value?.trim() || v.name;
  v.minutes = parseInt(document.getElementById('vid-minutes')?.value) || 0;
  // Mise à jour via ID, plus via chaîne brute
  v.instructorId = document.getElementById('vid-instructor-id')?.value || '';
  v.phases = [...document.querySelectorAll('#vid-phases input[type=checkbox]:checked')].map(cb => cb.value);
  save(); document.getElementById('modal-overlay').classList.remove('open'); renderVideosScreen2(); showToast('✅ Vidéo mise à jour !');
}

// ── Gestion CRUD des instructeurs ──

/**
 * Ouvre une modale pour créer un nouvel instructeur.
 * Appelé depuis le bouton "＋ Nouvel instructeur" dans les formulaires vidéo.
 */
export function openNewInstructorModal() {
  openModal('👩‍🏫 Nouvelle instructrice', `
    <div class="field"><label>Nom *</label><input id="inst-name" placeholder="Ex: Lidia Mera"/></div>
    <div class="field"><label>Lien de la chaîne (optionnel)</label><input id="inst-channel" placeholder="https://youtube.com/@..."/></div>
    <div class="field"><label>Note / Genre de sport (optionnel)</label><input id="inst-note" placeholder="Ex: Yoga, Pilates, HIIT…"/></div>
    <button class="btn btn-primary" style="margin-top:8px" onclick="saveNewInstructor()">💾 Créer</button>`);
}

export function saveNewInstructor() {
  const name = document.getElementById('inst-name')?.value?.trim();
  if (!name) { showToast('❌ Le nom est requis'); return; }
  if (!state.instructors) state.instructors = [];
  const newInstructor = {
    id: Date.now().toString(),
    name,
    channel: document.getElementById('inst-channel')?.value?.trim() || '',
    note: document.getElementById('inst-note')?.value?.trim() || '',
  };
  state.instructors.push(newInstructor);
  save();
  document.getElementById('modal-overlay').classList.remove('open');
  showToast('✅ Instructrice créée !');
}

/** Ouvre l'écran de gestion des instructeurs (liste + édition + suppression) */
export function openInstructorsManager() {
  const instructors = getInstructors();
  const rows = instructors.length
    ? instructors.map(i => `
        <div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;">
          <div>
            <div style="font-weight:600;font-size:14px;">${escHtml(i.name)}</div>
            ${i.note ? `<div style="font-size:12px;color:var(--text2);">${escHtml(i.note)}</div>` : ''}
            ${i.channel ? `<a href="${escHtml(i.channel)}" target="_blank" style="font-size:11px;color:var(--rose);">🔗 Chaîne</a>` : ''}
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm" onclick="editInstructor('${i.id}')" style="width:auto;padding:6px 10px;">✏️</button>
            <button class="btn btn-ghost btn-sm" onclick="deleteInstructor('${i.id}')" style="color:var(--rouge);border-color:rgba(212,130,122,.25);width:auto;padding:6px 10px;">🗑</button>
          </div>
        </div>`).join('')
    : `<div style="color:var(--text3);font-size:13px;text-align:center;padding:16px;">Aucune instructrice enregistrée.</div>`;
  openModal('👩‍🏫 Instructrices / Chaînes', `
    ${rows}
    <button class="btn btn-primary" style="margin-top:12px" onclick="openNewInstructorModal()">＋ Ajouter une instructrice</button>`);
}

export function editInstructor(id) {
  const inst = getInstructorById(id); if (!inst) return;
  openModal('✏️ Modifier l\'instructrice', `
    <div class="field"><label>Nom *</label><input id="inst-name" value="${escHtml(inst.name)}"/></div>
    <div class="field"><label>Lien de la chaîne</label><input id="inst-channel" value="${escHtml(inst.channel || '')}"/></div>
    <div class="field"><label>Note / Genre</label><input id="inst-note" value="${escHtml(inst.note || '')}"/></div>
    <button class="btn btn-primary" style="margin-top:8px" onclick="saveInstructorEdit('${id}')">💾 Enregistrer</button>`);
}

export function saveInstructorEdit(id) {
  const inst = getInstructorById(id); if (!inst) return;
  const name = document.getElementById('inst-name')?.value?.trim();
  if (!name) { showToast('❌ Le nom est requis'); return; }
  inst.name = name;
  inst.channel = document.getElementById('inst-channel')?.value?.trim() || '';
  inst.note = document.getElementById('inst-note')?.value?.trim() || '';
  save();
  document.getElementById('modal-overlay').classList.remove('open');
  showToast('✅ Instructrice mise à jour !');
  _renderInstructeursTab();
  // Les vidéos liées affichent automatiquement le nouveau nom via instructorName()
}

export function deleteInstructor(id) {
  const usedByVideo = (state.videos || []).some(v => v.instructorId === id);
  if (usedByVideo && !confirm('Cette instructrice est lié à des vidéos. Les vidéos garderont leur contenu mais n\'auront plus d\'instructrice. Continuer ?')) return;
  if (!usedByVideo && !confirm('Supprimer cette instructrice ?')) return;
  // Délier les vidéos qui référençaient cette instructrice
  (state.videos || []).forEach(v => { if (v.instructorId === id) v.instructorId = ''; });
  state.instructors = state.instructors.filter(i => i.id !== id);
  save();
  showToast('🗑 Instructrice supprimée');
  document.getElementById('modal-overlay')?.classList.remove('open');
  _renderInstructeursTab();
}

// ── Entrées ──
export function renderEntrees2() {
  const el = document.getElementById('entrees-list2'); if (!el) return;

  // Sessions de sport
  const sessionCards = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date)).map(s => {
    const ph = s.phase ? PHASES[s.phase] : null;
    const sets = s.logs?.reduce((a, l) => a + (l.completedSets?.length || 0), 0) || 0;
    return { date: s.date, html: `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
        <div><div style="font-size:15px;font-weight:600;">${escHtml(s.workoutName)}</div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px;">${formatDate(s.date)}${ph ? ' · <span class="pill ' + ph.cls + '" style="font-size:9px;padding:2px 7px;">' + ph.emoji + ' ' + ph.label + '</span>' : ''}</div></div>
        ${s.isVideo ? '<span class="yt-badge">▶ YouTube</span>' : ''}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
        <span class="pill pill-neutre" style="font-size:10px;">⏱ ${s.durationMin || 0} min</span>
        ${sets ? `<span class="pill pill-neutre" style="font-size:10px;">💪 ${sets} sets</span>` : ''}
        ${s.kcal ? `<span class="pill pill-neutre" style="font-size:10px;">🔥 ${s.kcal} kcal</span>` : ''}
        ${s.rpe ? `<span class="pill pill-neutre" style="font-size:10px;">RPE ${s.rpe}/10</span>` : ''}
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-ghost btn-sm" style="flex:1" onclick="editSessionEntry('${s.id}')">✏️ Modifier</button>
        <button class="btn btn-ghost btn-sm" style="flex:1;color:var(--rouge);border-color:rgba(212,130,122,.25);" onclick="deleteSessionEntry('${s.id}')">🗑 Supprimer</button>
      </div>
    </div>` };
  });

  // Entrées de pas
  const pasEntries = Object.entries(state.pas || {}).sort((a, b) => b[0].localeCompare(a[0])).map(([date, val]) => {
    const goal = state.pasGoal || 10000;
    const reached = val >= goal;
    return { date, html: `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
        <div><div style="font-size:15px;font-weight:600;">👟 Pas</div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px;">${formatDate(date)}</div></div>
        ${reached ? '<span style="font-size:18px;">🏆</span>' : ''}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
        <span class="pill pill-neutre" style="font-size:10px;">${val.toLocaleString('fr-FR')} pas</span>
        <span class="pill pill-neutre" style="font-size:10px;color:${reached ? 'var(--menthe)' : 'var(--text3)'};">${reached ? '✓ Objectif atteint' : Math.round((val / goal) * 100) + '% objectif'}</span>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-ghost btn-sm" style="flex:1" onclick="editPasEntry('${date}')">✏️ Modifier</button>
        <button class="btn btn-ghost btn-sm" style="flex:1;color:var(--rouge);border-color:rgba(212,130,122,.25);" onclick="deletePasEntry('${date}')">🗑 Supprimer</button>
      </div>
    </div>` };
  });

  // Fusionner et trier par date décroissante
  const all = [...sessionCards, ...pasEntries].sort((a, b) => b.date.localeCompare(a.date));
  if (!all.length) { el.innerHTML = `<div class="card" style="text-align:center;color:var(--text2);">Aucune entrée enregistrée encore.</div>`; return; }
  el.innerHTML = all.map(x => x.html).join('');
}
export function deleteSessionEntry(id) { if (!confirm('Supprimer cette séance ?')) return; state.sessions = state.sessions.filter(s => s.id !== id); save(); renderEntrees2(); showToast('🗑 Séance supprimée'); }

export function deletePasEntry(date) {
  if (!confirm('Supprimer cette entrée de pas ?')) return;
  if (state.pas) delete state.pas[date];
  save(); renderEntrees2(); renderPasScreen(); showToast('🗑 Entrée supprimée');
}
export function editPasEntry(date) {
  const val = (state.pas || {})[date] || 0;
  openModal('✏️ Modifier les pas', `
    <div class="field"><label>Date</label><input type="date" id="edit-pas-date" value="${date}" max="${todayStr()}"/></div>
    <div class="field"><label>Nombre de pas</label><input type="number" id="edit-pas-val" value="${val}" min="0" max="100000" inputmode="numeric"/></div>
    <button class="btn btn-primary" style="margin-top:8px" onclick="savePasEntry('${date}')">💾 Enregistrer</button>`);
}
export function savePasEntry(oldDate) {
  const newDate = document.getElementById('edit-pas-date')?.value;
  const val = parseInt(document.getElementById('edit-pas-val')?.value) || 0;
  if (!newDate) { showToast('❌ Choisis une date'); return; }
  if (val < 0) { showToast('❌ Nombre de pas invalide'); return; }
  if (!state.pas) state.pas = {};
  if (oldDate !== newDate) delete state.pas[oldDate];
  state.pas[newDate] = val;
  save();
  document.getElementById('modal-overlay').classList.remove('open');
  renderEntrees2(); renderPasScreen();
  showToast('✅ Pas mis à jour !');
}
export function editSessionEntry(id) {
  const s = state.sessions.find(x => x.id === id); if (!s) return;
  openModal('✏️ Modifier la séance', `
    <div class="field"><label>Nom</label><input id="edit-name" value="${escHtml(s.workoutName)}"/></div>
    <div class="field"><label>Date</label><input type="date" id="edit-date" value="${s.date}"/></div>
    <div class="field"><label>Durée (min)</label><input type="number" id="edit-dur" value="${s.durationMin || 0}" min="0" max="600"/></div>
    <div class="field"><label>kcal brûlées</label><input type="number" id="edit-kcal" value="${s.kcal || 0}" min="0" max="5000"/></div>
    <div class="field"><label>RPE (1-10)</label><input type="number" id="edit-rpe" value="${s.rpe || 0}" min="0" max="10"/></div>
    <div class="field"><label>Phase du cycle</label>
      <select id="edit-phase"><option value="">—</option>
        ${Object.entries(PHASES).map(([k, p]) => `<option value="${k}"${s.phase === k ? ' selected' : ''}>${p.emoji} ${p.label}</option>`).join('')}
      </select>
    </div>
    <button class="btn btn-primary" style="margin-top:8px" onclick="saveSessionEntry('${id}')">💾 Enregistrer</button>`);
}
export function saveSessionEntry(id) {
  const s = state.sessions.find(x => x.id === id); if (!s) return;
  s.workoutName = document.getElementById('edit-name')?.value?.trim() || s.workoutName;
  s.date = document.getElementById('edit-date')?.value || s.date;
  s.durationMin = parseInt(document.getElementById('edit-dur')?.value) || 0;
  s.kcal = parseInt(document.getElementById('edit-kcal')?.value) || 0;
  s.rpe = parseInt(document.getElementById('edit-rpe')?.value) || 0;
  s.phase = document.getElementById('edit-phase')?.value || '';
  save(); document.getElementById('modal-overlay').classList.remove('open'); renderEntrees2(); showToast('✅ Séance mise à jour !');
}

// ── Pas ──
export function renderPasScreen() {
  const today = todayStr(), pasData = state.pas || {}, goal = state.pasGoal || 10000, todayPas = pasData[today] || 0;
  const el = document.getElementById('pas-today-val'); if (el) el.textContent = todayPas.toLocaleString('fr-FR');
  const bar = document.getElementById('pas-goal-bar'); if (bar) bar.style.width = Math.min(100, Math.round((todayPas / goal) * 100)) + '%';
  const lbl = document.getElementById('pas-goal-label');
  if (lbl) { const pct = Math.round((todayPas / goal) * 100); lbl.textContent = `Objectif : ${goal.toLocaleString('fr-FR')} pas${todayPas >= goal ? ' ✓ Atteint !' : ' (' + pct + '%)'}`; lbl.style.color = todayPas >= goal ? 'var(--rose)' : 'var(--text3)'; }
  const input = document.getElementById('pas-input'); if (input && todayPas) input.value = todayPas;
  const goalInput = document.getElementById('pas-goal-input'); if (goalInput) goalInput.value = goal;
  // Inject "Jour passé" button next to history title if not already present
  const histEl = document.getElementById('pas-history-list');
  if (histEl && !document.getElementById('pas-retro-btn')) {
    const parent = histEl.parentElement;
    const titleEl = parent ? [...parent.children].find(c => c !== histEl && c.textContent?.includes('Historique')) : null;
    if (titleEl) {
      titleEl.style.cssText = (titleEl.style.cssText || '') + ';display:flex;justify-content:space-between;align-items:center;';
      const btn = document.createElement('button');
      btn.id = 'pas-retro-btn';
      btn.className = 'btn btn-ghost btn-sm';
      btn.style.cssText = 'width:auto;padding:5px 10px;font-size:12px;';
      btn.textContent = '+ Jour passé';
      btn.onclick = () => openAddPasRetro();
      titleEl.appendChild(btn);
    }
  }
  renderPasChart(); renderPasHistory();
}
export function savePasToday() {
  const val = parseInt(document.getElementById('pas-input')?.value) || 0;
  if (val < 0) { showToast('❌ Nombre de pas invalide'); return; }
  if (!state.pas) state.pas = {};
  state.pas[todayStr()] = val; save(); renderPasScreen();
  showToast(val >= (state.pasGoal || 10000) ? '🎉 Objectif atteint !' : '👟 Pas enregistrés !');
}

export function openAddPasRetro() {
  const today = todayStr();
  openModal('👟 Ajouter des pas', `
    <div class="field">
      <label>Date</label>
      <input type="date" id="pas-retro-date" value="${today}" max="${today}"/>
    </div>
    <div class="field">
      <label>Nombre de pas</label>
      <input type="number" id="pas-retro-val" min="0" max="100000" placeholder="Ex : 8500" inputmode="numeric"/>
    </div>
    <button class="btn btn-primary" style="margin-top:8px" onclick="savePasRetro()">💾 Enregistrer</button>`);
}

export function savePasRetro() {
  const date = document.getElementById('pas-retro-date')?.value;
  const val = parseInt(document.getElementById('pas-retro-val')?.value) || 0;
  if (!date) { showToast('❌ Choisis une date'); return; }
  if (val < 0) { showToast('❌ Nombre de pas invalide'); return; }
  if (!state.pas) state.pas = {};
  state.pas[date] = val;
  save();
  document.getElementById('modal-overlay').classList.remove('open');
  renderPasScreen();
  showToast(val >= (state.pasGoal || 10000) ? '🎉 Objectif atteint ce jour-là !' : '👟 Pas ajoutés !');
}
export function savePasGoal() {
  const val = parseInt(document.getElementById('pas-goal-input')?.value) || 10000;
  if (val < 100) { showToast('❌ Objectif trop bas'); return; }
  state.pasGoal = val; save(); renderPasScreen(); showToast('✅ Objectif mis à jour !');
}
// ── Graphique pas : navigation par semaine (Lun–Dim) ──
let _pasWeekOffset = 0; // 0 = semaine courante, -1 = semaine passée, etc.

/** Retourne le lundi de la semaine ISO contenant `date` (Date object) */
function _getMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=dim
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Les 7 dates ISO (lun→dim) de la semaine offset */
function _getWeekDates(offset) {
  const now = new Date();
  const monday = _getMonday(now);
  monday.setDate(monday.getDate() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export function pasWeekPrev()  { _pasWeekOffset--; renderPasChart(); }
export function pasWeekNext()  { if (_pasWeekOffset < 0) { _pasWeekOffset++; renderPasChart(); } }
export function pasWeekToday() { _pasWeekOffset = 0; renderPasChart(); }

function renderPasChart() {
  const container = document.getElementById('pas-week-chart');
  if (!container) return;

  const goal = state.pasGoal || 10000;
  const pas = state.pas || {};
  const today = todayStr();
  const dates = _getWeekDates(_pasWeekOffset);
  const isCurrentWeek = _pasWeekOffset === 0;

  const monday = dates[0], sunday = dates[6];
  const fmtShort = d => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const weekLabel = `${fmtShort(monday)} – ${fmtShort(sunday)}`;

  // ── Données semaine ──
  const values = dates.map(d => pas[d] || 0);
  const maxVal = Math.max(goal * 1.15, ...values, 1);

  // ── Stats globales ──
  const allEntries = Object.entries(pas);
  const weekTotal = values.reduce((a, b) => a + b, 0);
  const weekMax = Math.max(...values, 0);
  let globalAvg = 0;
  if (allEntries.length > 0) {
    const allDates = allEntries.map(([d]) => d).sort();
    const firstDate = new Date(allDates[0] + 'T12:00:00');
    const nowDate = new Date(today + 'T12:00:00');
    const totalDays = Math.max(1, Math.round((nowDate - firstDate) / 86400000) + 1);
    const totalSteps = allEntries.reduce((a, [, v]) => a + v, 0);
    globalAvg = Math.round(totalSteps / totalDays);
  }

  // ── Dimensions SVG ──
  const W = 360, H = 220;
  const marginLeft = 46, marginRight = 10, marginTop = 32, marginBottom = 38;
  const chartW = W - marginLeft - marginRight;
  const chartH = H - marginTop - marginBottom;
  const barW = Math.floor(chartW / 7 * 0.58);
  const gap  = chartW / 7;

  // ── Grille Y ──
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(frac => {
    const val = Math.round(maxVal * frac);
    const y = marginTop + chartH - frac * chartH;
    const lbl = val >= 1000 ? (val / 1000).toFixed(val % 1000 === 0 ? 0 : 1) + 'k' : val;
    return `
      <line x1="${marginLeft}" y1="${y}" x2="${W - marginRight}" y2="${y}" stroke="var(--border)" stroke-width="1" stroke-dasharray="${frac === 0 ? 'none' : '3,3'}"/>
      <text x="${marginLeft - 5}" y="${y + 4}" text-anchor="end" font-size="10" fill="var(--text3)">${lbl}</text>`;
  }).join('');

  // ── Ligne objectif ──
  const goalY = marginTop + chartH - (goal / maxVal) * chartH;
  const goalLine = `
    <line x1="${marginLeft}" y1="${goalY}" x2="${W - marginRight}" y2="${goalY}" stroke="var(--menthe)" stroke-width="1.5" stroke-dasharray="5,3" opacity="0.75"/>
    <text x="${W - marginRight}" y="${goalY - 4}" text-anchor="end" font-size="9" fill="var(--menthe)" font-weight="600" opacity="0.9">objectif</text>`;

  // ── Barres ──
  const DAY_LABELS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
  const bars = dates.map((d, i) => {
    const v = values[i];
    const reached = v >= goal;
    const isToday = d === today;
    const isFuture = d > today;
    const barH = v > 0 ? Math.max(4, Math.round((v / maxVal) * chartH)) : 0;
    const x = marginLeft + i * gap + gap / 2 - barW / 2;
    const y = marginTop + chartH - barH;
    const fill = isFuture ? 'var(--bg3)' : reached ? 'var(--menthe)' : v > 0 ? 'var(--rose)' : 'var(--bg3)';
    const todayRect = isToday
      ? `<rect x="${x - 3}" y="${marginTop - 8}" width="${barW + 6}" height="${chartH + 12}" rx="5" fill="var(--rose-lt)" opacity="0.45"/>`
      : '';
    const txt = v >= 1000 ? (v / 1000).toFixed(1).replace('.0', '') + 'k' : v > 0 ? v : '';
    const valLabel = txt
      ? `<text x="${x + barW / 2}" y="${y - 5}" text-anchor="middle" font-size="9.5" font-weight="${reached ? '700' : '500'}" fill="${reached ? 'var(--menthe)' : 'var(--text2)'}">${txt}</text>`
      : '';
    const bar = v > 0
      ? `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="${fill}"/>`
      : `<rect x="${x}" y="${marginTop + chartH - 3}" width="${barW}" height="3" rx="1.5" fill="${fill}" opacity="0.35"/>`;
    const dayLbl = `<text x="${x + barW / 2}" y="${H - marginBottom + 16}" text-anchor="middle" font-size="11" font-weight="${isToday ? '700' : '400'}" fill="${isToday ? 'var(--rose)' : 'var(--text2)'}">${DAY_LABELS[i]}</text>`;
    const dateLbl = `<text x="${x + barW / 2}" y="${H - marginBottom + 29}" text-anchor="middle" font-size="9" fill="${isToday ? 'var(--rose)' : 'var(--text3)'}" opacity="0.8">${new Date(d + 'T12:00:00').getDate()}</text>`;
    return todayRect + bar + valLabel + dayLbl + dateLbl;
  }).join('');

  const fmt = n => n.toLocaleString('fr-FR');

  container.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
      <div>
        <div style="font-size:14px;font-weight:700;color:var(--text);">${isCurrentWeek ? 'Cette semaine' : weekLabel}</div>
        ${isCurrentWeek ? `<div style="font-size:11px;color:var(--text3);margin-top:2px;">${weekLabel}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:4px;">
        ${!isCurrentWeek ? `<button onclick="pasWeekToday()" style="background:var(--rose-lt);border:1px solid rgba(232,130,154,.3);color:var(--rose);font-size:11px;font-weight:600;border-radius:20px;padding:3px 11px;cursor:pointer;white-space:nowrap;">Aujourd'hui</button>` : ''}
        <button onclick="pasWeekPrev()" style="background:var(--bg3);border:1px solid var(--border2);cursor:pointer;font-size:16px;color:var(--text2);width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;line-height:1;">‹</button>
        <button onclick="pasWeekNext()" style="background:var(--bg3);border:1px solid var(--border2);cursor:pointer;font-size:16px;color:${_pasWeekOffset < 0 ? 'var(--text2)' : 'var(--text3)'};width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;line-height:1;" ${_pasWeekOffset >= 0 ? 'disabled' : ''}>›</button>
      </div>
    </div>
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;">
      ${gridLines}
      ${goalLine}
      ${bars}
    </svg>
`

  // ── Stats dans la div séparée ──
  const statsEl = document.getElementById('pas-stats-content');
  if (statsEl) {
    statsEl.innerHTML = `
      <div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">📊 Statistiques</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
        <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:12px 8px;text-align:center;">
          <div style="font-size:20px;font-weight:700;color:var(--rose);font-family:var(--font-display);">${fmt(weekTotal)}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:4px;line-height:1.3;">Total semaine</div>
        </div>
        <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:12px 8px;text-align:center;">
          <div style="font-size:20px;font-weight:700;color:var(--text);font-family:var(--font-display);">${fmt(globalAvg)}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:4px;line-height:1.3;">Moy. / jour</div>
        </div>
        <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:12px 8px;text-align:center;">
          <div style="font-size:20px;font-weight:700;color:${weekMax >= goal ? 'var(--menthe)' : 'var(--text)'};font-family:var(--font-display);">${fmt(weekMax)}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:4px;line-height:1.3;">Max semaine</div>
        </div>
      </div>`;
  };
}


function renderPasHistory() {
  const el = document.getElementById('pas-history-list'); if (!el) return;
  const pas = state.pas || {}, goal = state.pasGoal || 10000;
  const entries = Object.entries(pas).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);
  if (!entries.length) { el.innerHTML = `<div style="color:var(--text3);font-size:13px;">Aucune donnée encore. Commence à tracker ! 👟</div>`; return; }
  el.innerHTML = entries.map(([date, val]) => {
    const reached = val >= goal;
    return `<div class="health-history-row"><div><div style="font-size:14px;font-weight:500;">${formatDate(date)}</div><div style="font-size:11px;color:var(--text3);">${reached ? '✓ Objectif atteint' : Math.round((val / goal) * 100) + '% de l\'objectif'}</div></div><div style="display:flex;align-items:center;gap:6px;"><div style="font-family:var(--font-display);font-size:18px;color:${reached ? 'var(--menthe)' : 'var(--text)'};">${val.toLocaleString('fr-FR')}</div><div style="font-size:11px;color:var(--text3);">pas</div>${reached ? '<span style="font-size:14px;">🏆</span>' : ''}</div></div>`;
  }).join('');
}

// ── Challenges ──
export { renderChallengesScreen, openNewChallenge, openChallengeSession, toggleChallengeActive, deleteChallenge, archiveChallenge, saveNewChallenge, selectChallengeType, setChallengedays, challengeTimerToggle, challengeTimerReset, updateChallengeTimerDisplay, adjustReps, completeChallengeSession, completeChallengeReps } from './challenges.js';