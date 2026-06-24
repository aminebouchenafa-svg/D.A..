// ============================================================================
// app.js — Contrôleur principal de FLOW. Rendu des vues + interactions.
// ============================================================================

import { APP } from './config.js';
import { PROGRAMS, DUTY_TYPES, DUTY_LOADS, MEAL_PLANS, MEAL_VARIANTS, ageBracket } from './data.js';
import { importRoster } from './roster-import.js';
import { PROGRAMS_LIB, getProgram, programDay } from './programs.js';
import {
  getState, setState, resetState, setRoster, getLog, setLog,
  exportJSON, importJSON,
} from './storage.js';
import {
  planDay, todayISO, toISO, addDays, programDayFor,
  computeStreak, completedCount,
} from './adaptation.js';
import { dailyTargets, achievedFromLog } from './nutrition.js';
import { searchGI, giCategory } from './glycemic.js';
import { mediaForExercise } from './exercise-media.js';
import { openHiitTimer } from './timer.js';

const appEl = document.getElementById('app');
const tabbar = document.getElementById('tabbar');

let currentView = 'today';
let selectedDate = todayISO();
let openInstanceId = null;   // mode Défis : instance ouverte (null = bibliothèque)
let openProgramDay = 1;      // jour affiché dans la feuille de calendrier

// --- Utilitaires DOM --------------------------------------------------------

function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function fmtDateLong(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
function fmtDateShort(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// --- Routeur ----------------------------------------------------------------

function render() {
  const state = getState();
  if (!state.onboarded) {
    tabbar.hidden = true;
    renderOnboarding();
    return;
  }
  tabbar.hidden = false;
  [...tabbar.querySelectorAll('.tab')].forEach((b) =>
    b.classList.toggle('tab--active', b.dataset.view === currentView));

  const views = {
    today: renderToday,
    calendar: renderCalendar,
    roster: renderRoster,
    programs: renderPrograms,
    progress: renderProgress,
    settings: renderSettings,
  };
  (views[currentView] || renderToday)();
}

tabbar.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  currentView = btn.dataset.view;
  if (currentView === 'today') selectedDate = todayISO();
  render();
  window.scrollTo(0, 0);
});

// ============================================================================
// ONBOARDING
// ============================================================================

function renderOnboarding() {
  appEl.innerHTML = '';
  const wrap = h(`
    <div class="screen onboard">
      <header class="brand">
        <div class="brand__logo">✈︎</div>
        <h1 class="brand__name">${APP.name}</h1>
        <p class="brand__meaning">${APP.meaning}</p>
        <p class="brand__tagline">${APP.tagline}</p>
      </header>

      <form id="onboardForm" class="card form">
        <h2>Ton profil</h2>
        <label>Prénom
          <input name="name" type="text" autocomplete="given-name" placeholder="Amine" />
        </label>
        <div class="row">
          <label>Âge<input name="age" type="number" min="14" max="90" placeholder="38" /></label>
          <label>Sexe
            <select name="sex">
              <option value="h">Homme</option>
              <option value="f">Femme</option>
            </select>
          </label>
        </div>
        <div class="row">
          <label>Taille (cm)<input name="heightCm" type="number" min="120" max="230" placeholder="180" /></label>
          <label>Poids (kg)<input name="weightKg" type="number" min="35" max="250" step="0.1" placeholder="84" /></label>
        </div>
        <label>Objectif de poids (kg)
          <input name="targetWeightKg" type="number" min="35" max="250" step="0.1" placeholder="78" />
        </label>

        <h2>Ton programme (30 jours renouvelables)</h2>
        <div class="program-picker" id="programPicker">
          ${Object.values(PROGRAMS).map((p, i) => `
            <label class="program-card ${i === 0 ? 'is-selected' : ''}" style="--accent:${p.color}">
              <input type="radio" name="programId" value="${p.id}" ${i === 0 ? 'checked' : ''} />
              <span class="program-card__name">${p.name}</span>
              <span class="program-card__tag">${p.tagline}</span>
            </label>`).join('')}
        </div>

        <button type="submit" class="btn btn--primary btn--lg">Démarrer mon programme</button>
        <p class="fineprint">Tout est stocké sur ton téléphone. Aucune donnée envoyée en ligne.</p>
      </form>
    </div>`);
  appEl.appendChild(wrap);

  wrap.querySelector('#programPicker').addEventListener('change', (e) => {
    wrap.querySelectorAll('.program-card').forEach((c) =>
      c.classList.toggle('is-selected', c.querySelector('input').checked));
  });

  wrap.querySelector('#onboardForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setState((s) => {
      s.onboarded = true;
      s.profile.name = fd.get('name') || '';
      s.profile.age = num(fd.get('age'));
      s.profile.sex = fd.get('sex') || 'h';
      s.profile.heightCm = num(fd.get('heightCm'));
      s.profile.weightKg = num(fd.get('weightKg'));
      s.profile.targetWeightKg = num(fd.get('targetWeightKg'));
      s.programId = fd.get('programId') || 'fat_loss';
      s.startDateISO = todayISO();
      s.cycleCount = 1;
    });
    currentView = 'today';
    selectedDate = todayISO();
    render();
  });
}

function num(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : null; }

// ============================================================================
// AUJOURD'HUI — la "page calendrier" du jour (vue héro)
// ============================================================================

function renderToday() {
  const state = getState();
  const plan = planDay(state, selectedDate);
  const log = getLog(selectedDate);
  const dp = plan.dp;
  const isToday = selectedDate === todayISO();

  appEl.innerHTML = '';
  const screen = h(`<div class="screen"></div>`);

  // En-tête type page de calendrier
  const header = h(`
    <div class="day-page" style="--accent:${plan.program.color}">
      <div class="day-page__nav">
        <button class="iconbtn" id="prevDay" aria-label="Jour précédent">‹</button>
        <div class="day-page__center">
          <div class="day-page__cycle">Cycle ${dp ? dp.cycle : 1} · Jour ${dp ? dp.day : 1}/30</div>
          <div class="day-page__date">${cap(fmtDateLong(selectedDate))}</div>
          ${isToday ? '<span class="badge badge--today">Aujourd’hui</span>' : ''}
        </div>
        <button class="iconbtn" id="nextDay" aria-label="Jour suivant">›</button>
      </div>
      <div class="day-page__program">${plan.program.name}</div>
    </div>`);
  screen.appendChild(header);

  // Bannière préparation visite médicale (VM) — active 1 mois avant
  if (plan.medicalPrep && plan.medicalPrep.active) {
    const d = plan.medicalPrep.daysLeft;
    screen.appendChild(h(`
      <div class="vm-banner">
        <div class="vm-banner__icon">🩺</div>
        <div>
          <div class="vm-banner__title">Visite médicale dans ${d} jour${d > 1 ? 's' : ''}</div>
          <div class="vm-banner__sub">Mode remise en forme &amp; perte de poids activé : diète allégée, régularité, hydratation.</div>
        </div>
      </div>`));
  }

  // Bandeau roster + fatigue + salle
  screen.appendChild(renderDutyStrip(plan));

  // Question salle si night stop non renseigné
  if (plan.needsGymQuestion) {
    screen.appendChild(renderGymPrompt());
  }

  // Carte séance
  screen.appendChild(renderSessionCard(plan, log));

  // Carte repas / diète
  screen.appendChild(renderMealsCard(plan, log));

  appEl.appendChild(screen);

  header.querySelector('#prevDay').onclick = () => { selectedDate = addDays(selectedDate, -1); render(); };
  header.querySelector('#nextDay').onclick = () => { selectedDate = addDays(selectedDate, 1); render(); };
}

function renderDutyStrip(plan) {
  const duty = DUTY_TYPES[plan.duty] || DUTY_TYPES.off;
  const fatigueLabel = { low: 'En forme', normal: 'Normale', high: 'Fatigué' }[plan.fatigue] || 'Normale';
  const strip = h(`
    <div class="dutystrip">
      <button class="chip" id="editDuty" style="--c:${duty.color}">
        <span>${duty.icon}</span> ${duty.label}
      </button>
      <button class="chip" id="editFatigue">
        <span>🔋</span> Forme : ${fatigueLabel}
      </button>
      ${plan.duty === 'nightstop'
        ? `<button class="chip" id="toggleGym">${plan.gym ? '🏋️ Salle dispo' : '🛏️ Sans salle'}</button>`
        : ''}
    </div>`);

  strip.querySelector('#editDuty').onclick = () => cycleDuty();
  strip.querySelector('#editFatigue').onclick = () => cycleFatigue();
  const g = strip.querySelector('#toggleGym');
  if (g) g.onclick = () => { toggleGym(); };
  return strip;
}

function cycleDuty() {
  const order = ['off', 'flight', 'nightstop', 'standby', 'vacation'];
  const cur = (getState().roster[selectedDate] || {}).duty || 'off';
  const next = order[(order.indexOf(cur) + 1) % order.length];
  setRoster(selectedDate, { duty: next });
  render();
}
function cycleFatigue() {
  const order = ['normal', 'low', 'high'];
  const cur = (getState().roster[selectedDate] || {}).fatigue || 'normal';
  const next = order[(order.indexOf(cur) + 1) % order.length];
  setRoster(selectedDate, { fatigue: next });
  render();
}
function toggleGym() {
  const cur = (getState().roster[selectedDate] || {}).gym;
  setRoster(selectedDate, { gym: !cur });
  render();
}

function renderGymPrompt() {
  const box = h(`
    <div class="card prompt">
      <p><strong>Night stop 🏨</strong> — Y a-t-il une salle de sport à l’hôtel ?</p>
      <div class="row">
        <button class="btn" id="gymYes">Oui, salle dispo</button>
        <button class="btn btn--ghost" id="gymNo">Non, sans matériel</button>
      </div>
    </div>`);
  box.querySelector('#gymYes').onclick = () => { setRoster(selectedDate, { gym: true }); render(); };
  box.querySelector('#gymNo').onclick = () => { setRoster(selectedDate, { gym: false }); render(); };
  return box;
}

function renderSessionCard(plan, log) {
  const s = plan.session;
  if (s.kind === 'rest') {
    return h(`
      <div class="card session session--rest">
        <div class="card__title">🛌 ${s.title}</div>
        <p>${s.summary}</p>
      </div>`);
  }

  // Minuteur HIIT proposé si la séance contient du cardio (focus cardio ou exos cardio).
  const isHiit = s.focus === 'cardio' || s.blocks.some((b) => b.items.some((e) => e.type === 'cardio'));

  const blocksHtml = s.blocks.map((b) => `
    <div class="block">
      <div class="block__label">${b.label}</div>
      <ul class="exlist">
        ${b.items.map((e) => `
          <li class="ex">
            <div class="ex__main">
              <span class="ex__name">${esc(e.name)}</span>
              <span class="ex__work">${workLabel(e.work)}</span>
            </div>
            ${e.cue ? `<div class="ex__cue">${esc(e.cue)}</div>` : ''}
          </li>`).join('')}
      </ul>
    </div>`).join('');

  const card = h(`
    <div class="card session" style="--accent:${plan.program.color}">
      <div class="session__head">
        <div>
          <div class="card__eyebrow">Séance du jour · ${s.equipment}</div>
          <div class="card__title">${esc(s.title)}</div>
        </div>
        <div class="session__meta">⏱ ${s.durationMin} min · 🔥 ${Math.round(s.intensity)}/5</div>
      </div>
      ${plan.notes.length ? `<div class="notes">${plan.notes.map((n) => `<div class="note">💡 ${esc(n)}</div>`).join('')}</div>` : ''}
      ${blocksHtml}
      ${isHiit ? `<button class="btn btn--hiit btn--lg" id="hiitBtn">⏱ Lancer le minuteur HIIT (20/10)</button>` : ''}
      <button class="btn btn--primary btn--lg ${log.workoutDone ? 'btn--done' : ''}" id="doneBtn">
        ${log.workoutDone ? '✅ Séance validée' : 'Marquer la séance comme faite'}
      </button>
      ${log.workoutDone ? `
        <div class="rating">
          <div class="rating__q">Comment c'était ?</div>
          <div class="row">
            <button class="btn ${log.rating === 'nailed' ? 'btn--done' : ''}" data-rate="nailed">💪 NAILED IT</button>
            <button class="btn ${log.rating === 'barely' ? 'btn--warn' : ''}" data-rate="barely">😮‍💨 BARELY MADE IT</button>
          </div>
          ${log.rating === 'barely' ? '<div class="note">💡 Noté. FLOW proposera une intensité plus douce si la fatigue persiste.</div>' : ''}
        </div>` : ''}
    </div>`);

  card.querySelector('#doneBtn').onclick = () => {
    setLog(selectedDate, { workoutDone: !log.workoutDone });
    render();
  };
  const hiitBtn = card.querySelector('#hiitBtn');
  if (hiitBtn) hiitBtn.onclick = () => openHiitTimer(s.blocks[1].items);
  card.querySelectorAll('[data-rate]').forEach((b) => {
    b.onclick = () => { setLog(selectedDate, { rating: b.dataset.rate }); render(); };
  });
  return card;
}

function workLabel(w) {
  if (!w) return '';
  const parts = [];
  if (w.sets) parts.push(`${w.sets}×`);
  if (w.reps) parts.push(`${w.reps} reps`);
  else if (w.sec) parts.push(`${w.sec >= 60 ? Math.round(w.sec / 60) + ' min' : w.sec + ' s'}`);
  return parts.join(' ');
}

function renderMealsCard(plan, log) {
  const state = getState();
  const m = plan.meals;
  const slots = [
    ['breakfast', m.breakfast], ['lunch', m.lunch],
    ['dinner', m.dinner], ['snack', m.snack],
  ];
  const meals = log.meals || {};
  const tgt = dailyTargets(state);
  const got = achievedFromLog(state, selectedDate);

  const macroBar = (label, val, max, unit, color) => {
    const pct = max ? Math.min(100, Math.round((val / max) * 100)) : 0;
    return `<div class="macro">
      <div class="macro__top"><span>${label}</span><span>${val}/${max}${unit}</span></div>
      <div class="macro__track"><div class="macro__fill" style="width:${pct}%;background:${color}"></div></div>
    </div>`;
  };

  const card = h(`
    <div class="card meals">
      <div class="card__eyebrow">Diète · ${plan.program.name} · objectif ${tgt.kcal} kcal</div>
      <div class="card__title">🍽️ Repas du jour</div>
      <div class="macros">
        ${macroBar('Calories', got.kcal, tgt.kcal, '', '#ff5a3c')}
        ${macroBar('Protéines', got.p, tgt.p, ' g', '#2e7dff')}
        ${macroBar('Glucides', got.c, tgt.c, ' g', '#f5a623')}
        ${macroBar('Lipides', got.f, tgt.f, ' g', '#7a5cff')}
      </div>
      <div class="meal-slots">
        ${slots.map(([key, v]) => `
          <label class="meal ${meals[key] ? 'is-checked' : ''}" data-key="${key}">
            <input type="checkbox" ${meals[key] ? 'checked' : ''} />
            <div class="meal__body">
              <div class="meal__title">${esc(v.title)} <span class="meal__kcal">${v.kcal} kcal</span></div>
              <div class="meal__items">${v.items.map((i) => esc(i)).join(' · ')}</div>
            </div>
          </label>`).join('')}
      </div>
      <button class="btn btn--ghost" id="giBtn">🔍 Index glycémique des aliments</button>
      <div class="note">💡 ${esc(m.tips)}</div>
    </div>`);

  card.querySelectorAll('.meal').forEach((el) => {
    el.querySelector('input').addEventListener('change', (e) => {
      const key = el.dataset.key;
      const cur = getLog(selectedDate).meals || {};
      setLog(selectedDate, { meals: { ...cur, [key]: e.target.checked } });
      render(); // rafraîchit les barres de macros
    });
  });
  card.querySelector('#giBtn').onclick = openGIModal;
  return card;
}

// --- Modal Index Glycémique -------------------------------------------------
function openGIModal() {
  const overlay = h(`
    <div class="modal">
      <div class="modal__sheet">
        <div class="modal__head">
          <h2>🔍 Index Glycémique</h2>
          <button class="iconbtn" id="giClose" aria-label="Fermer">✕</button>
        </div>
        <input type="search" id="giSearch" class="gi-search" placeholder="Rechercher un aliment (ex. riz, pomme, pain)…" />
        <div class="gi-legend">
          <span><i style="background:#1fb86b"></i>IG bas &lt;40</span>
          <span><i style="background:#f5a623"></i>moyen 40–59</span>
          <span><i style="background:#ff5a5a"></i>élevé ≥60</span>
        </div>
        <div class="gi-list" id="giList"></div>
      </div>
    </div>`);
  document.body.appendChild(overlay);
  const list = overlay.querySelector('#giList');
  const input = overlay.querySelector('#giSearch');

  const paint = (q) => {
    const res = searchGI(q || '');
    list.innerHTML = res.map((f) => {
      const c = giCategory(f.ig);
      return `<div class="gi-row">
        <span class="gi-name">${esc(f.n)}</span>
        <span class="gi-val" style="background:${c.color}">${f.ig}</span>
      </div>`;
    }).join('') || '<p class="muted">Aucun résultat.</p>';
  };
  paint('');
  input.addEventListener('input', (e) => paint(e.target.value));
  overlay.querySelector('#giClose').onclick = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  setTimeout(() => input.focus(), 50);
}

// ============================================================================
// CALENDRIER — grille 30 jours du cycle courant
// ============================================================================

function renderCalendar() {
  const state = getState();
  const startCycle = cycleStartFor(state, selectedDate);
  appEl.innerHTML = '';
  const screen = h(`<div class="screen"></div>`);

  const cells = [];
  for (let i = 0; i < 30; i++) {
    const iso = addDays(startCycle, i);
    const log = state.logs[iso] || {};
    const roster = state.roster[iso] || {};
    const duty = DUTY_TYPES[roster.duty || 'off'];
    const isToday = iso === todayISO();
    const isSel = iso === selectedDate;
    cells.push(`
      <button class="calcell ${log.workoutDone ? 'calcell--done' : ''} ${isToday ? 'calcell--today' : ''} ${isSel ? 'calcell--sel' : ''}"
        data-iso="${iso}">
        <span class="calcell__num">${i + 1}</span>
        <span class="calcell__date">${fmtDateShort(iso)}</span>
        <span class="calcell__duty">${duty.icon}</span>
        ${log.workoutDone ? '<span class="calcell__check">✓</span>' : ''}
      </button>`);
  }

  const dp = programDayFor(state, selectedDate);
  screen.appendChild(h(`
    <div class="screen__head">
      <h1>Cycle ${dp ? dp.cycle : 1} · 30 jours</h1>
      <p class="muted">${cap(fmtDateLong(startCycle))} → ${cap(fmtDateLong(addDays(startCycle, 29)))}</p>
    </div>`));
  const grid = h(`<div class="calgrid">${cells.join('')}</div>`);
  grid.querySelectorAll('.calcell').forEach((c) =>
    c.addEventListener('click', () => {
      selectedDate = c.dataset.iso;
      currentView = 'today';
      render();
      window.scrollTo(0, 0);
    }));
  screen.appendChild(grid);
  appEl.appendChild(screen);
}

function cycleStartFor(state, dateISO) {
  const dp = programDayFor(state, dateISO);
  if (!dp) return state.startDateISO || todayISO();
  return addDays(dateISO, -(dp.day - 1));
}

// ============================================================================
// ROSTER — saisie manuelle (MVP) + placeholder import PDF
// ============================================================================

function renderRoster() {
  const state = getState();
  appEl.innerHTML = '';
  const screen = h(`<div class="screen"></div>`);
  screen.appendChild(h(`
    <div class="screen__head">
      <h1>✈️ Mon roster</h1>
      <p class="muted">Renseigne tes journées : la séance s’adapte automatiquement (vol, repos, night stop, fatigue, salle).</p>
    </div>`));

  // Import PDF (réel)
  const importCard = h(`
    <div class="card">
      <div class="card__title">📄 Importer mon roster (PDF)</div>
      <p class="muted">Dépose le PDF de ta compagnie : FLOW lit les dates et les types de service, puis tu relis/corriges avant d’appliquer.</p>
      <label class="btn btn--primary btn--lg" for="rosterFile">📤 Choisir un PDF</label>
      <input type="file" id="rosterFile" accept="application/pdf" hidden />
      <div id="rosterImportStatus" class="muted" style="margin-top:8px"></div>
    </div>`);
  const fileInput = importCard.querySelector('#rosterFile');
  const statusEl = importCard.querySelector('#rosterImportStatus');
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    statusEl.textContent = '⏳ Lecture du PDF…';
    try {
      const entries = await importRoster(file);
      if (!entries.length) {
        statusEl.innerHTML = '⚠️ Aucune date détectée automatiquement. Envoie-moi ce PDF en exemple pour que j’affine la lecture — en attendant, saisis tes journées ci-dessous.';
        return;
      }
      statusEl.textContent = `✅ ${entries.length} jours détectés.`;
      openRosterReview(entries);
    } catch (err) {
      statusEl.textContent = `❌ ${err.message || 'Lecture impossible'}. Vérifie ta connexion (le lecteur PDF se télécharge la 1re fois).`;
    } finally {
      fileInput.value = '';
    }
  });
  screen.appendChild(importCard);

  // 14 prochains jours
  const list = h(`<div class="card"><div class="card__title">14 prochains jours</div><div id="rosterList"></div></div>`);
  const listBody = list.querySelector('#rosterList');
  for (let i = 0; i < 14; i++) {
    const iso = addDays(todayISO(), i);
    const r = state.roster[iso] || {};
    const showLoad = (r.duty === 'flight' || r.duty === 'nightstop');
    const row = h(`
      <div class="rosterrow">
        <div class="rosterrow__top">
          <div class="rosterrow__date">${i === 0 ? 'Auj.' : cap(fmtDateShort(iso))}</div>
          <select class="rosterrow__duty" data-iso="${iso}">
            ${Object.values(DUTY_TYPES).map((d) =>
              `<option value="${d.id}" ${ (r.duty || 'off') === d.id ? 'selected' : ''}>${d.icon} ${d.label}</option>`).join('')}
          </select>
          <select class="rosterrow__fatigue" data-iso="${iso}">
            <option value="normal" ${ (r.fatigue||'normal')==='normal'?'selected':''}>🔋 Normale</option>
            <option value="low" ${ r.fatigue==='low'?'selected':''}>⚡ En forme</option>
            <option value="high" ${ r.fatigue==='high'?'selected':''}>😴 Fatigué</option>
          </select>
        </div>
        ${showLoad ? `
        <label class="rosterrow__load">⏱ Temps de service
          <select class="rosterrow__loadsel" data-iso="${iso}">
            ${Object.values(DUTY_LOADS).map((l) =>
              `<option value="${l.id}" ${ (r.dutyLoad || 'medium') === l.id ? 'selected' : ''}>${l.label}</option>`).join('')}
          </select>
        </label>` : ''}
      </div>`);
    listBody.appendChild(row);
  }
  list.querySelectorAll('.rosterrow__duty').forEach((sel) =>
    sel.addEventListener('change', (e) => { setRoster(e.target.dataset.iso, { duty: e.target.value }); render(); }));
  list.querySelectorAll('.rosterrow__fatigue').forEach((sel) =>
    sel.addEventListener('change', (e) => setRoster(e.target.dataset.iso, { fatigue: e.target.value })));
  list.querySelectorAll('.rosterrow__loadsel').forEach((sel) =>
    sel.addEventListener('change', (e) => setRoster(e.target.dataset.iso, { dutyLoad: e.target.value })));
  screen.appendChild(list);
  appEl.appendChild(screen);
}

// --- Écran de relecture du roster importé -----------------------------------
function openRosterReview(entries) {
  const overlay = h(`
    <div class="modal">
      <div class="modal__sheet">
        <div class="modal__head">
          <h2>📋 Relecture du roster</h2>
          <button class="iconbtn" id="rvClose" aria-label="Fermer">✕</button>
        </div>
        <p class="muted">Vérifie chaque jour détecté. Corrige si besoin, puis applique. Les jours non sûrs sont marqués ⚠️.</p>
        <div class="gi-list" id="rvList"></div>
        <button class="btn btn--primary btn--lg" id="rvApply">Appliquer ${entries.length} jours au planning</button>
      </div>
    </div>`);
  document.body.appendChild(overlay);
  const listEl = overlay.querySelector('#rvList');
  listEl.innerHTML = entries.map((en, i) => `
    <div class="rv-row">
      <div class="rv-date">${cap(fmtDateShort(en.iso))} ${en.medical ? '🩺' : (en.confident ? '' : '⚠️')}</div>
      <select class="rv-duty" data-i="${i}">
        ${Object.values(DUTY_TYPES).map((d) =>
          `<option value="${d.id}" ${en.duty === d.id ? 'selected' : ''}>${d.icon} ${d.label}</option>`).join('')}
      </select>
      <select class="rv-load" data-i="${i}" ${(en.duty === 'flight' || en.duty === 'nightstop') ? '' : 'hidden'}>
        ${Object.values(DUTY_LOADS).map((l) =>
          `<option value="${l.id}" ${(en.dutyLoad || 'medium') === l.id ? 'selected' : ''}>${l.label}</option>`).join('')}
      </select>
    </div>`).join('');

  listEl.querySelectorAll('.rv-duty').forEach((sel) => sel.addEventListener('change', (e) => {
    const i = +e.target.dataset.i;
    entries[i].duty = e.target.value;
    const loadSel = listEl.querySelector(`.rv-load[data-i="${i}"]`);
    if (loadSel) loadSel.hidden = !(e.target.value === 'flight' || e.target.value === 'nightstop');
  }));
  listEl.querySelectorAll('.rv-load').forEach((sel) => sel.addEventListener('change', (e) => {
    entries[+e.target.dataset.i].dutyLoad = e.target.value;
  }));

  overlay.querySelector('#rvClose').onclick = () => overlay.remove();
  overlay.querySelector('#rvApply').onclick = () => {
    let vm = null;
    entries.forEach((en) => {
      const patch = { duty: en.duty };
      if (en.duty === 'flight' || en.duty === 'nightstop' || en.duty === 'training') patch.dutyLoad = en.dutyLoad || 'medium';
      setRoster(en.iso, patch);
      if (en.medical) vm = en.iso; // dernière VM détectée
    });
    if (vm) setState({ medicalDateISO: vm });
    overlay.remove();
    render();
  };
}

// ============================================================================
// MODE DÉFIS — bibliothèque de programmes indépendants + feuille de calendrier
// ============================================================================

function renderPrograms() {
  const state = getState();
  if (openInstanceId) {
    const inst = (state.myPrograms || []).find((p) => p.id === openInstanceId);
    if (inst) return renderProgramSheet(inst);
    openInstanceId = null;
  }
  appEl.innerHTML = '';
  const screen = h(`<div class="screen"></div>`);
  screen.appendChild(h(`
    <div class="screen__head">
      <h1>🏆 Défis & Programmes</h1>
      <p class="muted">Des programmes indépendants (7, 15 ou 30 jours). Choisis-en un, donne-lui un nom, suis-le jour par jour.</p>
    </div>`));

  // Mes programmes en cours
  const mine = state.myPrograms || [];
  if (mine.length) {
    const card = h(`<div class="card"><div class="card__title">Mes programmes</div><div id="myProgs"></div></div>`);
    const body = card.querySelector('#myProgs');
    mine.forEach((inst) => {
      const prog = getProgram(inst.programId);
      if (!prog) return;
      const doneCount = countDoneDays(prog, inst);
      const pct = Math.round((doneCount / prog.days) * 100);
      const row = h(`
        <div class="prog-row" data-id="${inst.id}">
          <div class="prog-row__emoji">${prog.emoji}</div>
          <div class="prog-row__body">
            <div class="prog-row__name">${esc(inst.name)}</div>
            <div class="progressbar"><div class="progressbar__fill" style="width:${pct}%"></div></div>
            <div class="muted">${doneCount}/${prog.days} jours · ${pct}%</div>
          </div>
          <button class="iconbtn" data-del="${inst.id}" aria-label="Supprimer">🗑️</button>
        </div>`);
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-del]')) {
          if (confirm('Supprimer ce programme et sa progression ?')) {
            setState((s) => { s.myPrograms = s.myPrograms.filter((p) => p.id !== inst.id); });
            render();
          }
          return;
        }
        openInstanceId = inst.id;
        openProgramDay = firstUndoneDay(prog, inst);
        render();
      });
      body.appendChild(row);
    });
    screen.appendChild(card);
  }

  // Bibliothèque
  const lib = h(`<div class="card"><div class="card__title">Bibliothèque</div><div id="lib"></div></div>`);
  const libBody = lib.querySelector('#lib');
  PROGRAMS_LIB.forEach((prog) => {
    const c = h(`
      <div class="lib-card" style="--accent:${prog.color || '#2e7dff'}">
        <div class="lib-card__head"><span class="lib-card__emoji">${prog.emoji}</span>
          <span class="lib-card__name">${esc(prog.name)}</span>
          <span class="lib-card__days">${prog.days} j</span></div>
        <div class="muted">${esc(prog.desc)}</div>
        ${prog.byAge ? '<div class="lib-card__age">🎂 Adapté à ta tranche d’âge</div>' : ''}
        <button class="btn btn--primary" data-start="${prog.id}">Démarrer</button>
      </div>`);
    c.querySelector('[data-start]').onclick = () => startProgram(prog);
    libBody.appendChild(c);
  });
  screen.appendChild(lib);
  appEl.appendChild(screen);
}

function startProgram(prog) {
  const name = (prompt('Nom de ton programme :', prog.name) || '').trim() || prog.name;
  const inst = { id: 'p' + Date.now(), programId: prog.id, name, startISO: todayISO(), done: {} };

  // Programmes calibrés par tranche d'âge : on demande l'âge pour adapter le
  // volume et l'intensité (pré-rempli avec l'âge du profil s'il existe).
  if (prog.byAge) {
    const def = (getState().profile && getState().profile.age) || '';
    const ans = prompt('Quel est ton âge ? (le programme sera adapté à ta tranche d’âge)', def);
    const age = Math.max(14, Math.min(90, parseInt(ans, 10)));
    if (Number.isFinite(age)) {
      inst.age = age;
      setState((s) => { s.profile = s.profile || {}; if (!s.profile.age) s.profile.age = age; });
    }
  }

  setState((s) => { s.myPrograms = [...(s.myPrograms || []), inst]; });
  openInstanceId = inst.id;
  openProgramDay = 1;
  render();
}

// Contexte d'un programme (âge/tranche) pour les programmes calibrés par âge.
function programCtx(inst) {
  const age = (inst && inst.age) || (getState().profile && getState().profile.age) || null;
  return { age, bracket: ageBracket(age) };
}

// Un jour est "fait" si tous ses exercices sont cochés.
function dayExercises(prog, day, inst) { return programDay(prog, day, programCtx(inst)).items || []; }
function isDayDone(prog, day, inst) {
  const items = dayExercises(prog, day, inst);
  if (!items.length) return false;
  const arr = (inst.done || {})[day] || [];
  return items.every((_, i) => arr[i]);
}
function countDoneDays(prog, inst) {
  let n = 0;
  for (let d = 1; d <= prog.days; d++) if (isDayDone(prog, d, inst)) n++;
  return n;
}
function firstUndoneDay(prog, inst) {
  for (let d = 1; d <= prog.days; d++) if (!isDayDone(prog, d, inst)) return d;
  return 1;
}

// Repas du jour : varie jour par jour en piochant dans la banque de recettes.
function mealsForDay(prog, day) {
  const key = prog.dietKey;
  const base = MEAL_PLANS[key] || MEAL_PLANS.fat_loss;
  const variants = MEAL_VARIANTS[key];
  if (!variants) return base;
  const pick = (slot) => {
    const opts = variants[slot];
    if (!opts || !opts.length) return base[slot];
    return opts[(day - 1) % opts.length];
  };
  return {
    breakfast: pick('breakfast'),
    lunch: pick('lunch'),
    dinner: pick('dinner'),
    snack: pick('snack'),
    tips: base.tips,
  };
}

// Feuille de calendrier d'un jour : exercices cochables + repas. Thème néon sombre.
function renderProgramSheet(inst) {
  const prog = getProgram(inst.programId);
  const day = Math.max(1, Math.min(prog.days, openProgramDay));
  const content = programDay(prog, day, programCtx(inst));
  const items = content.items || [];
  const checks = (inst.done || {})[day] || [];
  const meals = mealsForDay(prog, day);
  const allDone = isDayDone(prog, day, inst);

  appEl.innerHTML = '';
  const screen = h(`<div class="screen screen--neon"></div>`);

  // En-tête + navigation
  const top = h(`
    <div class="sheet-top">
      <button class="btn btn--ghost" id="backLib">‹ Programmes</button>
      <div class="sheet-top__name">${prog.emoji} ${esc(inst.name)}</div>
    </div>`);
  top.querySelector('#backLib').onclick = () => { openInstanceId = null; render(); };
  screen.appendChild(top);

  // Feuille de calendrier néon
  const sheet = h(`
    <div class="calsheet calsheet--neon">
      <div class="calsheet__head">
        <button class="iconbtn" id="prevD">‹</button>
        <div class="calsheet__daynum">JOUR ${day} <span>/ ${prog.days}</span></div>
        <button class="iconbtn" id="nextD">›</button>
      </div>
      <div class="calsheet__sub">${esc(content.subtitle || '')}</div>
      <div class="calsheet__cols">
        <div class="calsheet__col">
          <div class="calsheet__coltitle">🏋️ L'entraînement du jour</div>
          <ul class="calsheet__ex" id="exList">
            ${items.map((it, i) => {
              const media = mediaForExercise(it);
              return `
              <li class="exitem ${checks[i] ? 'is-checked' : ''}" data-i="${i}">
                <span class="exitem__box">${checks[i] ? '✓' : ''}</span>
                <span class="exitem__txt">${esc(it)}</span>
                ${media ? `<button class="exitem__media" data-media="${i}" aria-label="Voir l'exercice">
                  <img src="${media.file}" alt="${esc(media.name)}" loading="lazy"/>
                </button>` : ''}
              </li>`;
            }).join('')}
          </ul>
        </div>
        <div class="calsheet__col calsheet__col--meals">
          <div class="calsheet__coltitle">🍽️ Les repas du jour</div>
          ${['breakfast', 'lunch', 'dinner', 'snack'].map((k) => meals[k] ? `
            <div class="calmeal"><b>${esc(meals[k].title)}</b><div class="muted">${meals[k].items.map(esc).join(' · ')}</div></div>` : '').join('')}
        </div>
      </div>
      <button class="btn ${allDone ? 'btn--done' : 'btn--primary'} btn--lg" id="markDay">
        ${allDone ? '✅ Jour terminé — tout décocher' : 'Tout marquer comme fait'}
      </button>
    </div>`);
  screen.appendChild(sheet);

  // Grille des jours
  const grid = h(`<div class="card card--neon"><div class="card__title">Progression</div><div class="pgrid" id="pgrid"></div></div>`);
  const pg = grid.querySelector('#pgrid');
  for (let d = 1; d <= prog.days; d++) {
    const cell = h(`<button class="pcell ${isDayDone(prog, d, inst) ? 'is-done' : ''} ${d === day ? 'is-cur' : ''}">${d}</button>`);
    cell.onclick = () => { openProgramDay = d; render(); };
    pg.appendChild(cell);
  }
  screen.appendChild(grid);
  appEl.appendChild(screen);

  sheet.querySelector('#prevD').onclick = () => { openProgramDay = Math.max(1, day - 1); render(); };
  sheet.querySelector('#nextD').onclick = () => { openProgramDay = Math.min(prog.days, day + 1); render(); };
  sheet.querySelector('#markDay').onclick = () => { setDayChecks(inst.id, day, items.length, allDone ? false : true); render(); };
  sheet.querySelectorAll('.exitem').forEach((li) => li.onclick = () => {
    toggleExercise(inst.id, day, +li.dataset.i, items.length);
    render();
  });
  // La miniature ouvre l'illustration (sans cocher l'exercice).
  sheet.querySelectorAll('.exitem__media').forEach((btn) => btn.onclick = (e) => {
    e.stopPropagation();
    openExerciseMedia(mediaForExercise(items[+btn.dataset.media]));
  });
}

// Popup plein écran : illustration anatomique d'un exercice.
function openExerciseMedia(media) {
  if (!media) return;
  const overlay = h(`
    <div class="modal exmodal">
      <div class="modal__sheet exmodal__sheet">
        <button class="iconbtn exmodal__close" aria-label="Fermer">✕</button>
        <img class="exmodal__img" src="${media.file}" alt="${esc(media.name)}"/>
        <div class="exmodal__name">${esc(media.name)}</div>
        <div class="exmodal__muscle">🎯 ${esc(media.muscle)}</div>
      </div>
    </div>`);
  document.body.appendChild(overlay);
  overlay.querySelector('.exmodal__close').onclick = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function getInst(id) { return (getState().myPrograms || []).find((p) => p.id === id) || { done: {} }; }
// Coche/décoche un exercice d'un jour.
function toggleExercise(id, day, idx, total) {
  setState((s) => {
    const inst = s.myPrograms.find((p) => p.id === id);
    if (!inst) return;
    inst.done = inst.done || {};
    const arr = (inst.done[day] || []).slice();
    while (arr.length < total) arr.push(false);
    arr[idx] = !arr[idx];
    inst.done[day] = arr;
  });
}
// Coche (ou décoche) tous les exercices d'un jour.
function setDayChecks(id, day, total, value) {
  setState((s) => {
    const inst = s.myPrograms.find((p) => p.id === id);
    if (!inst) return;
    inst.done = inst.done || {};
    inst.done[day] = Array.from({ length: total }, () => value);
  });
}

// ============================================================================
// PROGRÈS — streak, complétion, poids
// ============================================================================

function renderProgress() {
  const state = getState();
  const streak = computeStreak(state);
  const done = completedCount(state);
  const dp = programDayFor(state, todayISO());
  const pct = dp ? Math.round((dp.day / 30) * 100) : 0;
  const startW = state.profile.weightKg;
  const targetW = state.profile.targetWeightKg;
  const lastW = latestWeight(state) ?? startW;

  appEl.innerHTML = '';
  const screen = h(`<div class="screen"></div>`);
  screen.appendChild(h(`
    <div class="screen__head"><h1>📈 Progrès</h1></div>
    <div class="stat-grid">
      <div class="stat"><div class="stat__num">${streak}🔥</div><div class="stat__lbl">Streak (jours)</div></div>
      <div class="stat"><div class="stat__num">${done}</div><div class="stat__lbl">Séances faites</div></div>
      <div class="stat"><div class="stat__num">${dp ? dp.cycle : 1}</div><div class="stat__lbl">Cycle actuel</div></div>
    </div>
    <div class="card">
      <div class="card__title">Progression du cycle</div>
      <div class="progressbar"><div class="progressbar__fill" style="width:${pct}%"></div></div>
      <p class="muted">Jour ${dp ? dp.day : 1} / 30 · ${pct}%</p>
    </div>`));

  // Poids du jour
  const weightCard = h(`
    <div class="card">
      <div class="card__title">⚖️ Poids</div>
      <div class="weightline">
        <div><span class="muted">Départ</span><br><b>${startW ?? '—'} kg</b></div>
        <div><span class="muted">Actuel</span><br><b>${lastW ?? '—'} kg</b></div>
        <div><span class="muted">Objectif</span><br><b>${targetW ?? '—'} kg</b></div>
      </div>
      <label class="weight-input">Enregistrer mon poids du jour (kg)
        <div class="row">
          <input type="number" id="weightField" step="0.1" min="35" max="250" placeholder="${lastW ?? ''}" />
          <button class="btn" id="weightSave">Enregistrer</button>
        </div>
      </label>
    </div>`);
  weightCard.querySelector('#weightSave').onclick = () => {
    const v = num(weightCard.querySelector('#weightField').value);
    if (v) { setLog(todayISO(), { weightKg: v }); render(); }
  };
  screen.appendChild(weightCard);

  // Mesures corporelles (inspiré du T25 Fitness Journal)
  const MEAS = [['chest', 'Poitrine'], ['waist', 'Taille'], ['arm', 'Bras'], ['thigh', 'Cuisse']];
  const last = latestMeasures(state);
  const measCard = h(`
    <div class="card">
      <div class="card__title">📏 Mesures (cm)</div>
      <p class="muted">Photo « avant » + tour de taille = les meilleurs indicateurs, mieux que la balance seule.</p>
      <div class="meas-grid">
        ${MEAS.map(([k, lbl]) => `
          <label class="meas">${lbl}
            <input type="number" data-meas="${k}" step="0.5" min="10" max="200"
              placeholder="${last[k] ?? '—'}" value="" />
          </label>`).join('')}
      </div>
      <button class="btn" id="measSave">Enregistrer mes mesures du jour</button>
    </div>`);
  measCard.querySelector('#measSave').onclick = () => {
    const cur = { ...(getLog(todayISO()).measures || {}) };
    measCard.querySelectorAll('[data-meas]').forEach((inp) => {
      const v = num(inp.value);
      if (v) cur[inp.dataset.meas] = v;
    });
    setLog(todayISO(), { measures: cur });
    render();
  };
  screen.appendChild(measCard);

  appEl.appendChild(screen);
}

function latestWeight(state) {
  const entries = Object.entries(state.logs)
    .filter(([, l]) => l.weightKg != null)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1));
  return entries.length ? entries[0][1].weightKg : null;
}

function latestMeasures(state) {
  const out = {};
  Object.keys(state.logs).sort().forEach((iso) => {
    const m = state.logs[iso].measures;
    if (m) Object.assign(out, m); // la plus récente écrase
  });
  return out;
}

// ============================================================================
// RÉGLAGES
// ============================================================================

function renderSettings() {
  const state = getState();
  appEl.innerHTML = '';
  const screen = h(`<div class="screen"></div>`);
  screen.appendChild(h(`
    <div class="screen__head"><h1>⚙️ Réglages</h1></div>
    <div class="card">
      <div class="card__title">Programme</div>
      <div class="program-picker" id="progPick">
        ${Object.values(PROGRAMS).map((p) => `
          <label class="program-card ${state.programId === p.id ? 'is-selected' : ''}" style="--accent:${p.color}">
            <input type="radio" name="prog" value="${p.id}" ${state.programId === p.id ? 'checked' : ''} />
            <span class="program-card__name">${p.name}</span>
            <span class="program-card__tag">${p.tagline}</span>
          </label>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card__title">🩺 Visite médicale (VM)</div>
      <p class="muted">FLOW la détecte dans ton roster, ou saisis-la ici. 1 mois avant, un programme remise en forme &amp; perte de poids s’active automatiquement.</p>
      <label class="weight-input">Date de ma prochaine VM
        <input type="date" id="vmDate" value="${state.medicalDateISO || ''}" />
      </label>
      ${state.medicalDateISO ? `<button class="btn btn--ghost" id="vmClear">Effacer la date</button>` : ''}
    </div>
    <div class="card">
      <div class="card__title">Cycle</div>
      <p class="muted">Démarré le ${state.startDateISO ? cap(fmtDateLong(state.startDateISO)) : '—'}.</p>
      <button class="btn" id="renewBtn">🔄 Renouveler un cycle de 30 jours (aujourd’hui)</button>
    </div>
    <div class="card">
      <div class="card__title">Données</div>
      <div class="row">
        <button class="btn btn--ghost" id="exportBtn">Exporter (JSON)</button>
        <button class="btn btn--ghost" id="importBtn">Importer (JSON)</button>
      </div>
      <button class="btn btn--danger" id="resetBtn">Réinitialiser l’application</button>
    </div>
    <p class="fineprint">${APP.name} — ${APP.meaning}</p>`));

  screen.querySelector('#progPick').addEventListener('change', (e) => {
    setState((s) => { s.programId = e.target.value; });
    render();
  });
  screen.querySelector('#vmDate').addEventListener('change', (e) => {
    setState({ medicalDateISO: e.target.value || null });
    render();
  });
  const vmClear = screen.querySelector('#vmClear');
  if (vmClear) vmClear.onclick = () => { setState({ medicalDateISO: null }); render(); };
  screen.querySelector('#renewBtn').onclick = () => {
    setState((s) => { s.startDateISO = todayISO(); s.cycleCount = (s.cycleCount || 0) + 1; });
    currentView = 'today'; selectedDate = todayISO(); render();
  };
  screen.querySelector('#exportBtn').onclick = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'flow-backup.json';
    a.click();
  };
  screen.querySelector('#importBtn').onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json';
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { try { importJSON(r.result); render(); } catch (e) { alert('Fichier invalide'); } };
      r.readAsText(f);
    };
    inp.click();
  };
  screen.querySelector('#resetBtn').onclick = () => {
    if (confirm('Tout effacer et recommencer ?')) { resetState(); currentView = 'today'; render(); }
  };
  appEl.appendChild(screen);
}

// --- Helpers ----------------------------------------------------------------

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// --- Service worker (offline / PWA) -----------------------------------------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// --- Boot -------------------------------------------------------------------
render();
