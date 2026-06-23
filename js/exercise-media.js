// ============================================================================
// exercise-media.js — Illustrations anatomiques des exercices.
// Chaque entrée relie une image (icons/exercises/) au texte d'un exercice via
// des mots-clés FR/EN. mediaForExercise() normalise le libellé (retire les
// reps/durées : "25 Crunchs vélo" → "crunchs velo") puis renvoie la 1re entrée
// dont un mot-clé est contenu dans le texte.
//
// ⚠️  L'ORDRE COMPTE : du plus spécifique au plus générique.
//     "crunchs vélo" doit matcher Bicycle AVANT le "crunch" générique.
// ============================================================================

export const EXERCISE_MEDIA = [
  {
    file: 'icons/exercises/bicycle-crunches.png',
    name: 'Bicycle Crunches', muscle: 'Obliques & abdos',
    match: ['crunch velo', 'crunchs velo', 'bicycle', 'velo', 'pedalage'],
  },
  {
    file: 'icons/exercises/reverse-crunch.png',
    name: 'Reverse Crunch', muscle: 'Abdos inférieurs',
    match: ['reverse crunch', 'crunch inverse', 'crunchs inverses', 'releve de bassin'],
  },
  {
    file: 'icons/exercises/sit-ups-crunch.png',
    name: 'Sit Ups / Crunch', muscle: 'Grand droit (abdos)',
    match: ['sit up', 'sit-up', 'crunch', 'redressement', 'abdo'],
  },
  {
    file: 'icons/exercises/russian-twist.png',
    name: 'Russian Twist', muscle: 'Obliques',
    match: ['russian twist', 'russian', 'twist russe', 'rotation russe'],
  },
  {
    file: 'icons/exercises/flutter-kick.png',
    name: 'Flutter Kick', muscle: 'Abdos inférieurs',
    match: ['flutter', 'battement', 'battements de jambes', 'ciseaux'],
  },
  {
    file: 'icons/exercises/leg-raises.png',
    name: 'Leg Raises', muscle: 'Abdos inférieurs',
    match: ['leg raise', 'releve de jambe', 'releves de jambe', 'releve jambe', 'lever de jambe'],
  },
  {
    file: 'icons/exercises/knee-pull-ins.png',
    name: 'Knee Pull Ins', muscle: 'Abdos & gainage',
    match: ['knee pull in', 'mountain climber', 'climber', 'ramene de genou', 'genou poitrine'],
  },
  {
    file: 'icons/exercises/knee-pull-hold.png',
    name: 'Knee Pull Hold', muscle: 'Abdos & gainage',
    match: ['knee pull hold', 'genou maintenu'],
  },
  {
    file: 'icons/exercises/forearm-plank.png',
    name: 'Forearm Plank', muscle: 'Gainage (tronc complet)',
    match: ['forearm plank', 'planche avant-bras', 'planche avant bras', 'gainage', 'planche'],
  },
  {
    file: 'icons/exercises/high-knees.png',
    name: 'High Knees', muscle: 'Cardio, cuisses & abdos',
    match: ['high knee', 'montee de genou', 'montees de genoux', 'genoux hauts', 'course sur place'],
  },
  {
    file: 'icons/exercises/jumping-jacks.png',
    name: 'Jumping Jacks', muscle: 'Cardio (corps entier)',
    match: ['jumping jack', 'jumping-jack', 'jumping jacks', 'sauts ecartes', 'ecart-saute'],
  },
  {
    file: 'icons/exercises/lunges.png',
    name: 'Lunges', muscle: 'Quadriceps & fessiers',
    match: ['lunge', 'fente avant', 'fentes', 'fente'],
  },
  {
    file: 'icons/exercises/step-ups.png',
    name: 'Step Ups', muscle: 'Quadriceps & fessiers',
    match: ['step up', 'step-up', 'montee sur banc', 'montees sur chaise', 'montee marche'],
  },
  {
    file: 'icons/exercises/squats.png',
    name: 'Squats', muscle: 'Quadriceps & fessiers',
    match: ['squat saute', 'squats sautes', 'squat', 'squats', 'flexion jambes'],
  },
  {
    file: 'icons/exercises/pompes.png',
    name: 'Pompes / Push Up', muscle: 'Pectoraux, triceps, épaules',
    match: ['push up', 'push-up', 'pushup', 'pompe', 'pompes'],
  },
];

// Retire accents, chiffres, durées et ponctuation pour une comparaison souple.
function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // accents
    .replace(/[0-9]+([.:]?[0-9]+)?\s*(s|sec|secondes?|min|minutes?|x|reps?)?/g, ' ') // 25, 45 s, 1:30 min…
    .replace(/[^a-z\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Renvoie l'illustration correspondant au libellé d'exercice, ou null.
export function mediaForExercise(label) {
  const txt = normalize(label);
  if (!txt) return null;
  for (const m of EXERCISE_MEDIA) {
    if (m.match.some((kw) => txt.includes(kw))) return m;
  }
  return null;
}
