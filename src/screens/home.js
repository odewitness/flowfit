import { state } from '../state.js';
import { DB } from '../supabase.js';
import { PHASES, todayStr, formatDate, escHtml, getPhaseForDate } from '../utils.js';

export function renderHome() {
  const now = new Date(), h = now.getHours();
  const greetBase = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  const fn = DB.get('ff_firstname', '');
  document.getElementById('home-greeting').textContent = (fn ? greetBase + ' ' + fn : greetBase) + ' 👋';
  document.getElementById('home-date').textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const phase = getPhaseForDate(todayStr());
  const badge = document.getElementById('topbar-phase');
  if (phase) {
    const p = PHASES[phase];
    badge.textContent = p.emoji + ' ' + p.label;
    badge.className = 'pill ' + p.cls;
    document.getElementById('home-phase-info').innerHTML = `<span class="pill ${p.cls}">${p.emoji} ${p.label}</span>`;
    document.getElementById('home-phase-advice').textContent = p.advice;
  } else {
    badge.textContent = '⚙️ cycle';
    badge.className = 'pill pill-neutre';
    document.getElementById('home-phase-info').textContent = 'Configure ton cycle pour des recommandations →';
    document.getElementById('home-phase-advice').textContent = '';
  }

  const todayPlanned = (state.planning || {})[todayStr()];
  const sugg = document.getElementById('home-suggestion-card');
  const videoSuggEl = document.getElementById('home-video-card');
  const alreadyDoneToday = state.sessions.some(s => s.date === todayStr());

  if (alreadyDoneToday) {
    if (sugg) sugg.style.display = 'none';
    if (videoSuggEl) videoSuggEl.style.display = 'none';
  } else if (todayPlanned) {
    if (todayPlanned.type === 'workout') {
      const pw = state.workouts.find(w => w.id === todayPlanned.id);
      if (pw) {
        document.getElementById('home-suggestion-content').innerHTML = `
          <div style="font-size:10px;font-weight:700;color:var(--lilas);letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px;">📅 Planifié aujourd'hui</div>
          <div style="font-size:15px;font-weight:600;margin-bottom:4px;">${escHtml(pw.name)}</div>
          <div style="font-size:12px;color:var(--text2);margin-bottom:10px;">${pw.exercises.length} exercices · ~${pw.estimatedMin || '?'} min · <em>${pw.mode === 'circuit' ? 'Circuit' : 'Exercice par exercice'}</em></div>
          <button class="btn btn-primary btn-sm" onclick="startWorkoutById('${pw.id}')">Démarrer →</button>`;
        sugg.style.display = '';
      } else sugg.style.display = 'none';
      if (videoSuggEl) videoSuggEl.style.display = 'none';
    } else {
      const pv = state.videos.find(v => v.id === todayPlanned.id);
      if (pv && videoSuggEl) {
        const thumb = pv.videoId ? `<div style="border-radius:var(--radius-sm);overflow:hidden;margin-bottom:10px;cursor:pointer;" onclick="window.open('${escHtml(pv.url)}','_blank')"><img src="https://img.youtube.com/vi/${pv.videoId}/mqdefault.jpg" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block;" alt="${escHtml(pv.name)}"/></div>` : '';
        document.getElementById('home-video-content').innerHTML = `
          <div style="font-size:10px;font-weight:700;color:var(--lilas);letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px;">📅 Planifié aujourd'hui</div>
          ${thumb}<div style="font-size:15px;font-weight:600;margin-bottom:4px;">${escHtml(pv.name)}</div>
          <div style="font-size:12px;color:var(--text2);margin-bottom:10px;">${pv.minutes ? pv.minutes + ' min · ' : ''}<span class="yt-badge">▶ YouTube</span></div>
          <button class="btn btn-primary btn-sm" onclick="window.open('${escHtml(pv.url)}','_blank')">▶ Regarder →</button>`;
        videoSuggEl.style.display = '';
      } else if (videoSuggEl) videoSuggEl.style.display = 'none';
      sugg.style.display = 'none';
    }
  } else {
    if (phase && state.workouts.length) {
      const ok = state.workouts.filter(w => {
        if (!w.phase && !w.phases?.length) return true;
        if (w.phases?.length) return w.phases.includes(phase);
        return w.phase === phase;
      });
      const pick = ok.length ? ok[Math.floor(Math.random() * ok.length)] : state.workouts[0];
      document.getElementById('home-suggestion-content').innerHTML = `
        <div style="font-size:15px;font-weight:600;margin-bottom:4px;">${escHtml(pick.name)}</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:10px;">${pick.exercises.length} exercices · ~${pick.estimatedMin || '?'} min · <em>${pick.mode === 'circuit' ? 'Circuit' : 'Exercice par exercice'}</em></div>
        <button class="btn btn-primary btn-sm" onclick="startWorkoutById('${pick.id}')">Démarrer →</button>`;
      sugg.style.display = '';
    } else sugg.style.display = 'none';

    if (phase && state.videos?.length) {
      const okVids = state.videos.filter(v => !v.phases?.length || v.phases.includes(phase));
      if (okVids.length && videoSuggEl) {
        const vid = okVids[Math.floor(Math.random() * okVids.length)];
        const thumb = vid.videoId ? `<div style="border-radius:var(--radius-sm);overflow:hidden;margin-bottom:10px;cursor:pointer;" onclick="window.open('${escHtml(vid.url)}','_blank')"><img src="https://img.youtube.com/vi/${vid.videoId}/mqdefault.jpg" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block;" alt="${escHtml(vid.name)}"/></div>` : '';
        document.getElementById('home-video-content').innerHTML = `${thumb}<div style="font-size:15px;font-weight:600;margin-bottom:4px;">${escHtml(vid.name)}</div><div style="font-size:12px;color:var(--text2);margin-bottom:10px;">${vid.minutes ? vid.minutes + ' min · ' : ''}<span class="yt-badge">▶ YouTube</span></div><button class="btn btn-primary btn-sm" onclick="window.open('${escHtml(vid.url)}','_blank')">▶ Regarder →</button>`;
        videoSuggEl.style.display = '';
      } else if (videoSuggEl) videoSuggEl.style.display = 'none';
    } else if (videoSuggEl) videoSuggEl.style.display = 'none';
  }

  const recent = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  document.getElementById('home-recent').innerHTML = recent.length
    ? recent.map(s => `<div class="exo-row"><div class="exo-dot" style="background:${s.phase ? PHASES[s.phase]?.color || '#bbb' : '#bbb'}"></div><div class="exo-name">${escHtml(s.workoutName)}</div><div class="exo-detail">${formatDate(s.date)} · ${s.durationMin || 0}min</div></div>`).join('')
    : `<div style="color:var(--text3);font-size:13px;">Aucune séance encore. Lance-toi ! 🌸</div>`;

  const wAgo = new Date(); wAgo.setDate(wAgo.getDate() - 7);
  const ws = state.sessions.filter(s => new Date(s.date) >= wAgo);
  document.getElementById('stat-week-count').textContent = ws.length;
  document.getElementById('stat-week-min').textContent = ws.reduce((a, s) => a + (s.durationMin || 0), 0);
  document.getElementById('stat-week-exos').textContent = ws.reduce((a, s) => a + (s.logs?.reduce((b, l) => b + (l.completedSets?.length || 0), 0) || 0), 0);
  document.getElementById('stat-week-kcal').textContent = ws.reduce((a, s) => a + (s.kcal || 0), 0);

  // Pas du jour
  const todayPas = (state.pas || {})[todayStr()] || 0;
  const pasGoal = state.pasGoal || 10000;
  const homePasVal = document.getElementById('home-pas-val');
  const homePasBar = document.getElementById('home-pas-bar');
  const homePasLbl = document.getElementById('home-pas-lbl');
  if (homePasVal) homePasVal.textContent = todayPas.toLocaleString('fr-FR');
  if (homePasBar) homePasBar.style.width = Math.min(100, Math.round((todayPas / pasGoal) * 100)) + '%';
  if (homePasLbl) {
    const pct = Math.round((todayPas / pasGoal) * 100);
    homePasLbl.textContent = todayPas >= pasGoal ? `✓ Objectif atteint (${pasGoal.toLocaleString('fr-FR')} pas) 🏆` : `${pct}% de l'objectif · ${pasGoal.toLocaleString('fr-FR')} pas`;
    homePasLbl.style.color = todayPas >= pasGoal ? 'var(--rose)' : 'var(--text3)';
  }

  renderHomeChallenges();
}

export function renderHomeChallenges() {
  const el = document.getElementById('home-challenges-section');
  if (!el) return;
  const { getChallengeCompleted, getChallengeStreak, getChallengeRemaining, isChallengeToday } = window._challengeHelpers || {};
  if (!getChallengeCompleted) return; // challenges module not loaded yet

  const CHALLENGE_MOTIVATIONS = window._CHALLENGE_MOTIVATIONS || [];
  const active = (state.challenges || []).filter(c => c.active && !c.archived && getChallengeCompleted(c) < c.totalDays);
  if (!active.length) { el.innerHTML = ''; return; }

  el.innerHTML = `<div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text3);margin-bottom:8px;">Défis en cours</div>` +
    active.map(ch => {
      const completed = getChallengeCompleted(ch);
      const pct = Math.min(100, Math.round((completed / ch.totalDays) * 100));
      const streak = getChallengeStreak(ch);
      const remaining = getChallengeRemaining(ch);
      const doneToday = isChallengeToday(ch);
      const motiv = CHALLENGE_MOTIVATIONS[Math.floor(Math.random() * CHALLENGE_MOTIVATIONS.length)];
      const typeIcon = ch.type === 'timer' ? '⏱' : '💪';
      const targetLabel = ch.type === 'timer'
        ? `${Math.floor(ch.targetValue / 60) ? Math.floor(ch.targetValue / 60) + 'min ' : ''}${ch.targetValue % 60 ? ch.targetValue % 60 + 's' : ''}`
        : `${ch.targetValue} ${ch.unit || 'reps'}`;

      return `<div class="home-challenge-card" onclick="goTo('sport');switchSportTab('challenges');">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div style="font-size:14px;font-weight:700;">${typeIcon} ${escHtml(ch.name)}</div>
          ${doneToday
          ? `<span style="font-size:11px;font-weight:700;color:var(--menthe);">✓ Fait !</span>`
          : `<span style="font-size:11px;font-weight:700;color:var(--lilas);">Il reste ${remaining} j</span>`}
        </div>
        <div style="font-size:11px;color:var(--text2);margin-bottom:6px;">${doneToday ? motiv : targetLabel + ' · ' + completed + '/' + ch.totalDays + ' jours'}</div>
        <div class="challenge-progress-bar" style="height:5px;margin:0 0 6px;">
          <div class="challenge-progress-fill" style="width:${pct}%;"></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:11px;color:var(--text3);">${pct}% complété</div>
          ${streak > 0 ? `<span class="challenge-streak">🔥 ${streak} j de suite</span>` : ''}
        </div>
        ${!doneToday ? `<button class="btn btn-primary btn-sm" style="width:100%;margin-top:10px;" onclick="event.stopPropagation();openChallengeSession('${ch.id}')">▶ Faire le défi du jour</button>` : ''}
      </div>`;
    }).join('');
}