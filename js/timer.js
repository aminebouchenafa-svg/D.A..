// ============================================================================
// timer.js — Minuteur HIIT plein écran (intervalles type Tabata).
// Basé sur la théorie interval training fournie : alternance effort intense /
// récupération. Par défaut 20 s d'effort / 10 s de repos.
// ============================================================================

let audioCtx = null;
function beep(freq = 880, dur = 0.15) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.frequency.value = freq;
    o.type = 'sine';
    g.gain.setValueAtTime(0.001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (e) { /* audio non dispo : on continue en silence */ }
}

// Construit la liste des phases à partir des exercices du circuit.
function buildPhases(exercises, { work, rest, prepare }) {
  const phases = [{ type: 'prepare', sec: prepare, name: 'Préparez-vous' }];
  exercises.forEach((e, i) => {
    const w = e.work && e.work.sec ? Math.min(e.work.sec, 60) : work;
    phases.push({ type: 'work', sec: w, name: e.name, cue: e.cue });
    if (i < exercises.length - 1) phases.push({ type: 'rest', sec: rest, name: 'Repos', next: exercises[i + 1].name });
  });
  phases.push({ type: 'done', sec: 0, name: 'Terminé 💪' });
  return phases;
}

// Ouvre le minuteur. `exercises` = tableau d'exercices (du circuit principal).
export function openHiitTimer(exercises, opts = {}) {
  const cfg = { work: 20, rest: 10, prepare: 5, ...opts };
  const phases = buildPhases(exercises, cfg);

  const overlay = document.createElement('div');
  overlay.className = 'hiit';
  overlay.innerHTML = `
    <div class="hiit__inner">
      <div class="hiit__phase"></div>
      <div class="hiit__count"></div>
      <div class="hiit__name"></div>
      <div class="hiit__next"></div>
      <div class="hiit__progress"><div class="hiit__bar"></div></div>
      <div class="hiit__controls">
        <button class="btn" data-act="pause">⏸ Pause</button>
        <button class="btn btn--ghost" data-act="skip">⏭ Passer</button>
        <button class="btn btn--danger" data-act="quit">✕ Quitter</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  let idx = 0, remaining = phases[0].sec, paused = false, raf = null, last = performance.now();

  const els = {
    phase: overlay.querySelector('.hiit__phase'),
    count: overlay.querySelector('.hiit__count'),
    name: overlay.querySelector('.hiit__name'),
    next: overlay.querySelector('.hiit__next'),
    bar: overlay.querySelector('.hiit__bar'),
  };

  function paint() {
    const p = phases[idx];
    overlay.dataset.type = p.type;
    els.phase.textContent = ({ prepare: 'PRÊT', work: 'EFFORT', rest: 'REPOS', done: '' })[p.type] || '';
    els.count.textContent = p.type === 'done' ? '✓' : Math.ceil(remaining);
    els.name.textContent = p.name;
    els.next.textContent = p.next ? `Ensuite : ${p.next}` : (p.cue || '');
    const pct = p.sec ? (1 - remaining / p.sec) * 100 : 100;
    els.bar.style.width = pct + '%';
  }

  function nextPhase() {
    idx++;
    if (idx >= phases.length) { close(); return; }
    const p = phases[idx];
    remaining = p.sec;
    if (p.type === 'work') beep(990, 0.18);
    else if (p.type === 'rest') beep(440, 0.18);
    else if (p.type === 'done') { beep(1320, 0.4); paint(); setTimeout(close, 1500); return; }
    paint();
  }

  function tick(now) {
    const dt = (now - last) / 1000; last = now;
    if (!paused) {
      remaining -= dt;
      // bips du compte à rebours final
      if (remaining <= 3 && Math.ceil(remaining) !== Math.ceil(remaining + dt)) beep(660, 0.08);
      if (remaining <= 0) { nextPhase(); }
      else paint();
    }
    raf = requestAnimationFrame(tick);
  }

  function close() {
    cancelAnimationFrame(raf);
    overlay.remove();
  }

  overlay.querySelector('[data-act="pause"]').onclick = (e) => {
    paused = !paused;
    e.target.textContent = paused ? '▶ Reprendre' : '⏸ Pause';
  };
  overlay.querySelector('[data-act="skip"]').onclick = () => { remaining = 0; };
  overlay.querySelector('[data-act="quit"]').onclick = close;

  beep(880, 0.2);
  paint();
  raf = requestAnimationFrame(tick);
}
