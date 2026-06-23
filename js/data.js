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

// Chaque programme définit une RÉPARTITION MACRO de base (en % des kcal) et un
// niveau de calories par kg de poids (kcalPerKg). Les cibles en grammes sont
// ensuite calculées selon le poids du pilote (cf. js/nutrition.js).
// Répartition inspirée des documents fournis (foodspring, Jamcore, R. Georges).
export const PROGRAMS = {
  fat_loss: {
    id: 'fat_loss',
    name: 'Perte de poids rapide',
    tagline: 'Déficit calorique + HIIT court. 30 jours renouvelables.',
    color: '#ff5a3c',
    focus: 'HIIT & déficit',
    kcalPerKg: 24,                 // déficit
    macroSplit: { p: 40, c: 30, f: 30 }, // % des kcal — protéines hautes
  },
  cut: {
    id: 'cut',
    name: 'Sèche musculaire',
    tagline: 'Déficit maîtrisé, protéines hautes pour garder le muscle.',
    color: '#e0457b',
    focus: 'Sèche',
    kcalPerKg: 28,
    macroSplit: { p: 45, c: 25, f: 30 },
  },
  tone: {
    id: 'tone',
    name: 'Tonification & forme',
    tagline: 'Renforcement musculaire, équilibre cardio/force.',
    color: '#2e7dff',
    focus: 'Force & cardio',
    kcalPerKg: 33,
    macroSplit: { p: 30, c: 40, f: 30 },
  },
  maintain: {
    id: 'maintain',
    name: 'Maintien & régularité',
    tagline: 'Garder la forme malgré les rotations. Faible friction.',
    color: '#1fb86b',
    focus: 'Régularité',
    kcalPerKg: 36,
    macroSplit: { p: 30, c: 45, f: 25 },
  },
  mass: {
    id: 'mass',
    name: 'Prise de masse',
    tagline: 'Surplus calorique, 6 repas. Inspiré du programme Jamcore.',
    color: '#7a5cff',
    focus: 'Masse',
    kcalPerKg: 44,
    macroSplit: { p: 35, c: 50, f: 15 }, // ratio Jamcore
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
// BIBLIOTHÈQUE D'EXERCICES
// ----------------------------------------------------------------------------
// Inspirée de la structure de la "Méthode de Musculation — 110 exercices sans
// matériel" (Olivier Lafay) : exercices SANS MATÉRIEL (au plus du mobilier :
// table, chaises, mur, serviette), organisés PAR GROUPE MUSCULAIRE avec une
// PROGRESSION par niveaux (level 1 = accessible → 5 = avancé).
//
// ⚠️  Ce ne sont PAS les libellés exacts du livre (droits d'auteur) mais des
//     mouvements standards fidèles à la méthode. Renseigne `lafayRef` avec le
//     numéro de l'exercice correspondant dans ton livre pour faire le lien.
//
// Champs additionnels vs structure de base :
//   level:    1..5  (progression au sein du groupe musculaire)
//   lafayRef: ''    (à remplir : n° d'exercice dans le livre Lafay)
// ----------------------------------------------------------------------------
export const EXERCISES = [
  // === PECTORAUX (pompes, progression) ====================================
  { id: 'pec_incline',  name: 'Pompes inclinées (mains sur table)', type: 'strength', equipment: 'none', muscles: ['pectoraux','triceps','épaules'], intensity: 2, level: 1, lafayRef: '', work: { reps: 12, sets: 3 }, cue: 'Mains sur le bord d’une table/lit. Corps gainé.' },
  { id: 'pec_pushup',   name: 'Pompes classiques',          type: 'strength', equipment: 'none', muscles: ['pectoraux','triceps','épaules'], intensity: 3, level: 2, lafayRef: '', work: { reps: 12, sets: 3 }, cue: 'Coudes ~45°, descente contrôlée, tronc gainé.' },
  { id: 'pec_wide',     name: 'Pompes prise large',         type: 'strength', equipment: 'none', muscles: ['pectoraux','épaules'], intensity: 3, level: 2, lafayRef: '', work: { reps: 12, sets: 3 }, cue: 'Mains plus larges que les épaules.' },
  { id: 'pec_decline',  name: 'Pompes déclinées (pieds surélevés)', type: 'strength', equipment: 'none', muscles: ['pectoraux','épaules','triceps'], intensity: 4, level: 4, lafayRef: '', work: { reps: 10, sets: 3 }, cue: 'Pieds sur une chaise : accent haut des pecs.' },
  { id: 'pec_archer',   name: 'Pompes archer',              type: 'strength', equipment: 'none', muscles: ['pectoraux','triceps'], intensity: 5, level: 5, lafayRef: '', work: { reps: 6, sets: 3 }, cue: 'Charge un bras en tendant l’autre. Avancé.' },

  // === DOS (tractions sous table / extensions) ============================
  { id: 'back_rowtable',name: 'Rowing inversé sous une table', type: 'strength', equipment: 'none', muscles: ['dos','biceps'], intensity: 3, level: 2, lafayRef: '', work: { reps: 10, sets: 3 }, cue: 'Allongé sous une table SOLIDE, tire la poitrine vers le bord.' },
  { id: 'back_rowfeet', name: 'Rowing sous table, pieds surélevés', type: 'strength', equipment: 'none', muscles: ['dos','biceps'], intensity: 4, level: 3, lafayRef: '', work: { reps: 10, sets: 3 }, cue: 'Pieds sur une chaise pour durcir.' },
  { id: 'back_superman',name: 'Superman (extension dos)',   type: 'strength', equipment: 'none', muscles: ['dos','lombaires'], intensity: 2, level: 1, lafayRef: '', work: { reps: 15, sets: 3 }, cue: 'Lève bras et jambes, regard au sol.' },
  { id: 'back_towel',   name: 'Tirage serviette isométrique', type: 'strength', equipment: 'none', muscles: ['dos','biceps'], intensity: 2, level: 1, lafayRef: '', work: { sec: 20, sets: 3 }, cue: 'Tire fort sur une serviette, contraction max.' },

  // === ÉPAULES ============================================================
  { id: 'sho_pike',     name: 'Pompes pike',                type: 'strength', equipment: 'none', muscles: ['épaules','triceps'], intensity: 3, level: 3, lafayRef: '', work: { reps: 10, sets: 3 }, cue: 'Bassin haut (V inversé), tête entre les bras.' },
  { id: 'sho_wall',     name: 'Pompes en appui mur (ATR)',  type: 'strength', equipment: 'none', muscles: ['épaules','triceps'], intensity: 5, level: 5, lafayRef: '', work: { reps: 6, sets: 3 }, cue: 'Pieds au mur, tête vers le sol. Avancé.' },
  { id: 'sho_towel',    name: 'Élévations serviette',       type: 'strength', equipment: 'none', muscles: ['épaules'], intensity: 1, level: 1, lafayRef: '', work: { reps: 15, sets: 3 }, cue: 'Tension constante sur la serviette.' },

  // === TRICEPS ============================================================
  { id: 'tri_dipchair', name: 'Dips sur chaise',            type: 'strength', equipment: 'none', muscles: ['triceps','pectoraux'], intensity: 3, level: 2, lafayRef: '', work: { reps: 12, sets: 3 }, cue: 'Mains au bord, coudes vers l’arrière.' },
  { id: 'tri_dip2chair',name: 'Dips entre deux chaises',    type: 'strength', equipment: 'none', muscles: ['triceps','pectoraux'], intensity: 4, level: 4, lafayRef: '', work: { reps: 10, sets: 3 }, cue: 'Amplitude complète, épaules basses. Stable !' },
  { id: 'tri_diamond',  name: 'Pompes serrées (diamant)',   type: 'strength', equipment: 'none', muscles: ['triceps','pectoraux'], intensity: 4, level: 3, lafayRef: '', work: { reps: 10, sets: 3 }, cue: 'Mains jointes sous la poitrine.' },

  // === BICEPS / AVANT-BRAS ================================================
  { id: 'bi_rowsup',    name: 'Tractions supination sous table', type: 'strength', equipment: 'none', muscles: ['biceps','dos'], intensity: 3, level: 3, lafayRef: '', work: { reps: 10, sets: 3 }, cue: 'Paumes vers toi sous la table, tire avec les bras.' },
  { id: 'bi_towel',     name: 'Curl serviette isométrique', type: 'strength', equipment: 'none', muscles: ['biceps'], intensity: 2, level: 1, lafayRef: '', work: { sec: 20, sets: 3 }, cue: 'Un pied sur la serviette, tire en flexion.' },

  // === CUISSES / FESSIERS =================================================
  { id: 'leg_wallsit',  name: 'Chaise contre le mur',       type: 'strength', equipment: 'none', muscles: ['jambes','fessiers'], intensity: 2, level: 1, lafayRef: '', work: { sec: 45, sets: 3 }, cue: 'Cuisses à 90°, dos plaqué au mur.' },
  { id: 'leg_squat',    name: 'Squats',                     type: 'strength', equipment: 'none', muscles: ['jambes','fessiers'], intensity: 2, level: 2, lafayRef: '', work: { reps: 15, sets: 3 }, cue: 'Dos droit, genoux dans l’axe des pieds.' },
  { id: 'leg_lunge',    name: 'Fentes alternées',           type: 'strength', equipment: 'none', muscles: ['jambes','fessiers'], intensity: 3, level: 2, lafayRef: '', work: { reps: 12, sets: 3 }, cue: 'Genou arrière vers le sol, buste droit.' },
  { id: 'leg_bulgarian',name: 'Squat bulgare (pied sur chaise)', type: 'strength', equipment: 'none', muscles: ['jambes','fessiers'], intensity: 4, level: 4, lafayRef: '', work: { reps: 10, sets: 3 }, cue: 'Pied arrière sur la chaise, descends droit.' },
  { id: 'leg_pistol',   name: 'Pistol squat (assisté)',     type: 'strength', equipment: 'none', muscles: ['jambes','fessiers'], intensity: 5, level: 5, lafayRef: '', work: { reps: 6, sets: 3 }, cue: 'Squat sur une jambe, aide-toi d’un appui.' },
  { id: 'leg_glutebr',  name: 'Pont fessier',               type: 'strength', equipment: 'none', muscles: ['fessiers','lombaires'], intensity: 2, level: 1, lafayRef: '', work: { reps: 15, sets: 3 }, cue: 'Serre les fessiers en haut, 1 s.' },
  { id: 'leg_glute1leg',name: 'Pont fessier une jambe',     type: 'strength', equipment: 'none', muscles: ['fessiers'], intensity: 3, level: 3, lafayRef: '', work: { reps: 10, sets: 3 }, cue: 'Une jambe tendue, bassin stable.' },

  // === MOLLETS ============================================================
  { id: 'calf_std',     name: 'Extensions mollets debout',  type: 'strength', equipment: 'none', muscles: ['mollets'], intensity: 1, level: 1, lafayRef: '', work: { reps: 20, sets: 3 }, cue: 'Amplitude complète, lent.' },
  { id: 'calf_1leg',    name: 'Mollets une jambe (sur marche)', type: 'strength', equipment: 'none', muscles: ['mollets'], intensity: 2, level: 2, lafayRef: '', work: { reps: 15, sets: 3 }, cue: 'Sur une marche pour l’amplitude, une jambe.' },

  // === ABDOMINAUX / GAINAGE ===============================================
  { id: 'core_crunch',  name: 'Crunch',                     type: 'core', equipment: 'none', muscles: ['abdos','tronc'], intensity: 1, level: 1, lafayRef: '', work: { reps: 20, sets: 3 }, cue: 'Enroule le buste, sans tirer sur la nuque.' },
  { id: 'core_plank',   name: 'Planche',                    type: 'core', equipment: 'none', muscles: ['abdos','tronc'], intensity: 2, level: 1, lafayRef: '', work: { sec: 40, sets: 3 }, cue: 'Corps gainé, bassin neutre.' },
  { id: 'core_legraise',name: 'Relevés de jambes au sol',   type: 'core', equipment: 'none', muscles: ['abdos','tronc'], intensity: 3, level: 2, lafayRef: '', work: { reps: 12, sets: 3 }, cue: 'Lombaires plaquées, descente lente.' },
  { id: 'core_side',    name: 'Planche latérale',           type: 'core', equipment: 'none', muscles: ['obliques','tronc'], intensity: 3, level: 2, lafayRef: '', work: { sec: 30, sets: 2 }, cue: 'Hanche haute, ligne droite.' },
  { id: 'core_mtn',     name: 'Mountain climbers',          type: 'core', equipment: 'none', muscles: ['abdos','cardio'], intensity: 4, level: 3, lafayRef: '', work: { sec: 30, sets: 3 }, cue: 'Rythme régulier, bassin stable.' },
  { id: 'core_vup',     name: 'V-ups',                      type: 'core', equipment: 'none', muscles: ['abdos','tronc'], intensity: 4, level: 4, lafayRef: '', work: { reps: 12, sets: 3 }, cue: 'Mains et pieds se rejoignent en V.' },

  // === SANS MATÉRIEL : cardio / HIIT (pour le programme perte de poids) ===
  { id: 'bw_jj',        name: 'Jumping jacks',              type: 'cardio', equipment: 'none', muscles: ['cardio'], intensity: 3, level: 2, lafayRef: '', work: { sec: 40, sets: 3 }, cue: 'Réception souple.' },
  { id: 'bw_burpee',    name: 'Burpees',                    type: 'cardio', equipment: 'none', muscles: ['cardio','full'], intensity: 5, level: 4, lafayRef: '', work: { reps: 10, sets: 3 }, cue: 'Adapte : sans saut si fatigué.' },
  { id: 'bw_highknees', name: 'Montées de genoux',          type: 'cardio', equipment: 'none', muscles: ['cardio'], intensity: 4, level: 3, lafayRef: '', work: { sec: 30, sets: 3 }, cue: 'Gaine les abdos, rythme soutenu.' },
  { id: 'bw_squatjump', name: 'Squats sautés',              type: 'cardio', equipment: 'none', muscles: ['jambes','cardio'], intensity: 4, level: 3, lafayRef: '', work: { reps: 12, sets: 3 }, cue: 'Amorti genoux à la réception.' },

  // === MOBILITÉ / RÉCUPÉRATION (échauffement & retour au calme) ===========
  { id: 'mob_catcow',   name: 'Chat-vache',                 type: 'mobility', equipment: 'none', muscles: ['colonne'], intensity: 1, level: 1, lafayRef: '', work: { reps: 12, sets: 2 }, cue: 'Synchronise avec la respiration.' },
  { id: 'mob_hipflex',  name: 'Étirement psoas (fente)',    type: 'mobility', equipment: 'none', muscles: ['hanches'], intensity: 1, level: 1, lafayRef: '', work: { sec: 30, sets: 2 }, cue: 'Idéal après un long vol assis.' },
  { id: 'mob_thoracic', name: 'Ouverture thoracique',       type: 'mobility', equipment: 'none', muscles: ['dos','épaules'], intensity: 1, level: 1, lafayRef: '', work: { sec: 30, sets: 2 }, cue: 'Contre la posture cockpit.' },
  { id: 'mob_neck',     name: 'Mobilité nuque/cou',         type: 'mobility', equipment: 'none', muscles: ['cou'], intensity: 1, level: 1, lafayRef: '', work: { sec: 30, sets: 2 }, cue: 'Mouvements lents, sans à-coups.' },

  // === AVEC MATÉRIEL (salle / night stop avec gym) ========================
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
  cut: {
    breakfast: { title: 'Petit-déjeuner sec', items: ['Œufs / blancs d’œufs', 'Skyr 0 %', 'Café/thé sans sucre'], kcal: 350 },
    lunch:     { title: 'Déjeuner', items: ['Protéine maigre 150 g', 'Légumes verts à volonté', 'Féculents IG bas (¼ d’assiette)'], kcal: 500 },
    dinner:    { title: 'Dîner protéiné', items: ['Poisson blanc / volaille', 'Légumes', 'Pas de féculents le soir'], kcal: 450 },
    snack:     { title: 'Collation', items: ['Whey + quelques amandes', 'Eau +++'], kcal: 200 },
    tips: 'Sèche : protéines hautes pour préserver le muscle, glucides surtout autour de la séance. Privilégie les aliments à IG bas (cf. Index Glycémique).',
  },
  maintain: {
    breakfast: { title: 'Petit-déjeuner', items: ['Au choix équilibré', 'Protéine + fruit'], kcal: 550 },
    lunch:     { title: 'Déjeuner', items: ['Repas équilibré', 'Protéine + féculents + légumes'], kcal: 700 },
    dinner:    { title: 'Dîner', items: ['Repas normal, raisonnable'], kcal: 650 },
    snack:     { title: 'Collation', items: ['Fruit, oléagineux'], kcal: 400 },
    tips: 'Mange à ta faim mais reste régulier. Priorité : hydratation et sommeil autour des vols.',
  },
  mass: {
    breakfast: { title: 'Repas 1', items: ['100–150 g flocons d’avoine + lait', '30 g whey', '1 fruit'], kcal: 650 },
    lunch:     { title: 'Repas 3 (déjeuner)', items: ['200 g riz/pâtes/patate (cuit)', '150 g viande/poisson', 'Salade + ¼ avocat + huile d’olive'], kcal: 800 },
    dinner:    { title: 'Repas 5 (dîner)', items: ['Féculents complets', 'Protéine 150 g', 'Légumes'], kcal: 750 },
    snack:     { title: 'Repas 2/4/6 (collations)', items: ['Shaker whey + banane', 'Flocons d’avoine / oléagineux'], kcal: 800 },
    tips: 'Prise de masse (inspiré Jamcore) : ~6 repas/jour, ratio ~50 % glucides / 35 % protéines / 15 % lipides. 3 L d’eau/jour. Adapte le total à ton morphotype (ecto +, endo −).',
  },
};

// ----------------------------------------------------------------------------
// TRANCHES D'ÂGE — calibrage du volume/intensité selon l'âge.
// Dérivé des plans "Workout by age" fournis (18-35 / 35-45 / 45-55 / 55+ …) :
// le volume (reps/durées) et le plafond d'intensité diminuent avec l'âge.
//   volume:       multiplicateur appliqué aux reps/secondes
//   intensityCap: intensité maximale autorisée (1..5)
// ----------------------------------------------------------------------------
export const AGE_BRACKETS = [
  { min: 0,  max: 35, label: '18–35', volume: 1.15, intensityCap: 5.0 },
  { min: 36, max: 45, label: '35–45', volume: 1.00, intensityCap: 4.5 },
  { min: 46, max: 55, label: '45–55', volume: 0.85, intensityCap: 4.0 },
  { min: 56, max: 65, label: '55–65', volume: 0.72, intensityCap: 3.5 },
  { min: 66, max: 200, label: '65+',  volume: 0.62, intensityCap: 3.0 },
];

export function ageBracket(age) {
  const a = Number(age) || 35;
  return AGE_BRACKETS.find((b) => a >= b.min && a <= b.max) || AGE_BRACKETS[1];
}

// Types de service du roster (saisie manuelle MVP).
export const DUTY_TYPES = {
  off:       { id: 'off',       label: 'Repos / Off',   icon: '🏠', color: '#1fb86b' },
  flight:    { id: 'flight',    label: 'Vol',           icon: '✈️', color: '#2e7dff' },
  nightstop: { id: 'nightstop', label: 'Night stop',    icon: '🏨', color: '#7a5cff' },
  standby:   { id: 'standby',   label: 'Standby',       icon: '⏱️', color: '#f5a623' },
  vacation:  { id: 'vacation',  label: 'Congé',         icon: '🌴', color: '#1fb86b' },
};

// Paliers de TEMPS DE SERVICE (pour les jours de vol/night stop).
// Plus le service est long, plus la fatigue cardiaque est grande → la séance
// s'assouplit (mobilité, circulation) pour soulager le cœur.
//   reduce: réduction d'intensité appliquée ; soft: bascule en récup douce
export const DUTY_LOADS = {
  short:  { id: 'short',  label: '< 6 h',   reduce: 0.5, soft: false },
  medium: { id: 'medium', label: '6–9 h',   reduce: 1.0, soft: false },
  long:   { id: 'long',   label: '9–12 h',  reduce: 1.5, soft: true  },
  xlong:  { id: 'xlong',  label: '> 12 h',  reduce: 2.0, soft: true  },
};
