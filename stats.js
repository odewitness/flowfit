import { state } from '../state.js';
import { PHASES, escHtml } from '../utils.js';

export function switchSanteTab(tab) {
  document.getElementById('sante-panel-sante').style.display = tab === 'sante' ? '' : 'none';
  document.getElementById('sante-panel-stats').style.display = tab === 'stats' ? '' : 'none';
  const tSante = document.getElementById('sante-tab-sante');
  const tStats = document.getElementById('sante-tab-stats');
  if (tSante && tStats) {
    tSante.style.background = tab === 'sante' ? 'var(--bg2)' : 'none';
    tSante.style.color = tab === 'sante' ? 'var(--text)' : 'var(--text2)';
    tSante.style.boxShadow = tab === 'sante' ? '0 1px 3px rgba(180,130,110,.1)' : 'none';
    tStats.style.background = tab === 'stats' ? 'var(--bg2)' : 'none';
    tStats.style.color = tab === 'stats' ? 'var(--text)' : 'var(--text2)';
    tStats.style.boxShadow = tab === 'stats' ? '0 1px 3px rgba(180,130,110,.1)' : 'none';
  }
  if (tab === 'stats') renderStats();
}

export function renderStats() {
  const S = state.sessions;
  document.getElementById('stat-total-sessions').textContent = S.length;
  document.getElementById('stat-total-min').textContent = S.reduce((a, s) => a + (s.durationMin || 0), 0);
  document.getElementById('stat-total-exos').textContent = S.reduce((a, s) => a + (s.logs?.reduce((b, l) => b + (l.completedSets?.length || 0), 0) || 0), 0);
  document.getElementById('stat-total-kcal').textContent = S.reduce((a, s) => a + (s.kcal || 0), 0);

  const pc = { mens: 0, folliculaire: 0, ovulation: 0, luteale: 0 };
  S.forEach(s => { if (s.phase && pc[s.phase] !== undefined) pc[s.phase]++; });
  const maxP = Math.max(1, ...Object.values(pc));
  document.getElementById('phase-chart').innerHTML = Object.entries(pc).map(([p, v]) =>
    `<div style="flex:1;background:${PHASES[p].color}22;border-radius:4px 4px 0 0;height:${Math.round((v / maxP) * 80) + 4}px;border:1px solid ${PHASES[p].color}44;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px;"><span style="font-size:11px;font-weight:700;color:${PHASES[p].color}">${v}</span></div>`
  ).join('');
  document.getElementById('phase-chart-labels').innerHTML = Object.keys(pc).map(p =>
    `<div style="flex:1;font-size:9px;color:var(--text3);text-align:center;">${PHASES[p].label.slice(0, 5)}.</div>`
  ).join('');

  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().slice(0, 10); });
  const maxM = Math.max(1, ...days.map(d => S.filter(s => s.date === d).reduce((a, s) => a + (s.durationMin || 0), 0)));
  document.getElementById('week-chart').innerHTML = days.map(d => {
    const m = S.filter(s => s.date === d).reduce((a, s) => a + (s.durationMin || 0), 0);
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;"><div style="width:100%;height:${Math.round((m / maxM) * 68) + 4}px;background:${m ? 'var(--rose)' : 'var(--bg3)'};border-radius:4px 4px 0 0;"></div><div style="font-size:10px;color:var(--text3);">${new Date(d).toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2)}</div></div>`;
  }).join('');

  const mbp = { mens: [], folliculaire: [], ovulation: [], luteale: [] };
  S.forEach(s => { if (s.phase && s.mood && mbp[s.phase]) mbp[s.phase].push(s.mood); });
  document.getElementById('mood-by-phase').innerHTML = Object.entries(mbp).map(([p, m]) => {
    const avg = m.length ? (m.reduce((a, b) => a + b, 0) / m.length).toFixed(1) : null;
    return `<div class="exo-row"><div class="exo-dot" style="background:${PHASES[p].color}"></div><div class="exo-name">${PHASES[p].label}</div><div class="exo-detail">${avg ? '🙂 ' + avg + '/5' : '—'}</div></div>`;
  }).join('');

  renderExoStats();
  renderVideoStats();
  renderPasStats();
}

export function renderExoStats() {
  const q = (document.getElementById('exo-filter')?.value || '').toLowerCase();
  const map = {};
  state.sessions.forEach(s => {
    s.logs?.forEach(l => {
      if (!l.name) return;
      if (!map[l.name]) map[l.name] = { name: l.name, sets: 0, totalReps: 0, maxWeight: 0, sessions: new Set(), inWorkouts: new Set() };
      const e = map[l.name];
      l.completedSets?.forEach(cs => { e.sets++; e.totalReps += cs.reps || 0; e.maxWeight = Math.max(e.maxWeight, cs.weight || 0); });
      e.sessions.add(s.date);
    });
  });
  state.workouts.forEach(w => w.exercises.forEach(ex => { if (map[ex.name]) map[ex.name].inWorkouts.add(w.name); }));
  const list = Object.values(map).filter(e => !q || e.name.toLowerCase().includes(q)).sort((a, b) => b.sets - a.sets);
  const el = document.getElementById('exo-stats-list');
  if (!list.length) { el.innerHTML = `<div style="color:var(--text3);font-size:13px;">Aucune donnée encore.</div>`; return; }
  el.innerHTML = list.map(e => `
    <div class="exo-stat-card">
      <div style="font-weight:600;font-size:14px;margin-bottom:8px;">${escHtml(e.name)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px;">
        <div style="text-align:center;background:var(--bg2);border-radius:8px;padding:8px 4px;"><div style="font-family:var(--font-display);font-size:20px;">${e.sets}</div><div style="font-size:10px;color:var(--text3);">Sets</div></div>
        <div style="text-align:center;background:var(--bg2);border-radius:8px;padding:8px 4px;"><div style="font-family:var(--font-display);font-size:20px;">${e.totalReps}</div><div style="font-size:10px;color:var(--text3);">Reps</div></div>
        <div style="text-align:center;background:var(--bg2);border-radius:8px;padding:8px 4px;"><div style="font-family:var(--font-display);font-size:20px;">${e.maxWeight || '—'}</div><div style="font-size:10px;color:var(--text3);">Max kg</div></div>
      </div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:6px;">${e.sessions.size} séance${e.sessions.size > 1 ? 's' : ''}</div>
      ${e.inWorkouts.size ? `<div style="display:flex;flex-wrap:wrap;gap:4px;">${[...e.inWorkouts].map(n => `<span class="pill pill-rose" style="font-size:10px;">📋 ${escHtml(n)}</span>`).join('')}</div>` : ''}
    </div>`).join('');
}

export function renderVideoStats() {
  const el = document.getElementById('video-stats-list'); if (!el) return;
  const vidSessions = state.sessions.filter(s => s.isVideo);
  if (!vidSessions.length) { el.innerHTML = `<div style="color:var(--text3);font-size:13px;">Aucune vidéo réalisée encore.</div>`; return; }
  const map = {};
  vidSessions.forEach(s => {
    if (!map[s.workoutName]) map[s.workoutName] = { name: s.workoutName, count: 0, phases: {} };
    map[s.workoutName].count++;
    const ph = s.phase || 'inconnu';
    map[s.workoutName].phases[ph] = (map[s.workoutName].phases[ph] || 0) + 1;
  });
  const list = Object.values(map).sort((a, b) => b.count - a.count);
  el.innerHTML = list.map(v => {
    const phPills = Object.entries(v.phases).map(([ph, cnt]) => {
      const p = PHASES[ph];
      return p ? `<span class="pill ${p.cls}" style="font-size:10px;">${p.emoji} ${p.label} ×${cnt}</span>` : `<span class="pill pill-neutre" style="font-size:10px;">Phase inconnue ×${cnt}</span>`;
    }).join('');
    return `<div class="exo-stat-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-weight:600;font-size:14px;">🎬 ${escHtml(v.name)}</div>
        <div style="font-family:var(--font-display);font-size:22px;color:var(--rose);">${v.count}×</div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;">${phPills}</div>
    </div>`;
  }).join('');
}

export function renderPasStats() {
  const el = document.getElementById('pas-stats-block'); if (!el) return;
  const pas = state.pas || {};
  const goal = state.pasGoal || 10000;
  const entries = Object.entries(pas);
  if (!entries.length) { el.innerHTML = `<div style="color:var(--text3);font-size:13px;">Aucune donnée de pas encore.</div>`; return; }
  const total = entries.reduce((a, [, v]) => a + v, 0);
  const avg = Math.round(total / entries.length);
  const best = Math.max(...entries.map(([, v]) => v));
  const daysGoal = entries.filter(([, v]) => v >= goal).length;
  el.innerHTML = `<div class="metrics" style="grid-template-columns:1fr 1fr;margin-bottom:0;">
    <div class="metric"><div class="metric-val">${avg.toLocaleString('fr-FR')}</div><div class="metric-lbl">Moy. / jour</div></div>
    <div class="metric"><div class="metric-val">${best.toLocaleString('fr-FR')}</div><div class="metric-lbl">Record</div></div>
    <div class="metric"><div class="metric-val">${daysGoal}</div><div class="metric-lbl">Jours objectif ✓</div></div>
    <div class="metric"><div class="metric-val">${entries.length}</div><div class="metric-lbl">Jours trackés</div></div>
  </div>`;
}
