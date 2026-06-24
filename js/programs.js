// ============================================================================
// programs.js — Mode INDÉPENDANT : bibliothèque de programmes/défis.
// Chaque programme a une durée (7 / 15 / 30 jours), une diète associée, et
// génère le contenu d'un jour : exercices + nombre de tours (rounds).
// Inspiré des défis fournis (30-day challenge, calisthénics, pompes, etc.).
// ============================================================================

// Petit utilitaire de progression hebdomadaire.
const week = (day) => Math.floor((day - 1) / 7);

// 30-Day Belly Fat Burn — contenu jour par jour (null = repos). Transcrit de
// l'infographie fournie. Repos : J7, J14, J24.
const BELLY30 = [
  ['20 Crunchs', '15 Relevés de jambes', '45 s Planche'],
  ['25 Crunchs', '15 Crunchs vélo', '45 s Planche'],
  ['25 Relevés de jambes', '20 s Battements de jambes', '45 s Planche'],
  ['30 Crunchs', '20 Russian twists', '1 min Planche'],
  ['30 Relevés de jambes', '20 Crunchs vélo', '1 min Planche'],
  ['30 s Mountain climbers', '20 Relevés de jambes', '1 min Planche'],
  null, // J7 repos
  ['35 Crunchs', '25 Russian twists', '1 min Planche'],
  ['35 Relevés de jambes', '25 Crunchs vélo', '1:15 Planche'],
  ['40 s Mountain climbers', '25 Battements de jambes', '1:15 Planche'],
  ['40 Crunchs', '25 Russian twists', '1:15 Planche'],
  ['40 Relevés de jambes', '30 Crunchs vélo', '1:30 Planche'],
  ['45 s Mountain climbers', '30 Battements de jambes', '1:30 Planche'],
  null, // J14 repos
  ['45 Crunchs', '30 Russian twists', '1:30 Planche'],
  ['45 Relevés de jambes', '30 Crunchs vélo', '1:45 Planche'],
  ['50 s Mountain climbers', '35 Battements de jambes', '1:45 Planche'],
  ['50 Crunchs', '35 Russian twists', '1:45 Planche'],
  ['50 Relevés de jambes', '35 Crunchs vélo', '2 min Planche'],
  ['1 min Mountain climbers', '40 Battements de jambes', '2 min Planche'],
  ['55 Crunchs', '40 Russian twists', '2 min Planche'],
  ['55 Relevés de jambes', '40 Crunchs vélo', '2:15 Planche'],
  ['1:15 Mountain climbers', '45 Battements de jambes', '2:15 Planche'],
  null, // J24 repos
  ['60 Crunchs', '45 Russian twists', '2:30 Planche'],
  ['60 Relevés de jambes', '45 Crunchs vélo', '2:30 Planche'],
  ['1:30 Mountain climbers', '50 Battements de jambes', '2:30 Planche'],
  ['65 Crunchs', '50 Russian twists', '2:45 Planche'],
  ['65 Relevés de jambes', '50 Crunchs vélo', '2:45 Planche'],
  ['2 min Mountain climbers', '60 Battements de jambes', '3 min Planche'],
];

// 28 DAY WORKOUT PLAN ACCORDING TO THE AGE (Kambal Nutrition) — transcrit des
// infographies. Trame hebdo répétée sur 28 jours : Lun/Mar/Mer distincts, puis
// Jeu=Lun, Ven=Mar, Sam=Mer ; dimanche = repos.
// Une colonne par tranche d'âge : 18-25 / 25-35 / 35-45 / 45-55 / 55+.
const AGE28 = {
  '18-25': {
    mon: ['10 s Planche', '5 Pompes', '24 Fentes', '10 Sit-ups', '20 Jumping jacks'],
    tue: ['30 Squats', '15 Jumping jacks', '30 s Planche', '20 Crunchs', '10 Pompes'],
    wed: ['10 Talons-fesses', '10 Pompes', '20 Jumping jacks', '10 s Chaise au mur', '25 Squats'],
  },
  '25-35': {
    mon: ['23 s Planche', '10 Pompes', '21 Fentes', '16 Sit-ups', '10 Jumping jacks'],
    tue: ['25 Squats', '20 Jumping jacks', '30 s Planche', '32 Crunchs', '12 Pompes'],
    wed: ['40 Talons-fesses', '20 Pompes', '30 Jumping jacks', '20 s Chaise au mur', '20 Squats'],
  },
  '35-45': {
    mon: ['15 Pompes', '20 Fentes', '20 Sit-ups', '40 s Planche', '24 Talons-fesses'],
    tue: ['23 Squats', '30 Talons-fesses', '40 s Planche', '10 Crunchs', '30 Pompes'],
    wed: null, // MANQUANT sur la capture — provisoirement = Lundi
  },
  '45-55': {
    mon: ['33 s Planche', '20 Pompes', '20 Fentes', '15 Sit-ups', '30 Talons-fesses'],
    tue: ['30 Squats', '23 Talons-fesses', '30 s Planche', '35 Crunchs', '20 Pompes'],
    wed: null, // MANQUANT sur la capture — provisoirement = Lundi
  },
  '55+': {
    mon: ['45 s Planche', '10 Pompes', '20 Jumping jacks', '15 Fentes', '15 Sit-ups'],
    tue: ['20 Squats', '15 Jumping jacks', '30 s Planche', '20 Crunchs', '10 Pompes'],
    wed: ['35 Talons-fesses', '15 Pompes', '40 Jumping jacks', '30 s Chaise au mur', '30 Squats'],
  },
};

// Choisit la colonne d'âge. Les <18 ans prennent la tranche 18-25.
function age28Col(age) {
  const a = Number(age) || 0;
  if (!a || a < 25) return '18-25';
  if (a < 35) return '25-35';
  if (a < 45) return '35-45';
  if (a < 55) return '45-55';
  return '55+';
}

export const PROGRAMS_LIB = [
  {
    id: 'age28',
    name: 'Plan 28 jours selon l’âge',
    emoji: '🎂',
    color: '#00b3a4',
    days: 28,
    dietKey: 'maintain',
    byAge: true,
    desc: 'Programme calibré par tranche d’âge (18-25 → 55+). Ton âge est demandé au démarrage. Lun→Sam, dimanche repos.',
    build: (d, ctx) => {
      const col = age28Col(ctx && ctx.age);
      const wd = (d - 1) % 7; // 0=Lundi … 5=Samedi, 6=Dimanche
      const labels = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
      if (wd === 6) {
        return { subtitle: `Dimanche · Repos (tranche ${col})`, rounds: 1,
          items: ['Repos', 'Marche / étirements 10 min', 'Hydratation +++'] };
      }
      const tpl = ['mon', 'tue', 'wed'][wd % 3]; // Jeu/Ven/Sam répètent Lun/Mar/Mer
      const plan = AGE28[col];
      const provisoire = !plan[tpl];
      const items = plan[tpl] || plan.mon; // repli si cellule manquante
      return { subtitle: `${labels[wd]} · Tranche ${col}${provisoire ? ' (provisoire)' : ''}`, rounds: 1, items };
    },
  },
  {
    id: 'belly30',
    name: '30-Day Belly Fat Burn',
    emoji: '🔥',
    color: '#ff5a3c',
    days: 30,
    dietKey: 'fat_loss',
    desc: 'Spécial ventre plat : crunchs, gainage, planche progressive. Repos J7/J14/J24.',
    build: (d) => {
      const x = BELLY30[d - 1];
      return x
        ? { subtitle: 'Ceinture abdominale', rounds: 1, items: x }
        : { subtitle: 'Repos', rounds: 1, items: ['Repos', 'Marche / étirements 10 min', 'Hydratation +++'] };
    },
  },
  {
    id: 'daily4',
    name: 'Défi Quotidien × 4 tours',
    emoji: '🔥',
    color: '#e0457b',
    days: 30,
    dietKey: 'fat_loss',
    desc: 'Le même circuit chaque jour, 4 tours. Simple, court, redoutable.',
    build: (d) => {
      const w = week(d);
      return {
        subtitle: 'Répétez 4 fois !',
        rounds: 4,
        items: [
          `${20 + w * 5} Pompes`,
          `${15 + w * 3} Burpees`,
          `${30 + w * 5} Squats`,
          `${20 + w * 4} Fentes alternées`,
          `${45 + w * 10} secondes de planche`,
        ],
      };
    },
  },
  {
    id: 'express7',
    name: 'Défi 7 jours Express',
    emoji: '⚡',
    color: '#f5a623',
    days: 7,
    dietKey: 'fat_loss',
    desc: 'Une semaine pour relancer la machine. Un focus par jour.',
    build: (d) => {
      const plans = [
        { t: 'Full body', r: 3, x: ['15 Pompes', '20 Squats', '10 Burpees', '30 s Planche', '20 Mountain climbers'] },
        { t: 'Bas du corps', r: 3, x: ['25 Squats', '20 Fentes', '20 Pont fessier', '30 Mollets', '40 s Chaise au mur'] },
        { t: 'Cardio HIIT', r: 4, x: ['30 s Jumping jacks', '30 s Montées de genoux', '10 Burpees', '30 s Mountain climbers'] },
        { t: 'Haut du corps', r: 3, x: ['15 Pompes', '12 Dips sur chaise', '10 Pompes pike', '20 s Gainage'] },
        { t: 'Gainage', r: 3, x: ['40 s Planche', '30 s Planche latérale (×2)', '15 Crunchs', '12 Relevés de jambes'] },
        { t: 'Cardio', r: 4, x: ['40 s Jumping jacks', '15 Squats sautés', '30 s Montées de genoux'] },
        { t: 'Mobilité & récup', r: 1, x: ['Chat-vache ×12', 'Étirement psoas 30 s', 'Ouverture thoracique 30 s', 'Mobilité nuque'] },
      ];
      const p = plans[(d - 1) % 7];
      return { subtitle: p.t, rounds: p.r, items: p.x };
    },
  },
  {
    id: 'fullbody15',
    name: 'Full Body 15 jours',
    emoji: '💪',
    color: '#2e7dff',
    days: 15,
    dietKey: 'tone',
    desc: 'Deux semaines de renforcement complet, repos actif tous les 5 jours.',
    build: (d) => {
      const w = week(d);
      const cycle = [
        { t: 'Full body', r: 3, x: [`${12 + w * 3} Pompes`, `${20 + w * 4} Squats`, `${10 + w * 2} Burpees`, `${30 + w * 10} s Planche`] },
        { t: 'Bas du corps', r: 3, x: [`${25 + w * 5} Squats`, `${20 + w * 4} Fentes`, `${15 + w * 3} Pont fessier 1 jambe`, `${30 + w * 5} Mollets`] },
        { t: 'Haut du corps', r: 3, x: [`${12 + w * 3} Pompes`, `${12 + w * 2} Dips`, `${10 + w * 2} Pompes pike`, '30 s Gainage'] },
        { t: 'Cardio HIIT', r: 4, x: ['30 s Jumping jacks', `${12 + w * 2} Squats sautés`, '30 s Mountain climbers', `${10 + w} Burpees`] },
        { t: 'Mobilité & récup', r: 1, x: ['Chat-vache ×12', 'Psoas 30 s', 'Ouverture thoracique 30 s'] },
      ];
      const p = cycle[(d - 1) % 5];
      return { subtitle: p.t, rounds: p.r, items: p.x };
    },
  },
  {
    id: 'pushup28',
    name: 'Défi Pompes 28 jours',
    emoji: '🪖',
    color: '#1fb86b',
    days: 28,
    dietKey: 'maintain',
    desc: 'Progression militaire : de débutant à 50+ pompes, jours « repos » inclus.',
    build: (d) => {
      if (d % 7 === 0) return { subtitle: 'Jour de repos', rounds: 1, items: ['Repos / marche', 'Étirements 10 min', 'Hydratation'] };
      const base = 8 + Math.round(d * 1.4); // progression douce
      return {
        subtitle: 'Objectif pompes du jour',
        rounds: 4,
        items: [
          `${base} Pompes`,
          `${Math.round(base * 0.6)} Pompes serrées (diamant)`,
          `${Math.round(base * 0.5)} Pompes inclinées`,
          `${30 + week(d) * 10} s Planche`,
        ],
      };
    },
  },
  {
    id: 'morning30',
    name: 'Routine Matinale Maison',
    emoji: '🌅',
    color: '#7a5cff',
    days: 30,
    dietKey: 'maintain',
    desc: 'La même routine chaque matin pendant 30 jours. Discipline = résultats.',
    build: () => ({
      subtitle: 'À faire chaque matin',
      rounds: 1,
      items: ['60 Squats', '1 min Planche', '30 Dips sur chaise', '30 Montées de genoux',
        '50 Crunchs', '50 Pompes', '50 Jumping jacks'],
    }),
  },
];

export function getProgram(id) {
  return PROGRAMS_LIB.find((p) => p.id === id) || null;
}

// Contenu d'un jour donné (1..days). `ctx` (optionnel) transmet le contexte au
// programme : { bracket, age } pour les programmes calibrés par tranche d'âge.
export function programDay(program, day, ctx) {
  const d = Math.max(1, Math.min(program.days, day));
  return program.build(d, ctx || {});
}
