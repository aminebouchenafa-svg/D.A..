// ============================================================================
// D.A.TA — Diet, Activity, Training, Adaptation
// data.js — Contenu : programmes, bibliothèque d'exercices, plans de repas.
//
// ⚠️  BIBLIOTHÈQUE D'EXERCICES DE DÉMARRAGE.
//     Remplace / complète le contenu de EXERCISES ci-dessous avec tes propres
//     documents. Le reste de l'app (moteur d'adaptation, UI) s'appuie
//     uniquement sur la STRUCTURE des objets, pas sur leur nombre. Tu peux donc
//     ajouter autant d'exercices que tu veux sans rien casser.
//
//     Structure d'un exercice :
//     {
//       id:        identifiant unique (string),
//       name:      nom affiché,
//       type:      'cardio' | 'strength' | 'mobility' | 'core',
//       equipment: 'none' | 'gym'   // 'none' = sans matériel (chambre d'hôtel)
//       muscles:   ['jambes','fessiers',...],
//       intensity: 1..5,            // 1 = très doux, 5 = très intense
//       work:      { reps?, sec?, sets? },  // ce qu'il faut faire
//       cue:       conseil d'exécution court,
//     }
// ============================================================================

export const PROGRAMS = {
  fat_loss: {
    id: 'fat_loss',
    name: 'Perte de poids rapide',
    tagline: 'Déficit calorique + HIIT court. 30 jours renouvelables.',
    color: '#ff5a3c',
    calorieTarget: 1800,          // kcal/jour cible (ajusté au profil ensuite)
    proteinTargetG: 140,
    focus: 'HIIT & déficit',
  },
  tone: {
    id: 'tone',
    name: 'Tonification & forme',
    tagline: 'Renforcement musculaire, équilibre cardio/force.',
    color: '#2e7dff',
    calorieTarget: 2100,
    proteinTargetG: 150,
    focus: 'Force & cardio',
  },
  maintain: {
    id: 'maintain',
    name: 'Maintien & régularité',
    tagline: 'Garder la forme malgré les rotations. Faible friction.',
    color: '#1fb86b',
    calorieTarget: 2300,
    proteinTargetG: 130,
    focus: 'Régularité',
  },
};

// ----------------------------------------------------------------------------
// Modèle 30 jours : pour chaque jour du cycle, un "focus" et une intensité de
// base. Le moteur d'adaptation (adaptation.js) ajuste ensuite selon le roster.
// focus: 'lower' | 'upper' | 'core' | 'full' | 'cardio' | 'mobility' | 'rest'
// ----------------------------------------------------------------------------
function buildCycle() {
  // Microcycle hebdo type : on enchaîne 6 jours actifs + 1 récup/repos.
  const week = [
    { focus: 'full',     intensity: 3 }, // J1
    { focus: 'lower',    intensity: 3 }, // J2
    { focus: 'core',     intensity: 2 }, // J3
    { focus: 'cardio',   intensity: 4 }, // J4
    { focus: 'upper',    intensity: 3 }, // J5
    { focus: 'mobility', intensity: 1 }, // J6 (récup active)
    { focus: 'rest',     intensity: 0 }, // J7 (repos)
  ];
  const cycle = [];
  for (let i = 0; i < 30; i++) {
    const base = week[i % 7];
    // Progression douce : +0.5 d'intensité toutes les 2 semaines.
    const bump = Math.floor(i / 14) * 0.5;
    cycle.push({
      day: i + 1,
      focus: base.focus,
      intensity: base.intensity === 0 ? 0 : Math.min(5, base.intensity + bump),
    });
  }
  return cycle;
}

export const CYCLE_30 = buildCycle();

// ----------------------------------------------------------------------------
// BIBLIOTHÈQUE D'EXERCICES (starter — à remplacer par tes documents)
// ----------------------------------------------------------------------------
export const EXERCISES = [
  // --- Sans matériel : bas du corps ---------------------------------------
  { id: 'bw_squat',     name: 'Squats au poids du corps', type: 'strength', equipment: 'none', muscles: ['jambes','fessiers'], intensity: 2, work: { reps: 15, sets: 3 }, cue: 'Dos droit, genoux dans l’axe des pieds.' },
  { id: 'bw_lunge',     name: 'Fentes alternées',          type: 'strength', equipment: 'none', muscles: ['jambes','fessiers'], intensity: 3, work: { reps: 12, sets: 3 }, cue: 'Genou arrière vers le sol, buste droit.' },
  { id: 'bw_glutebr',   name: 'Pont fessier',              type: 'strength', equipment: 'none', muscles: ['fessiers','lombaires'], intensity: 2, work: { reps: 15, sets: 3 }, cue: 'Serre les fessiers en haut, 1 s.' },
  { id: 'bw_calf',      name: 'Mollets debout',            type: 'strength', equipment: 'none', muscles: ['mollets'], intensity: 1, work: { reps: 20, sets: 3 }, cue: 'Amplitude complète, lent.' },

  // --- Sans matériel : haut du corps --------------------------------------
  { id: 'bw_pushup',    name: 'Pompes',                    type: 'strength', equipment: 'none', muscles: ['pectoraux','triceps','épaules'], intensity: 3, work: { reps: 12, sets: 3 }, cue: 'Gainage du tronc, coudes ~45°.' },
  { id: 'bw_pike',      name: 'Pompes pike (épaules)',     type: 'strength', equipment: 'none', muscles: ['épaules','triceps'], intensity: 3, work: { reps: 10, sets: 3 }, cue: 'Bassin haut, tête entre les bras.' },
  { id: 'bw_dip_chair', name: 'Dips sur chaise',           type: 'strength', equipment: 'none', muscles: ['triceps','pectoraux'], intensity: 3, work: { reps: 12, sets: 3 }, cue: 'Coudes vers l’arrière, épaules basses.' },
  { id: 'bw_superman',  name: 'Superman (dos)',            type: 'strength', equipment: 'none', muscles: ['dos','lombaires'], intensity: 2, work: { reps: 15, sets: 3 }, cue: 'Lève bras et jambes, regard au sol.' },

  // --- Sans matériel : gainage / core -------------------------------------
  { id: 'bw_plank',     name: 'Planche',                   type: 'core', equipment: 'none', muscles: ['abdos','tronc'], intensity: 2, work: { sec: 40, sets: 3 }, cue: 'Corps gainé, bassin neutre.' },
  { id: 'bw_sidepl',    name: 'Planche latérale',          type: 'core', equipment: 'none', muscles: ['obliques'], intensity: 3, work: { sec: 30, sets: 2 }, cue: 'Hanche haute, ligne droite.' },
  { id: 'bw_deadbug',   name: 'Dead bug',                  type: 'core', equipment: 'none', muscles: ['abdos','tronc'], intensity: 2, work: { reps: 12, sets: 3 }, cue: 'Lombaires plaquées au sol.' },
  { id: 'bw_mtnclimb',  name: 'Mountain climbers',         type: 'core', equipment: 'none', muscles: ['abdos','cardio'], intensity: 4, work: { sec: 30, sets: 3 }, cue: 'Rythme régulier, bassin stable.' },

  // --- Sans matériel : cardio / HIIT --------------------------------------
  { id: 'bw_jj',        name: 'Jumping jacks',             type: 'cardio', equipment: 'none', muscles: ['cardio'], intensity: 3, work: { sec: 40, sets: 3 }, cue: 'Réception souple.' },
  { id: 'bw_burpee',    name: 'Burpees',                   type: 'cardio', equipment: 'none', muscles: ['cardio','full'], intensity: 5, work: { reps: 10, sets: 3 }, cue: 'Adapte : sans saut si fatigué.' },
  { id: 'bw_highknees', name: 'Montées de genoux',         type: 'cardio', equipment: 'none', muscles: ['cardio'], intensity: 4, work: { sec: 30, sets: 3 }, cue: 'Gaine les abdos, rythme soutenu.' },
  { id: 'bw_squatjump', name: 'Squats sautés',             type: 'cardio', equipment: 'none', muscles: ['jambes','cardio'], intensity: 4, work: { reps: 12, sets: 3 }, cue: 'Amorti genoux à la réception.' },

  // --- Sans matériel : mobilité / récup -----------------------------------
  { id: 'mob_catcow',   name: 'Chat-vache',                type: 'mobility', equipment: 'none', muscles: ['colonne'], intensity: 1, work: { reps: 12, sets: 2 }, cue: 'Synchronise avec la respiration.' },
  { id: 'mob_hipflex',  name: 'Étirement psoas (fente)',   type: 'mobility', equipment: 'none', muscles: ['hanches'], intensity: 1, work: { sec: 30, sets: 2 }, cue: 'Idéal après un long vol assis.' },
  { id: 'mob_thoracic', name: 'Ouverture thoracique',      type: 'mobility', equipment: 'none', muscles: ['dos','épaules'], intensity: 1, work: { sec: 30, sets: 2 }, cue: 'Contre la posture cockpit.' },
  { id: 'mob_neck',     name: 'Mobilité nuque/cou',        type: 'mobility', equipment: 'none', muscles: ['cou'], intensity: 1, work: { sec: 30, sets: 2 }, cue: 'Mouvements lents, sans à-coups.' },

  // --- Avec matériel (salle / night stop avec gym) ------------------------
  { id: 'gym_legpress', name: 'Presse à cuisses',          type: 'strength', equipment: 'gym', muscles: ['jambes','fessiers'], intensity: 3, work: { reps: 12, sets: 4 }, cue: 'Amplitude contrôlée, sans verrouiller.' },
  { id: 'gym_latpull',  name: 'Tirage vertical',           type: 'strength', equipment: 'gym', muscles: ['dos','biceps'], intensity: 3, work: { reps: 12, sets: 4 }, cue: 'Tire avec les coudes, pas les mains.' },
  { id: 'gym_benchdb',  name: 'Développé haltères',        type: 'strength', equipment: 'gym', muscles: ['pectoraux','triceps'], intensity: 3, work: { reps: 12, sets: 4 }, cue: 'Trajectoire stable, descente lente.' },
  { id: 'gym_row',      name: 'Rowing haltère',            type: 'strength', equipment: 'gym', muscles: ['dos'], intensity: 3, work: { reps: 12, sets: 3 }, cue: 'Dos plat, tire vers la hanche.' },
  { id: 'gym_treadmill',name: 'Tapis — intervalles',       type: 'cardio',   equipment: 'gym', muscles: ['cardio'], intensity: 4, work: { sec: 1200 }, cue: '1 min vite / 1 min lent x10.' },
  { id: 'gym_rower',    name: 'Rameur',                    type: 'cardio',   equipment: 'gym', muscles: ['cardio','full'], intensity: 4, work: { sec: 900 }, cue: 'Pousse jambes, puis tire bras.' },
];

// ----------------------------------------------------------------------------
// PLANS DE REPAS (starter, par programme). Pilote-friendly : options
// transportables, hydratation, gestion du décalage horaire.
// ----------------------------------------------------------------------------
export const MEAL_PLANS = {
  fat_loss: {
    breakfast: { title: 'Petit-déjeuner protéiné', items: ['Œufs ou skyr/fromage blanc', 'Flocons d’avoine (40 g)', 'Fruit + café/thé sans sucre'], kcal: 400 },
    lunch:     { title: 'Déjeuner', items: ['Protéine maigre (poulet/poisson)', 'Légumes à volonté', 'Riz/quinoa (½ portion)'], kcal: 550 },
    dinner:    { title: 'Dîner léger', items: ['Protéine + grande salade', 'Peu de féculents le soir', 'Tisane'], kcal: 500 },
    snack:     { title: 'Collation', items: ['Poignée d’amandes ou shaker protéiné', 'Eau +++'], kcal: 200 },
    tips: 'En vol : prépare des snacks protéinés, évite les plateaux sucrés. Hydrate-toi (eau, pas de sodas). Coupe les glucides lourds avant un repos en chambre.',
  },
  tone: {
    breakfast: { title: 'Petit-déjeuner', items: ['Œufs + avoine', 'Fruits rouges', 'Café/thé'], kcal: 500 },
    lunch:     { title: 'Déjeuner', items: ['Protéine 150 g', 'Féculents complets', 'Légumes'], kcal: 650 },
    dinner:    { title: 'Dîner', items: ['Protéine + légumes', 'Bonnes graisses (avocat/huile olive)'], kcal: 600 },
    snack:     { title: 'Collation', items: ['Skyr + fruit', 'Oléagineux'], kcal: 350 },
    tips: 'Vise la protéine à chaque repas. Adapte les portions de féculents aux jours d’entraînement.',
  },
  maintain: {
    breakfast: { title: 'Petit-déjeuner', items: ['Au choix équilibré', 'Protéine + fruit'], kcal: 550 },
    lunch:     { title: 'Déjeuner', items: ['Repas équilibré', 'Protéine + féculents + légumes'], kcal: 700 },
    dinner:    { title: 'Dîner', items: ['Repas normal, raisonnable'], kcal: 650 },
    snack:     { title: 'Collation', items: ['Fruit, oléagineux'], kcal: 400 },
    tips: 'Mange à ta faim mais reste régulier. Priorité : hydratation et sommeil autour des vols.',
  },
};

// Types de service du roster (saisie manuelle MVP).
export const DUTY_TYPES = {
  off:       { id: 'off',       label: 'Repos / Off',   icon: '🏠', color: '#1fb86b' },
  flight:    { id: 'flight',    label: 'Vol',           icon: '✈️', color: '#2e7dff' },
  nightstop: { id: 'nightstop', label: 'Night stop',    icon: '🏨', color: '#7a5cff' },
  standby:   { id: 'standby',   label: 'Standby',       icon: '⏱️', color: '#f5a623' },
  vacation:  { id: 'vacation',  label: 'Congé',         icon: '🌴', color: '#1fb86b' },
};
