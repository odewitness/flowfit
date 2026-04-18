// ── FlowFit main.js ──────────────────────────────────────────────────────────
// Point d'entrée unique. Importe tous les modules et expose les fonctions
// sur window pour que les handlers onclick du HTML puissent les appeler.
// ─────────────────────────────────────────────────────────────────────────────

import { initApp, handleAuth, handleForgotPassword, handleLogout, switchAuthTab } from './auth.js';
import { goTo, toggleBurger, closeBurger } from './router.js';
import { showToast, openModal, closeModal } from './utils.js';
import { renderHome } from './screens/home.js';
import { renderCalendar, showDayDetail, calPrev, calNext, calToday, setPeriodStart, cancelPeriodStart, openPlanDay, savePlanDay, removePlanDay, closeDetailIfNeeded } from './screens/calendar.js';
import { renderCycleScreen, saveCycle, selectEnergy, selectMood, toggleSymptom, saveDailyLog, toggleCycleSettings, openCycleQuick, togglePhaseInfo } from './screens/cycle.js';
import { renderSanteScreen, openHealthEntry, saveHealthEntry } from './screens/sante.js';
import { switchSanteTab, renderStats, renderExoStats } from './screens/stats.js';
import {
  renderSportScreen, switchSportTab,
  openNewWorkout, editWorkout, saveWorkout, deleteWorkout, toggleWorkoutPhase, selectMode, renderTempExercises, openExoLibrary, filterLib, toggleLibExo, closeLibrary, addExerciseCustom, removeExercise, updateExo,
  startWorkoutById, logSet, nextExo, prevExo, finishSession, selRPE, selMoodF, saveSession,
  renderVideosScreen2, filterVideos2, filterInstructor2, openYtVideo, deleteVideo, markVideoDone, confirmVideoDone, openAddVideo, saveVideo, editVideo, saveVideoEdit, toggleVideoPhase, previewYtThumb,
  renderEntrees2, deleteSessionEntry, editSessionEntry, saveSessionEntry,
  renderPasScreen, savePasToday, savePasGoal, openAddPasRetro, savePasRetro, openNewInstructorModal, saveNewInstructor,
  openInstructorsManager, editInstructor,
  saveInstructorEdit, deleteInstructor, switchVideoSubTab,
  deletePasEntry, editPasEntry, savePasEntry,
} from './screens/sport.js';
import {
  renderChallengesScreen, openNewChallenge, openChallengeSession,
  toggleChallengeActive, deleteChallenge, archiveChallenge, saveNewChallenge,
  selectChallengeType, setChallengedays,
  challengeTimerToggle, challengeTimerReset, adjustReps, completeChallengeSession, completeChallengeReps,
} from './screens/challenges.js';

// ── Expose toutes les fonctions sur window (nécessaire pour les onclick HTML) ──
Object.assign(window, {
  // Auth
  handleAuth, handleForgotPassword, handleLogout, switchAuthTab,
  // Navigation
  goTo, toggleBurger, closeBurger,
  // Modal & Toast
  showToast, openModal, closeModal,
  // Home
  renderHome,
  // Calendar
  renderCalendar, showDayDetail, calPrev, calNext, calToday,
  setPeriodStart, cancelPeriodStart, openPlanDay, savePlanDay, removePlanDay, closeDetailIfNeeded,
  // Cycle
  renderCycleScreen, saveCycle, selectEnergy, selectMood, toggleSymptom, saveDailyLog,
  toggleCycleSettings, openCycleQuick, togglePhaseInfo,
  // Sante
  renderSanteScreen, openHealthEntry, saveHealthEntry,
  // Stats
  switchSanteTab, renderStats, renderExoStats,
  // Sport - workouts
  renderSportScreen, switchSportTab,
  openNewWorkout, editWorkout, saveWorkout, deleteWorkout, toggleWorkoutPhase, selectMode,
  renderTempExercises, openExoLibrary, filterLib, toggleLibExo, closeLibrary, addExerciseCustom, removeExercise, updateExo,
  startWorkoutById, logSet, nextExo, prevExo, finishSession, selRPE, selMoodF, saveSession, 
  // Sport - videos
  renderVideosScreen2, filterVideos2, filterInstructor2, openYtVideo, deleteVideo,
  markVideoDone, confirmVideoDone, openAddVideo, saveVideo, editVideo, saveVideoEdit, toggleVideoPhase, previewYtThumb, openNewInstructorModal,
  saveNewInstructor,
  openInstructorsManager,
  editInstructor,
  saveInstructorEdit,
  deleteInstructor, switchVideoSubTab,
  // Sport - entrees
  renderEntrees2, deleteSessionEntry, editSessionEntry, saveSessionEntry,
  // Sport - pas
  renderPasScreen, savePasToday, savePasGoal, openAddPasRetro, savePasRetro, openAddPasRetro, savePasRetro,
  deletePasEntry, editPasEntry, savePasEntry,
  // Challenges
  renderChallengesScreen, openNewChallenge, openChallengeSession,
  toggleChallengeActive, deleteChallenge, archiveChallenge, saveNewChallenge,
  selectChallengeType, setChallengedays,
  challengeTimerToggle, challengeTimerReset, adjustReps, completeChallengeSession, completeChallengeReps,
});

// ── Démarrage ──
initApp();