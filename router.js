import { renderHome } from './screens/home.js';
import { renderCalendar } from './screens/calendar.js';
import { renderCycleScreen } from './screens/cycle.js';
import { renderSanteScreen } from './screens/sante.js';
import { renderSportScreen, switchSportTab } from './screens/sport.js';
import { switchSanteTab } from './screens/stats.js';

export function goTo(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const screen = document.getElementById('screen-' + name);
  if (screen) screen.classList.add('active');

  // Update active nav button
  const navBtn = document.querySelector(`.nav-btn[data-nav="${name}"]`);
  if (navBtn) navBtn.classList.add('active');

  // Aliases
  if (name === 'seances')  { goTo('sport'); switchSportTab('seances'); return; }
  if (name === 'videos')   { goTo('sport'); switchSportTab('videos');  return; }
  if (name === 'entrees')  { goTo('sport'); switchSportTab('entrees'); return; }
  if (name === 'stats')    { goTo('sante'); switchSanteTab('stats');   return; }

  if (name === 'home')   renderHome();
  if (name === 'sport')  renderSportScreen();
  if (name === 'cal')    renderCalendar();
  if (name === 'cycle')  renderCycleScreen();
  if (name === 'sante')  renderSanteScreen();
}

// ── Burger drawer ──
export function toggleBurger() {
  document.getElementById('burger-overlay').classList.toggle('open');
  document.getElementById('burger-drawer').classList.toggle('open');
}

export function closeBurger() {
  document.getElementById('burger-overlay').classList.remove('open');
  document.getElementById('burger-drawer').classList.remove('open');
}
