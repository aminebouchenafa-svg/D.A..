// ============================================================================
// storage.js — Persistance locale (localStorage). Zéro dépendance, offline.
// ============================================================================

const KEY = 'data_app_state_v1';

const DEFAULT_STATE = {
  onboarded: false,
  profile: {
    name: '',
    age: null,
    sex: 'h',          // 'h' | 'f'
    heightCm: null,
    weightKg: null,
    targetWeightKg: null,
  },
  programId: null,      // 'fat_loss' | 'tone' | 'maintain'
  startDateISO: null,   // début du cycle 30 jours
  cycleCount: 0,        // nombre de cycles renouvelés
  roster: {},           // { 'YYYY-MM-DD': { duty, fatigue, gym } }
  logs: {},             // { 'YYYY-MM-DD': { workoutDone, meals:{breakfast,lunch,dinner,snack}, weightKg } }
};

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    // Fusion défensive pour les champs ajoutés après coup.
    return { ...structuredClone(DEFAULT_STATE), ...parsed,
      profile: { ...DEFAULT_STATE.profile, ...(parsed.profile || {}) } };
  } catch (e) {
    console.warn('État illisible, réinitialisation.', e);
    return structuredClone(DEFAULT_STATE);
  }
}

let _state = loadState();

export function getState() { return _state; }

export function setState(mutator) {
  if (typeof mutator === 'function') mutator(_state);
  else _state = { ..._state, ...mutator };
  persist();
  return _state;
}

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(_state));
  } catch (e) {
    console.error('Échec sauvegarde locale', e);
  }
}

export function resetState() {
  _state = structuredClone(DEFAULT_STATE);
  persist();
  return _state;
}

// --- Helpers roster / logs --------------------------------------------------

export function getRoster(dateISO) {
  return _state.roster[dateISO] || null;
}

export function setRoster(dateISO, entry) {
  setState((s) => {
    s.roster[dateISO] = { ...(s.roster[dateISO] || {}), ...entry };
  });
}

export function getLog(dateISO) {
  return _state.logs[dateISO] || { workoutDone: false, meals: {}, weightKg: null };
}

export function setLog(dateISO, patch) {
  setState((s) => {
    s.logs[dateISO] = { ...getLog(dateISO), ...patch };
  });
}

// --- Export / import JSON (sauvegarde manuelle) -----------------------------

export function exportJSON() {
  return JSON.stringify(_state, null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  _state = { ...structuredClone(DEFAULT_STATE), ...parsed };
  persist();
  return _state;
}
