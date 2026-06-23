// ============================================================================
// programs.js — Mode INDÉPENDANT : bibliothèque de programmes/défis.
// Chaque programme a une durée (7 / 15 / 30 jours), une diète associée, et
// génère le contenu d'un jour : exercices + nombre de tours (rounds).
// Inspiré des défis fournis (30-day challenge, calisthénics, pompes, etc.).
// ============================================================================

// Petit utilitaire de progression hebdomadaire.
const week = (day) => Math.floor((day - 1) / 7);

export const PROGRAMS_LIB = [
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
