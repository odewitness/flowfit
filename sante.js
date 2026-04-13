import { state } from '../state.js';
import { save } from '../state.js';
import { todayStr, formatDate, showToast, openModal } from '../utils.js';

export function renderSanteScreen() {
  const h = state.health;
  const lw = h.weight?.slice(-1)[0], lt = h.temperature?.slice(-1)[0], lm = h.measurements?.slice(-1)[0];
  document.getElementById('hm-weight-val').textContent = lw ? lw.val + 'kg' : '—';
  document.getElementById('hm-weight-date').textContent = lw ? formatDate(lw.date) : '';
  document.getElementById('hm-temp-val').textContent = lt ? lt.val + '°' : '—';
  document.getElementById('hm-temp-date').textContent = lt ? formatDate(lt.date) : '';
  document.getElementById('hm-meas-val').textContent = lm ? lm.bust + 'cm' : '—';
  document.getElementById('hm-meas-date').textContent = lm ? formatDate(lm.date) : '';

  const wData = (h.weight || []).slice(-10);
  const maxW = Math.max(1, ...wData.map(x => x.val)); const minW = Math.min(...wData.map(x => x.val));
  const range = maxW - minW || 1;
  document.getElementById('health-weight-chart').innerHTML = wData.map((x, i) => {
    const prev = wData[i - 1]; const trend = prev ? (x.val > prev.val ? '▲' : x.val < prev.val ? '▼' : '=') : null;
    const h2 = Math.round(((x.val - minW) / range) * 60) + 8;
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;">
      <div style="font-size:8px;color:${trend === '▲' ? 'var(--rouge)' : trend === '▼' ? 'var(--menthe)' : 'var(--text3)'};">${trend || ''}</div>
      <div style="width:100%;height:${h2}px;background:var(--lilas);border-radius:3px 3px 0 0;opacity:.8;"></div>
      <div style="font-size:8px;color:var(--text3);white-space:nowrap;">${new Date(x.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).slice(0, 5)}</div>
    </div>`;
  }).join('');

  document.getElementById('health-weight-list').innerHTML = wData.slice().reverse().slice(0, 5).map((x, i, arr) => {
    const prev = arr[i + 1]; const diff = prev ? (x.val - prev.val).toFixed(1) : null;
    return `<div class="health-history-row"><span style="font-size:13px;">${formatDate(x.date)}</span><span style="font-family:var(--font-display);font-size:18px;">${x.val} kg</span>${diff !== null ? `<span class="health-trend ${parseFloat(diff) > 0 ? 'up' : parseFloat(diff) < 0 ? 'down' : 'eq'}">${parseFloat(diff) > 0 ? '▲ +' : '▼ '}${diff}</span>` : '<span></span>'}</div>`;
  }).join('') || `<div style="color:var(--text3);font-size:13px;">Aucune donnée.</div>`;

  document.getElementById('health-temp-list').innerHTML = (h.temperature || []).slice().reverse().slice(0, 5).map(x =>
    `<div class="health-history-row"><span style="font-size:13px;">${formatDate(x.date)}</span><span style="font-family:var(--font-display);font-size:18px;">${x.val}°C</span><span style="font-size:12px;color:${x.val >= 38 ? 'var(--rouge)' : x.val <= 36 ? 'var(--lilas)' : 'var(--menthe)'};">${x.val >= 38 ? '🔴 Fièvre' : x.val <= 36 ? '🔵 Basse' : '🟢 Normal'}</span></div>`
  ).join('') || `<div style="color:var(--text3);font-size:13px;">Aucune donnée.</div>`;

  document.getElementById('health-meas-list').innerHTML = (h.measurements || []).slice().reverse().slice(0, 4).map(m =>
    `<div style="background:var(--bg3);border-radius:var(--radius-sm);padding:12px;margin-bottom:8px;border:1px solid var(--border);">
      <div style="font-size:11px;color:var(--text3);margin-bottom:8px;">${formatDate(m.date)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
        ${m.bust  ? `<div style="text-align:center;"><div style="font-family:var(--font-display);font-size:18px;">${m.bust}</div><div style="font-size:10px;color:var(--text3);">Poitrine</div></div>` : ''}
        ${m.waist ? `<div style="text-align:center;"><div style="font-family:var(--font-display);font-size:18px;">${m.waist}</div><div style="font-size:10px;color:var(--text3);">Taille</div></div>` : ''}
        ${m.hips  ? `<div style="text-align:center;"><div style="font-family:var(--font-display);font-size:18px;">${m.hips}</div><div style="font-size:10px;color:var(--text3);">Hanches</div></div>` : ''}
        ${m.thigh ? `<div style="text-align:center;"><div style="font-family:var(--font-display);font-size:18px;">${m.thigh}</div><div style="font-size:10px;color:var(--text3);">Cuisse</div></div>` : ''}
        ${m.arm   ? `<div style="text-align:center;"><div style="font-family:var(--font-display);font-size:18px;">${m.arm}</div><div style="font-size:10px;color:var(--text3);">Bras</div></div>` : ''}
      </div>
    </div>`
  ).join('') || `<div style="color:var(--text3);font-size:13px;">Aucune donnée.</div>`;
}

export function openHealthEntry(type) {
  let body = '', title = '';
  if (type === 'weight') {
    title = '⚖️ Poids';
    body = `<div class="field"><label>Date</label><input type="date" id="he-date" value="${todayStr()}"/></div>
    <div class="field"><label>Poids (kg)</label><input type="number" id="he-val" step="0.1" min="20" max="300" placeholder="65.0" style="font-size:20px;text-align:center;"/></div>
    <button class="btn btn-primary" onclick="saveHealthEntry('weight')">💾 Enregistrer</button>`;
  } else if (type === 'temperature') {
    title = '🌡️ Température';
    body = `<div class="field"><label>Date</label><input type="date" id="he-date" value="${todayStr()}"/></div>
    <div class="field"><label>Température (°C)</label><input type="number" id="he-val" step="0.1" min="34" max="42" placeholder="36.6" style="font-size:20px;text-align:center;"/></div>
    <button class="btn btn-primary" onclick="saveHealthEntry('temperature')">💾 Enregistrer</button>`;
  } else {
    title = '📏 Mensurations (cm)';
    body = `<div class="field"><label>Date</label><input type="date" id="he-date" value="${todayStr()}"/></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
      <div class="field" style="margin:0;"><label>Poitrine</label><input type="number" id="he-bust" step="0.5" placeholder="90" min="40" max="200"/></div>
      <div class="field" style="margin:0;"><label>Taille</label><input type="number" id="he-waist" step="0.5" placeholder="70" min="40" max="200"/></div>
      <div class="field" style="margin:0;"><label>Hanches</label><input type="number" id="he-hips" step="0.5" placeholder="95" min="40" max="200"/></div>
      <div class="field" style="margin:0;"><label>Cuisse</label><input type="number" id="he-thigh" step="0.5" placeholder="55" min="20" max="150"/></div>
      <div class="field" style="margin:0;"><label>Bras</label><input type="number" id="he-arm" step="0.5" placeholder="30" min="10" max="100"/></div>
    </div>
    <button class="btn btn-primary" onclick="saveHealthEntry('measurements')">💾 Enregistrer</button>`;
  }
  openModal(title, body);
}

export function saveHealthEntry(type) {
  const date = document.getElementById('he-date')?.value || todayStr();
  if (!state.health) state.health = { weight: [], temperature: [], measurements: [] };
  if (type === 'measurements') {
    const entry = { date, bust: parseFloat(document.getElementById('he-bust')?.value) || 0, waist: parseFloat(document.getElementById('he-waist')?.value) || 0, hips: parseFloat(document.getElementById('he-hips')?.value) || 0, thigh: parseFloat(document.getElementById('he-thigh')?.value) || 0, arm: parseFloat(document.getElementById('he-arm')?.value) || 0 };
    state.health.measurements = state.health.measurements || [];
    state.health.measurements.push(entry);
    state.health.measurements.sort((a, b) => a.date.localeCompare(b.date));
  } else {
    const val = parseFloat(document.getElementById('he-val')?.value);
    if (!val) { showToast('❌ Saisis une valeur'); return; }
    state.health[type] = state.health[type] || [];
    state.health[type].push({ date, val });
    state.health[type].sort((a, b) => a.date.localeCompare(b.date));
  }
  save(); closeModal(); renderSanteScreen(); showToast('✅ Enregistré !');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}
