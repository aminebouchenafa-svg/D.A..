// ============================================================================
// adaptation.js — Le cœur de FLOW.
// Construit la séance et adapte intensité/format selon le roster :
//   - Type de service (vol, repos, night stop, standby, congé)
//   - Fatigue déclarée (logique type CBTA : on ajuste à la performance/forme)
//   - Disponibilité d'une salle (sinon 100% sans matériel)
// ============================================================================

import { CYCLE_30, EXERCISES, PROGRAMS, MEAL_PLANS, ageBracket, DUTY_LOADS } from './data.js';

// --- Helpers date -----------------------------------------------------------

export function toISO(date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function todayISO() { return toISO(new Date()); }

export function addDays(dateISO, n) {
  const d = new Date(dateISO + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function daysBetween(aISO, bISO) {
  const a = new Date(aISO + 'T12:00:00');
  const b = new Date(bISO + 'T12:00:00');
  return Math.round((b - a) / 86400000);
}

// Numéro de jour dans le cycle (1..30), et le cycle courant.
export function programDayFor(state, dateISO) {
  if (!state.startDateISO) return null;
  const diff = daysBetween(state.startDateISO, dateISO);
  if (diff < 0) return null;
  return {
    cycle: Math.floor(diff / 30) + 1,
    day: (diff % 30) + 1,
  };
}

// --- Sélection d'exercices --------------------------------------------------

function pick(pool, n) {
  const arr = [...pool];
  const out = [];
  while (out.length < n && arr.length) {
    const i = Math.floor(Math.random() * arr.length);
    out.push(arr.splice(i, 1)[0]);
  }
  return out;
}

// Filtre la bibliothèque selon le focus du jour et le matériel disponible.
function poolFor(focus, gym) {
  const equipOk = (e) => gym ? true : e.equipment === 'none';
  const byFocus = {
    lower:    (e) => e.muscles.some((m) => ['jambes', 'fessiers', 'mollets'].includes(m)),
    upper:    (e) => e.muscles.some((m) => ['pectoraux', 'dos', 'épaules', 'triceps', 'biceps'].includes(m)),
    core:     (e) => e.type === 'core',
    cardio:   (e) => e.type === 'cardio',
    mobility: (e) => e.type === 'mobility',
    full:     (e) => e.type !== 'mobility', // circuit = renfo/cardio, pas d'étirements
  };
  const focusFn = byFocus[focus] || byFocus.full;
  return EXERCISES.filter((e) => equipOk(e) && focusFn(e));
}

// --- Moteur principal -------------------------------------------------------
//
// Retourne un plan complet pour une date donnée :
//   { dayInfo, session, meals, notes, needsGymQuestion }
//
export function planDay(state, dateISO) {
  const program = PROGRAMS[state.programId] || PROGRAMS.fat_loss;
  const dp = programDayFor(state, dateISO);
  const cycleEntry = dp ? CYCLE_30[dp.day - 1] : CYCLE_30[0];

  const roster = state.roster[dateISO] || {};
  const duty = roster.duty || 'off';
  const fatigue = roster.fatigue || 'normal';   // 'low' | 'normal' | 'high'
  const gym = !!roster.gym;

  // Calibrage selon l'âge du pilote (volume + plafond d'intensité).
  const bracket = ageBracket(state.profile && state.profile.age);

  const notes = [];
  let focus = cycleEntry.focus;
  let intensity = cycleEntry.intensity;
  let format = 'standard';     // 'standard' | 'short' | 'recovery'
  let needsGymQuestion = false;

  // --- 1) Adaptation au type de service ------------------------------------
  switch (duty) {
    case 'flight': {
      // Journée de vol = position assise prolongée + fatigue. On module selon
      // le TEMPS DE SERVICE : plus c'est long, plus on assouplit (soulage le cœur).
      const load = DUTY_LOADS[roster.dutyLoad] || DUTY_LOADS.medium;
      format = 'short';
      intensity = Math.max(1, intensity - load.reduce);
      if (load.soft) {
        // Service long : séance douce, mobilité + circulation, peu cardiogène.
        focus = focus === 'rest' ? 'rest' : 'mobility';
        format = 'recovery';
        notes.push(`Service long (${load.label}) : séance assouplie, orientée mobilité et circulation pour soulager le cœur et récupérer.`);
      } else {
        notes.push(`Jour de vol (${load.label}) : séance courte mobilité + activation, à caser avant ou après le service.`);
      }
      break;
    }
    case 'nightstop':
      // En escale : on demande s'il y a une salle pour adapter.
      needsGymQuestion = roster.gym === undefined;
      if (gym) notes.push('Night stop avec salle : version équipée disponible.');
      else notes.push('Night stop sans salle : séance 100% sans matériel, faisable dans la chambre.');
      break;
    case 'standby':
      format = 'short';
      notes.push('Standby : garde une séance courte, prête à être interrompue.');
      break;
    case 'vacation':
    case 'off':
    default:
      notes.push('Jour off : moment idéal pour la séance complète.');
      break;
  }

  // --- 2) Adaptation à la fatigue (logique CBTA) ---------------------------
  if (fatigue === 'high') {
    format = 'recovery';
    focus = focus === 'rest' ? 'rest' : 'mobility';
    intensity = Math.max(1, Math.min(intensity, 2));
    notes.push('Fatigue élevée déclarée : bascule en récupération active pour éviter le surentraînement.');
  } else if (fatigue === 'low') {
    intensity = Math.min(5, intensity + 0.5);
    notes.push('Bonne forme : tu peux pousser un peu l’intensité aujourd’hui.');
  }

  // --- 2b) Calibrage âge : on plafonne l'intensité selon la tranche --------
  if (focus !== 'rest' && intensity > bracket.intensityCap) {
    intensity = bracket.intensityCap;
  }
  if (focus !== 'rest') {
    notes.push(`Programme calibré pour ta tranche d’âge (${bracket.label}) : volume et intensité ajustés.`);
  }

  // --- 3) Construction de la séance ----------------------------------------
  let session;
  if (focus === 'rest') {
    session = { kind: 'rest', title: 'Repos', blocks: [], durationMin: 0,
      summary: 'Jour de repos programmé. Marche, hydratation, sommeil.' };
  } else {
    const nExercises = format === 'short' ? 4 : format === 'recovery' ? 3 : 6;
    const warmupPool = EXERCISES.filter((e) => e.type === 'mobility' && (gym || e.equipment === 'none'));
    const warmup = pick(warmupPool, 2);
    const usedIds = new Set(warmup.map((e) => e.id));
    let mainPool = poolFor(focus, gym).filter((e) => !usedIds.has(e.id));
    if (!mainPool.length) mainPool = poolFor('full', gym).filter((e) => !usedIds.has(e.id));
    const main = pick(mainPool, nExercises);

    // Scale des reps/sec selon l'intensité ET le volume lié à l'âge.
    const scale = (work) => {
      const f = (0.7 + (intensity / 5) * 0.6) * bracket.volume; // intensité × volume âge
      const out = { ...work };
      if (out.reps) out.reps = Math.max(5, Math.round(out.reps * f));
      if (out.sec) out.sec = Math.max(15, Math.round(out.sec * f / 5) * 5);
      if (out.sets && format === 'recovery') out.sets = Math.max(1, out.sets - 1);
      return out;
    };

    const blocks = [
      { label: 'Échauffement', items: warmup.map((e) => ({ ...e, work: e.work })) },
      { label: format === 'recovery' ? 'Récupération active' : 'Circuit principal',
        items: main.map((e) => ({ ...e, work: scale(e.work) })) },
    ];
    const durationMin = format === 'short' ? 15 : format === 'recovery' ? 12 : 30;

    session = {
      kind: 'workout',
      title: titleFor(focus, format, gym),
      focus, intensity: Math.round(intensity * 10) / 10, format,
      equipment: gym ? 'Salle disponible' : 'Sans matériel',
      durationMin,
      blocks,
      summary: `${blocks[1].items.length} exercices · ~${durationMin} min · intensité ${Math.round(intensity)}/5`,
    };
  }

  // --- 4) Repas ------------------------------------------------------------
  const meals = MEAL_PLANS[program.id] || MEAL_PLANS.fat_loss;

  return { program, dp, duty, fatigue, gym, session, meals, notes, needsGymQuestion };
}

function titleFor(focus, format, gym) {
  const map = {
    lower: 'Bas du corps', upper: 'Haut du corps', core: 'Gainage & abdos',
    cardio: 'Cardio / HIIT', mobility: 'Mobilité & récup', full: 'Full body',
  };
  let base = map[focus] || 'Séance';
  if (format === 'short') base += ' · format court';
  if (format === 'recovery') base = 'Récupération active';
  return base + (gym ? ' (salle)' : '');
}

// --- Stats / progression ----------------------------------------------------

export function computeStreak(state) {
  let streak = 0;
  let cur = todayISO();
  // Si aujourd'hui n'est pas encore fait, on part d'hier pour ne pas casser.
  if (!(state.logs[cur] && state.logs[cur].workoutDone)) cur = addDays(cur, -1);
  while (state.logs[cur] && state.logs[cur].workoutDone) {
    streak++;
    cur = addDays(cur, -1);
  }
  return streak;
}

export function completedCount(state) {
  return Object.values(state.logs).filter((l) => l.workoutDone).length;
}
