import { state } from '../state.js';
import { save } from '../state.js';
import { PHASES, EXERCISE_LIBRARY, todayStr, formatDate, escHtml, getPhaseForDate, showToast, openModal, ytVideoId, ytThumb } from '../utils.js';

let _sportTab = 'seances';
let _videoPhaseFilter2 = '', _videoInstructorFilter2 = '';

export function renderSportScreen() { switchSportTab(_sportTab, true); }

export function switchSportTab(tab, force) {
  if (_sportTab === tab && !force) return;
  _sportTab = tab;
  const panels = ['seances', 'videos', 'pas', 'entrees', 'challenges'];
  panels.forEach(p => {
    const el = document.getElementById('sport-panel-' + p);
    const btn = document.getElementById('sport-tab-' + p);
    if (!el || !btn) return;
    const active = p === tab;
    el.style.display = active ? '' : 'none';
    btn.style.background = active ? 'var(--bg2)' : 'none';
    btn.style.color = active ? 'var(--text)' : 'var(--text2)';
    btn.style.boxShadow = active ? '0 1px 3px rgba(180,130,110,.1)' : 'none';
  });
  if (tab === 'seances')    renderWorkouts2();
  if (tab === 'videos')     renderVideosScreen2();
  if (tab === 'pas')        renderPasScreen();
  if (tab === 'entrees')    renderEntrees2();
  if (tab === 'challenges') renderChallengesScreen();
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

export function openNewWorkout() { editingWorkoutId = null; tempExercises = []; workoutMode = 'sequential'; openModal('Nouvelle séance', workoutForm(null)); }

export function editWorkout(id) {
  const w = state.workouts.find(x => x.id === id); if (!w) return;
  editingWorkoutId = id; tempExercises = JSON.parse(JSON.stringify(w.exercises)); workoutMode = w.mode || 'sequential';
  openModal('Modifier la séance', workoutForm(w));
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
  const el = document.getElementById('videos-list2'); if (!el) return;
  const filtered = (state.videos || []).filter(v => {
    if (_videoPhaseFilter2 && !(v.phases?.includes(_videoPhaseFilter2))) return false;
    if (_videoInstructorFilter2 && v.instructor !== _videoInstructorFilter2) return false;
    return true;
  });
  const instEl = document.getElementById('video-instructor-filter2');
  if (instEl) {
    const insts = [...new Set((state.videos || []).map(v => v.instructor).filter(Boolean))];
    instEl.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-start;margin-bottom:12px;';
    instEl.innerHTML = insts.length
      ? [`<div onclick="filterInstructor2('')" style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;"><div style="width:40px;height:40px;border-radius:50%;background:${!_videoInstructorFilter2 ? 'var(--rose)' : 'var(--bg3)'};display:flex;align-items:center;justify-content:center;font-size:20px;border:2px solid ${!_videoInstructorFilter2 ? 'var(--rose)' : 'var(--border2)'};">👸</div><span style="font-size:10px;font-weight:600;color:${!_videoInstructorFilter2 ? 'var(--rose)' : 'var(--text2)'};">Tous</span></div>`]
        .concat(insts.map(ins => `<div onclick="filterInstructor2('${escHtml(ins)}')" style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;"><div style="width:40px;height:40px;border-radius:50%;background:${_videoInstructorFilter2 === ins ? 'var(--rose)' : 'var(--bg3)'};display:flex;align-items:center;justify-content:center;font-size:20px;border:2px solid ${_videoInstructorFilter2 === ins ? 'var(--rose)' : 'var(--border2)'};">👸</div><span style="font-size:10px;font-weight:600;color:${_videoInstructorFilter2 === ins ? 'var(--rose)' : 'var(--text2)'};text-align:center;max-width:56px;line-height:1.2;">${escHtml(ins.split(' ')[0])}</span></div>`)).join('')
      : '';
  }
  if (!filtered.length) { el.innerHTML = `<div class="card" style="text-align:center;color:var(--text2);">Aucune vidéo${_videoPhaseFilter2 ? ' pour cette phase' : ''}. Ajoute-en une ! 🎬</div>`; return; }
  el.innerHTML = filtered.map(v => {
    const phasePills = v.phases?.length ? `<div class="yt-phases-row">${v.phases.map(p => `<span class="pill ${PHASES[p]?.cls || 'pill-neutre'}" style="font-size:10px;">${PHASES[p]?.emoji || ''} ${PHASES[p]?.label || p}</span>`).join('')}</div>` : '';
    const doneBadge = v.done ? `<span class="yt-done-badge">✓ Fait le ${formatDate(v.doneDate || '')}</span>` : '';
    const kcalBadge = v.done && v.kcal ? `<span class="pill pill-neutre" style="font-size:10px;">🔥 ${v.kcal} kcal</span>` : '';
    const minBadge = v.minutes ? `<span class="pill pill-neutre" style="font-size:10px;">⏱ ${v.minutes} min</span>` : '';
    return `<div class="yt-card${v.done ? ' done' : ''}">
      ${v.videoId ? `<div class="yt-thumbnail-container" onclick="openYtVideo('${escHtml(v.url)}')"><img class="yt-thumbnail" src="${ytThumb(v.videoId)}" alt="${escHtml(v.name)}" loading="lazy"/><div class="yt-play-btn"><div class="yt-play-icon"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></div></div></div>` : ''}
      <div class="yt-card-body">
        ${phasePills}
        <div class="yt-card-title">${escHtml(v.name)}</div>
        <div class="yt-card-meta">${v.instructor ? escHtml(v.instructor) + ' · ' : ''}<span class="yt-badge">▶ YouTube</span></div>
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

export function filterVideos2(phase) { _videoPhaseFilter2 = phase; renderVideosScreen2(); }
export function filterInstructor2(ins) { _videoInstructorFilter2 = ins; renderVideosScreen2(); }
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

export function openAddVideo() {
  const phaseOptions = Object.entries(PHASES).map(([k, p]) => `<label class="phases-multi-option" onclick="toggleVideoPhase('${k}',this)"><input type="checkbox" value="${k}"/><span style="font-size:16px;">${p.emoji}</span><span class="phase-opt-label">${p.label}</span></label>`).join('');
  openModal('🎬 Ajouter une vidéo', `
    <div class="field"><label>Lien YouTube</label><input id="vid-url" placeholder="https://youtube.com/watch?v=..." oninput="previewYtThumb()"/></div>
    <div id="vid-thumb-preview" style="margin-bottom:12px;border-radius:var(--radius-sm);overflow:hidden;display:none;"><img id="vid-thumb-img" style="width:100%;aspect-ratio:16/9;object-fit:cover;" alt=""/></div>
    <div class="field"><label>Nom de la séance</label><input id="vid-name" placeholder="Ex: Yoga doux menstruel"/></div>
    <div class="field"><label>Durée (minutes)</label><input id="vid-minutes" type="number" min="0" max="300" placeholder="Ex: 30" inputmode="numeric" oninput="this.value=this.value.replace(/[^0-9]/g,'')"/></div>
    <div class="field"><label>Instructeur / Chaîne</label><input id="vid-instructor" list="instructor-list" placeholder="Ex: Lidia Mera"/>
      <datalist id="instructor-list">${[...new Set((state.videos || []).map(v => v.instructor).filter(Boolean))].map(n => `<option value="${escHtml(n)}"/>`).join('')}</datalist>
    </div>
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
  const instructor = document.getElementById('vid-instructor')?.value?.trim() || '';
  state.videos.push({ id: Date.now().toString(), url, videoId, name, minutes, instructor, phases });
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
    <div class="field"><label>Instructeur / Chaîne</label><input id="vid-instructor" value="${escHtml(v.instructor || '')}" placeholder="Ex: Lidia Mera"/></div>
    <div class="field"><label>Phases du cycle</label><div class="phases-multi-select" id="vid-phases">${phaseOptions}</div></div>
    <button class="btn btn-primary" style="margin-top:8px" onclick="saveVideoEdit('${id}')">💾 Enregistrer</button>`);
}
export function saveVideoEdit(id) {
  const v = state.videos.find(x => x.id === id); if (!v) return;
  const url = document.getElementById('vid-url')?.value?.trim(); if (!url) { showToast('❌ Lien YouTube requis'); return; }
  v.url = url; v.videoId = ytVideoId(url) || v.videoId;
  v.name = document.getElementById('vid-name')?.value?.trim() || v.name;
  v.minutes = parseInt(document.getElementById('vid-minutes')?.value) || 0;
  v.instructor = document.getElementById('vid-instructor')?.value?.trim() || '';
  v.phases = [...document.querySelectorAll('#vid-phases input[type=checkbox]:checked')].map(cb => cb.value);
  save(); document.getElementById('modal-overlay').classList.remove('open'); renderVideosScreen2(); showToast('✅ Vidéo mise à jour !');
}

// ── Entrées ──
export function renderEntrees2() {
  const el = document.getElementById('entrees-list2'); if (!el) return;
  const sorted = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date));
  if (!sorted.length) { el.innerHTML = `<div class="card" style="text-align:center;color:var(--text2);">Aucune séance enregistrée encore.</div>`; return; }
  el.innerHTML = sorted.map(s => {
    const ph = s.phase ? PHASES[s.phase] : null;
    const sets = s.logs?.reduce((a, l) => a + (l.completedSets?.length || 0), 0) || 0;
    return `<div class="card">
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
    </div>`;
  }).join('');
}
export function deleteSessionEntry(id) { if (!confirm('Supprimer cette séance ?')) return; state.sessions = state.sessions.filter(s => s.id !== id); save(); renderEntrees2(); showToast('🗑 Séance supprimée'); }
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
  renderPasChart(); renderPasHistory();
}
export function savePasToday() {
  const val = parseInt(document.getElementById('pas-input')?.value) || 0;
  if (val < 0) { showToast('❌ Nombre de pas invalide'); return; }
  if (!state.pas) state.pas = {};
  state.pas[todayStr()] = val; save(); renderPasScreen();
  showToast(val >= (state.pasGoal || 10000) ? '🎉 Objectif atteint !' : '👟 Pas enregistrés !');
}
export function savePasGoal() {
  const val = parseInt(document.getElementById('pas-goal-input')?.value) || 10000;
  if (val < 100) { showToast('❌ Objectif trop bas'); return; }
  state.pasGoal = val; save(); renderPasScreen(); showToast('✅ Objectif mis à jour !');
}
function renderPasChart() {
  const el = document.getElementById('pas-week-chart'); if (!el) return;
  const goal = state.pasGoal || 10000, pas = state.pas || {};
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().slice(0, 10); });
  const maxVal = Math.max(goal, ...days.map(d => pas[d] || 0));
  el.innerHTML = days.map(d => {
    const v = pas[d] || 0, h = Math.round((v / maxVal) * 78) + 4, reached = v >= goal;
    const label = new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2);
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;"><div style="font-size:9px;color:${reached ? 'var(--menthe)' : 'var(--text3)'};">${v ? v.toLocaleString('fr-FR') : ''}</div><div style="width:100%;height:${h}px;background:${v ? (reached ? 'var(--menthe)' : 'var(--rose)') : 'var(--bg3)'};border-radius:4px 4px 0 0;"></div><div style="font-size:10px;color:var(--text3);">${label}</div></div>`;
  }).join('');
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
