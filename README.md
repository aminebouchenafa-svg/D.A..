# FLOW — Fitness · Layover · Operations · Wellness

Coach forme & diète **adapté au roster de pilote**. Programme de **30 jours
renouvelables**, où chaque jour est une **page de calendrier** affichant la
séance et les repas — le tout ajusté à ton planning de vol, à ta fatigue et à
la disponibilité d'une salle.

> PWA sans dépendance (HTML/CSS/JS vanilla). 100 % offline, installable sur
> iPhone/Android. Aucune donnée envoyée en ligne : tout est stocké sur le
> téléphone.

## Concept

- **Programme 30 jours renouvelable** (Perte de poids rapide, Tonification, Maintien).
- **Page du jour** : type de séance + diète, comme une page d'agenda.
- **Adaptation type CBTA** : l'intensité s'ajuste à la fatigue déclarée pour
  éviter le surentraînement.
- **Sans matériel par défaut** (faisable en chambre d'hôtel). Bascule en
  version salle si une salle est dispo.
- **Logique roster** :
  - **Vol** → séance courte, anti-posture cockpit.
  - **Night stop** → l'app demande s'il y a une salle et adapte.
  - **Standby** → séance courte interruptible.
  - **Repos / Off** → séance complète.
- **Gamification** : streak (jours consécutifs), progression du cycle, suivi du poids.

## Lancer en local

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Sur iPhone : ouvrir l'URL dans Safari → Partager → « Sur l'écran d'accueil »
pour l'installer comme une app.

## Structure

```
index.html              # coquille de l'app + tabbar
manifest.webmanifest    # PWA
sw.js                   # service worker (offline)
css/styles.css          # thème sombre "cockpit"
js/
  config.js             # nom/branding (FLOW) — centralisé
  data.js               # programmes, BIBLIOTHÈQUE D'EXERCICES, repas
  storage.js            # persistance localStorage
  adaptation.js         # moteur d'adaptation (roster → séance)
  app.js                # vues & interactions
icons/                  # logo SVG + PNG (192/512/180)
```

## Personnaliser les exercices

Toute la bibliothèque est dans **`js/data.js`** (constante `EXERCISES`). La
structure de chaque exercice y est documentée. Ajoute/remplace librement :
le moteur s'appuie sur la **structure**, pas sur le nombre d'exercices.

## Roadmap

- [x] MVP : programmes, page du jour, calendrier 30 j, roster manuel, progrès, PWA offline.
- [ ] Import **PDF du roster** (parsing automatique).
- [ ] Intégration des exercices issus des documents fournis.
- [ ] Historique de poids graphique, rappels, export.
- [ ] (Option) Portage Flutter.
