// ============================================================================
// nutrition.js — Cibles caloriques & macros, calculées selon le profil.
// Sources d'inspiration : foodspring (suivi macros), Jamcore (ratios masse),
// "Nutrition et Musculation" (R. Georges).
// ============================================================================

import { PROGRAMS, MEAL_PLANS } from './data.js';
import { medicalPrep } from './adaptation.js';

// Programme effectif pour la diète : en prépa visite médicale, on force la
// perte de poids quel que soit l'objectif choisi.
function effectiveProgram(state) {
  if (medicalPrep(state).active) return PROGRAMS.fat_loss;
  return PROGRAMS[state.programId] || PROGRAMS.fat_loss;
}

// Cible du jour : kcal + grammes de protéines / glucides / lipides.
// kcal = poids(kg) × kcalPerKg ; puis répartition selon macroSplit (% des kcal).
export function dailyTargets(state) {
  const program = effectiveProgram(state);
  const weight = state.profile && state.profile.weightKg ? state.profile.weightKg : 75;
  const kcal = Math.round(weight * program.kcalPerKg);
  const s = program.macroSplit;
  return {
    kcal,
    p: Math.round((kcal * s.p / 100) / 4),   // 4 kcal/g
    c: Math.round((kcal * s.c / 100) / 4),   // 4 kcal/g
    f: Math.round((kcal * s.f / 100) / 9),   // 9 kcal/g
    split: s,
  };
}

// Total kcal du plan repas suggéré (pour calculer la part de chaque repas).
function planTotalKcal(programId) {
  const m = MEAL_PLANS[programId] || MEAL_PLANS.fat_loss;
  return ['breakfast', 'lunch', 'dinner', 'snack']
    .reduce((a, k) => a + (m[k] ? m[k].kcal : 0), 0);
}

// "Atteint aujourd'hui" estimé à partir des repas cochés.
// On somme les kcal des repas cochés, et on projette les macros au prorata.
export function achievedFromLog(state, dateISO) {
  const log = state.logs[dateISO];
  const program = effectiveProgram(state);
  const meals = MEAL_PLANS[program.id] || MEAL_PLANS.fat_loss;
  const checked = (log && log.meals) || {};
  let kcal = 0;
  for (const k of ['breakfast', 'lunch', 'dinner', 'snack']) {
    if (checked[k] && meals[k]) kcal += meals[k].kcal;
  }
  const tgt = dailyTargets(state);
  const total = planTotalKcal(program.id) || 1;
  const ratio = kcal / total;
  return {
    kcal,
    p: Math.round(tgt.p * ratio),
    c: Math.round(tgt.c * ratio),
    f: Math.round(tgt.f * ratio),
  };
}
