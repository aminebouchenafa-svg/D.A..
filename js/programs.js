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

export const PROGRAMS_LIB = [
  {
    id: 'belly30',
    name: '30-Day Belly Fat Burn',
    emoji: '🔥',
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

// Contenu d'un jour donné (1..days).
export function programDay(program, day) {
  const d = Math.max(1, Math.min(program.days, day));
  return program.build(d);
}
