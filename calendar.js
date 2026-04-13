import { state } from '../state.js';
import { save } from '../state.js';
import { PHASES, todayStr, formatDate, escHtml, getPhaseForDate, showToast, openModal, closeModal } from '../utils.js';

let calDate = new Date();

export function renderCalendar() {
  const yr = calDate.getFullYear(), mo = calDate.getMonth();
  document.getElementById('cal-month-label').textContent = new Date(yr, mo).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const first = new Date(yr, mo, 1), last = new Date(yr, mo + 1, 0);
  let start = first.getDay() - 1; if (start < 0) start = 6;
  const today = todayStr(); let html = '';
  for (let i = 0; i < start; i++) { const d = new Date(yr, mo, -start + i + 1); html += `<div class="cal-day other-month">${d.getDate()}</div>`; }
  for (let d = 1; d <= last.getDate(); d++) {
    const ds = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const ph = getPhaseForDate(ds), hasW = state.sessions.some(s => s.date === ds), hasP = !!(state.planning || {})[ds];
    html += `<div class="cal-day${ds === today ? ' today' : ''}${ph ? ' phase-' + ph : ''}${hasW ? ' has-workout' : ''}${hasP ? ' has-plan' : ''}" onclick="showDayDetail('${ds}')">${d}${hasP ? '<span style="font-size:6px;color:var(--lilas);position:absolute;top:3px;right:3px;">◆</span>' : ''}</div>`;
  }
  document.getElementById('cal-grid').innerHTML = html;
}

export function showDayDetail(ds) {
  document.getElementById('cal-day-detail').style.display = '';
  document.getElementById('cal-day-title').textContent = formatDate(ds);
  const ph = getPhaseForDate(ds), sessions = state.sessions.filter(s => s.date === ds), log = state.logs[ds];
  const planned = (state.planning || {})[ds];
  let html = '';
  if (ph) { const p = PHASES[ph]; html += `<div style="margin-bottom:10px;"><span class="pill ${p.cls}">${p.emoji} ${p.label}</span></div>`; }
  if (planned) {
    html += `<div style="background:var(--lilas-lt);border:1px solid rgba(184,159,212,.3);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
      <div><div style="font-size:10px;font-weight:700;color:var(--lilas);letter-spacing:.5px;text-transform:uppercase;margin-bottom:2px;">📅 Planifié</div>
      <div style="font-weight:600;font-size:14px;">${escHtml(planned.name)}</div></div>
      ${planned.type === 'workout' ? `<button class="btn btn-primary btn-sm" onclick="startWorkoutById('${planned.id}');closeDetailIfNeeded()">▶ Lancer</button>` : `<button class="btn btn-primary btn-sm" onclick="openYtVideo('${escHtml((state.videos.find(v => v.id === planned.id) || {}).url || '')}')">▶ Voir</button>`}
    </div>`;
  }
  sessions.forEach(s => { html += `<div style="background:var(--bg3);border-radius:var(--radius-sm);padding:10px;margin-bottom:8px;"><div style="font-weight:600;">${escHtml(s.workoutName)}</div><div style="font-size:12px;color:var(--text2);">${s.durationMin}min · ${s.logs?.length || 0} exos · RPE ${s.rpe || '—'}</div></div>`; });
  if (log) html += `<div style="font-size:12px;color:var(--text2);">Énergie: ${'⚡'.repeat(log.energy || 0)} · Humeur: ${'🙂'.repeat(log.mood || 0)}</div>${log.note ? `<div style="font-size:13px;color:var(--text2);margin-top:4px;font-style:italic;">"${escHtml(log.note)}"</div>` : ''}`;
  if (!sessions.length && !log && !planned) html += `<div style="color:var(--text3);font-size:13px;">Pas d'activité ce jour.</div>`;

  const allPeriodDates = [state.cycle?.lastDate, ...(state.periodHistory || [])].filter(Boolean);
  const isCurrentPeriodStart = allPeriodDates.includes(ds);
  html += `<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px;display:flex;flex-direction:column;gap:6px;">
    ${isCurrentPeriodStart
      ? `<div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" style="flex:1;color:var(--menthe);border-color:rgba(126,200,184,.3);">✅ Règles marquées ici</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--rouge);border-color:rgba(212,130,122,.25);" onclick="cancelPeriodStart('${ds}')">🗑 Annuler</button>
        </div>`
      : `<button class="btn btn-primary btn-sm" style="width:100%;" onclick="setPeriodStart('${ds}')">🌊 Marquer début des règles</button>`
    }
    <button class="btn btn-ghost btn-sm" style="width:100%;" onclick="openPlanDay('${ds}')">📅 ${planned ? 'Modifier le planning' : 'Programmer un entraînement'}</button>
  </div>`;
  document.getElementById('cal-day-content').innerHTML = html;
  document.getElementById('cal-day-detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function closeDetailIfNeeded() {
  document.getElementById('modal-overlay').classList.remove('open');
}

export function setPeriodStart(ds) {
  if (!state.cycle) {
    state.cycle = { lastDate: ds, cycleLen: 28, rulesLen: 5 };
    state.periodHistory = [ds];
  } else {
    state.periodHistory = state.periodHistory || [];
    if (!state.periodHistory.includes(ds)) state.periodHistory.push(ds);
    const allDates = [ds, ...state.periodHistory].sort((a, b) => b.localeCompare(a));
    state.cycle.lastDate = allDates[0];
  }
  save(); renderCalendar(); showDayDetail(ds);
  // renderHome will be called via import in main
  window.renderHome?.();
  showToast('🌊 Début des règles enregistré !');
}

export function cancelPeriodStart(ds) {
  if (!state.periodHistory) return;
  state.periodHistory = state.periodHistory.filter(d => d !== ds);
  const remaining = [...state.periodHistory].sort((a, b) => b.localeCompare(a));
  if (state.cycle) state.cycle.lastDate = remaining[0] || state.cycle.lastDate;
  save(); renderCalendar(); showDayDetail(ds); showToast('🗑 Date des règles annulée');
}

export function openPlanDay(ds) {
  const ph = getPhaseForDate(ds);
  const matchW = state.workouts.filter(w => !ph || !w.phases?.length || w.phases.includes(ph));
  const otherW = state.workouts.filter(w => ph && w.phases?.length && !w.phases.includes(ph));
  const matchV = state.videos.filter(v => !ph || !v.phases?.length || v.phases.includes(ph));
  const otherV = state.videos.filter(v => ph && v.phases?.length && !v.phases.includes(ph));
  const phLabel = ph ? `<div style="margin-bottom:10px;font-size:12px;color:var(--text2);">Phase du jour : <span class="pill ${PHASES[ph]?.cls}" style="font-size:10px;">${PHASES[ph]?.emoji} ${PHASES[ph]?.label}</span></div>` : '';
  const mkW = arr => arr.map(w => `<option value="w:${w.id}">${escHtml(w.name)}</option>`).join('');
  const mkV = arr => arr.map(v => `<option value="v:${v.id}">${escHtml(v.name)}${v.instructor ? ' — ' + escHtml(v.instructor) : ''}</option>`).join('');
  let optsHtml = '<option value="">— Sélectionne —</option>';
  if (matchW.length) optsHtml += `<optgroup label="✅ Séances (phase adaptée)">${mkW(matchW)}</optgroup>`;
  if (matchV.length) optsHtml += `<optgroup label="✅ Vidéos (phase adaptée)">${mkV(matchV)}</optgroup>`;
  if (otherW.length) optsHtml += `<optgroup label="— Autres séances">${mkW(otherW)}</optgroup>`;
  if (otherV.length) optsHtml += `<optgroup label="— Autres vidéos">${mkV(otherV)}</optgroup>`;
  const existing = (state.planning || {})[ds];
  openModal('📅 Programmer — ' + formatDate(ds), `
    ${phLabel}
    <div class="field"><label>Choisir un entraînement</label>
      <select id="plan-pick" style="width:100%;padding:12px 14px;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius-sm);font-size:14px;">
        ${optsHtml}
      </select>
    </div>
    ${existing ? `<div style="margin-bottom:12px;padding:10px 12px;background:var(--menthe-lt);border-radius:var(--radius-sm);font-size:13px;color:var(--text2);">📌 Déjà planifié : <strong>${escHtml(existing.name)}</strong></div>` : ''}
    <div style="display:flex;gap:8px;">
      <button class="btn btn-primary" style="flex:1" onclick="savePlanDay('${ds}')">💾 Planifier</button>
      ${existing ? `<button class="btn btn-ghost btn-sm" style="color:var(--rouge);" onclick="removePlanDay('${ds}')">🗑 Retirer</button>` : ''}
    </div>`);
}

export function savePlanDay(ds) {
  const val = document.getElementById('plan-pick')?.value;
  if (!val) { showToast('❌ Sélectionne un entraînement'); return; }
  const [type, id] = val.split(':');
  let name = '', ref = {};
  if (type === 'w') { const w = state.workouts.find(x => x.id === id); if (!w) return; name = w.name; ref = { type: 'workout', id }; }
  else { const v = state.videos.find(x => x.id === id); if (!v) return; name = v.name; ref = { type: 'video', id }; }
  state.planning = state.planning || {};
  state.planning[ds] = { ...ref, name };
  save(); closeModal(); renderCalendar(); showDayDetail(ds); showToast('📅 Entraînement planifié !');
}

export function removePlanDay(ds) {
  delete state.planning[ds];
  save(); closeModal(); renderCalendar(); showDayDetail(ds); showToast('🗑 Planning retiré');
}

export function calPrev() { calDate = new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1); renderCalendar(); }
export function calNext() { calDate = new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1); renderCalendar(); }
export function calToday() { calDate = new Date(); renderCalendar(); }
