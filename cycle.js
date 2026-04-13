import { state } from '../state.js';
import { save } from '../state.js';
import { PHASES, todayStr, formatDate, getPhaseForDate, showToast } from '../utils.js';

let todayEnergy = 0, todayMood = 0, todaySymptoms = [];

export function renderCycleScreen() {
  if (state.cycle) {
    document.getElementById('cycle-last-date').value = state.cycle.lastDate;
    document.getElementById('cycle-length').value = state.cycle.cycleLen;
    document.getElementById('rules-length').value = state.cycle.rulesLen;
    renderCyclePhases();
    renderPhaseGuide();
  } else {
    const body = document.getElementById('cycle-settings-body');
    const chev = document.getElementById('chev-cycle-settings');
    if (body) { body.style.display = ''; if (chev) chev.classList.add('open'); }
  }
  const log = state.logs[todayStr()];
  if (log) {
    todayEnergy = log.energy || 0; todayMood = log.mood || 0; todaySymptoms = log.symptoms || [];
    document.getElementById('cycle-note').value = log.note || '';
    selectEnergy(todayEnergy); selectMood(todayMood);
    document.querySelectorAll('#symptom-row .pill').forEach(el => {
      const s = el.getAttribute('onclick').match(/'(.+)'/)[1];
      el.className = todaySymptoms.includes(s) ? 'pill pill-rose' : 'pill pill-neutre';
    });
  } else {
    todayEnergy = 0; todayMood = 0; todaySymptoms = [];
    document.getElementById('cycle-note').value = '';
    selectEnergy(0); selectMood(0);
    document.querySelectorAll('#symptom-row .pill').forEach(el => el.className = 'pill pill-neutre');
  }
}

export function saveCycle() {
  const ld = document.getElementById('cycle-last-date').value;
  if (!ld) { showToast('❌ Choisis une date'); return; }
  state.cycle = { lastDate: ld, cycleLen: parseInt(document.getElementById('cycle-length').value) || 28, rulesLen: parseInt(document.getElementById('rules-length').value) || 5 };
  save(); renderCyclePhases(); renderPhaseGuide(); showToast('✅ Cycle enregistré !');
  window.renderHome?.();
  const body = document.getElementById('cycle-settings-body');
  const chev = document.getElementById('chev-cycle-settings');
  if (body) { body.style.display = 'none'; if (chev) chev.classList.remove('open'); }
}

export function renderCyclePhases() {
  if (!state.cycle) return;
  document.getElementById('cycle-phases-card').style.display = '';
  const { lastDate, cycleLen, rulesLen } = state.cycle, ov = Math.round(cycleLen / 2);
  const phases = [
    { name: 'Règles',      start: 1,          end: rulesLen,  phase: 'mens' },
    { name: 'Folliculaire', start: rulesLen+1,  end: ov-2,      phase: 'folliculaire' },
    { name: 'Ovulation',   start: ov-1,        end: ov+1,      phase: 'ovulation' },
    { name: 'Lutéale',     start: ov+2,        end: cycleLen,  phase: 'luteale' },
  ];
  const base = new Date(lastDate);
  document.getElementById('cycle-phases-list').innerHTML = phases.map(p => {
    const sd = new Date(base); sd.setDate(sd.getDate() + p.start - 1);
    const ed = new Date(base); ed.setDate(ed.getDate() + p.end - 1);
    return `<div class="exo-row"><div class="exo-dot" style="background:${PHASES[p.phase].color}"></div><div class="exo-name">${PHASES[p.phase].emoji} ${p.name}</div><div class="exo-detail">${formatDate(sd)} → ${formatDate(ed)}</div></div>`;
  }).join('');
}

export function selectEnergy(v) {
  todayEnergy = v;
  document.querySelectorAll('#energy-row .rpe-btn').forEach((b, i) => b.classList.toggle('selected', i + 1 === v));
}

export function selectMood(v) {
  todayMood = v;
  document.querySelectorAll('#mood-row .rpe-btn').forEach((b, i) => b.classList.toggle('selected', i + 1 === v));
}

export function toggleSymptom(el, sym) {
  const i = todaySymptoms.indexOf(sym);
  if (i >= 0) { todaySymptoms.splice(i, 1); el.className = 'pill pill-neutre'; }
  else { todaySymptoms.push(sym); el.className = 'pill pill-rose'; }
}

export function saveDailyLog() {
  state.logs[todayStr()] = { energy: todayEnergy, mood: todayMood, symptoms: todaySymptoms, note: document.getElementById('cycle-note').value };
  save(); showToast('✅ Journal enregistré !');
}

export function toggleCycleSettings() {
  const body = document.getElementById('cycle-settings-body');
  const chev = document.getElementById('chev-cycle-settings');
  if (!body) return;
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : '';
  if (chev) chev.classList.toggle('open', !open);
}

export function openCycleQuick() {
  window.goTo?.('cycle');
}

export function renderPhaseGuide() {
  const el = document.getElementById('phase-guide-list'); if (!el) return;
  const guide = {
    mens: {
      sport: ['Yoga doux', 'Étirements', 'Marche légère', 'Natation douce', 'Méditation active'],
      sportNote: 'Ton corps récupère. Privilégie des activités à faible impact, écoute tes douleurs. Évite les efforts intenses et les sports de contact.',
      nutrition: ['Fer (viandes rouges, lentilles)', 'Magnésium (chocolat noir, noix)', 'Oméga-3 anti-inflammatoires', 'Tisanes (gingembre, framboise)'],
      nutritionNote: 'Compense les pertes en fer et réduis l\'inflammation. Hydrate-toi bien. Limite la caféine et les sucres raffinés qui amplifient les crampes.'
    },
    folliculaire: {
      sport: ['Musculation lourde', 'HIIT modéré', 'Danse', 'Running', 'Pilates dynamique', 'Vélo'],
      sportNote: 'L\'œstrogène monte : force et coordination sont au top. C\'est le meilleur moment pour apprendre de nouveaux mouvements et augmenter tes charges.',
      nutrition: ['Protéines maigres (poulet, tofu)', 'Légumes verts (brocoli, épinards)', 'Graines de lin & citrouille', 'Glucides complexes avant l\'effort'],
      nutritionNote: 'Soutiens la production hormonale avec des phytoestrogènes (graines de lin). Charge bien en glucides complexes pour l\'énergie croissante.'
    },
    ovulation: {
      sport: ['HIIT intense', 'CrossFit', 'Sports collectifs', 'Sprint', 'Records personnels', 'Boxe'],
      sportNote: 'Pic de testostérone et d\'œstrogène : force, explosivité et endurance maximales. C\'est la fenêtre idéale pour battre tes records. Attention aux blessures ligamentaires (taux élevé de relaxine).',
      nutrition: ['Antioxydants (fruits rouges, curcuma)', 'Fibres (légumineuses)', 'Graines de sésame & tournesol', 'Légumes crucifères (chou, brocoli)'],
      nutritionNote: 'Soutiens l\'ovulation avec des antioxydants. Les fibres et légumes crucifères aident à métaboliser l\'excès d\'œstrogène. Reste bien hydratée.'
    },
    luteale: {
      sport: ['Yoga', 'Pilates', 'Marche', 'Natation', 'Renforcement musculaire léger', 'Stretching'],
      sportNote: 'L\'énergie diminue progressivement. Le corps se prépare aux règles. Privilégie les exercices qui calment le système nerveux. Écoute ta fatigue.',
      nutrition: ['Magnésium (chocolat noir, avocat)', 'Vitamine B6 (banane, saumon)', 'Calcium (yaourt, amandes)', 'Éviter alcool & caféine'],
      nutritionNote: 'Le magnésium réduit crampes et irritabilité. La vitamine B6 soutient l\'humeur. Évite les sucres rapides qui amplifient les sautes d\'humeur.'
    }
  };
  el.innerHTML = Object.entries(guide).map(([key, g]) => {
    const p = PHASES[key];
    return `<div class="phase-info-card ${key}">
      <div class="phase-info-header" onclick="togglePhaseInfo('pi-${key}')">
        <div class="phase-info-title">${p.emoji} ${p.label}</div>
        <span class="phase-info-chevron" id="chev-pi-${key}">▼</span>
      </div>
      <div class="phase-info-body" id="pi-${key}">
        <div class="phase-info-section">
          <div class="phase-info-section-title">🏃 Sports recommandés</div>
          <div class="phase-info-tags">${g.sport.map(s => `<span class="phase-info-tag">${s}</span>`).join('')}</div>
          <p style="margin-top:8px;">${g.sportNote}</p>
        </div>
        <div class="phase-info-section">
          <div class="phase-info-section-title">🥗 Nutrition conseillée</div>
          <div class="phase-info-tags">${g.nutrition.map(n => `<span class="phase-info-tag">${n}</span>`).join('')}</div>
          <p style="margin-top:8px;">${g.nutritionNote}</p>
        </div>
      </div>
    </div>`;
  }).join('');
  const cur = getPhaseForDate(todayStr());
  if (cur) togglePhaseInfo('pi-' + cur);
}

export function togglePhaseInfo(id) {
  const body = document.getElementById(id);
  const chev = document.getElementById('chev-' + id);
  if (!body) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  if (chev) chev.classList.toggle('open', !isOpen);
}
