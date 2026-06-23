// ============================================================================
// roster-import.js — Import du roster compagnie depuis un PDF.
// pdf.js (chargé à la demande) → extraction des fragments AVEC POSITION (x,y),
// puis reconstruction par COLONNES (un jour = une colonne) car les rapports
// type "Personal Crew Schedule Report" disposent les jours côte à côte.
// Détection des types de service (FR/EN/codes) + temps de service via horaires.
// L'utilisateur relit/corrige toujours avant d'appliquer.
// ============================================================================

const PDFJS_VERSION = '3.11.174';
const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

let _pdfjs = null;
function loadPdfJs() {
  if (_pdfjs) return Promise.resolve(_pdfjs);
  if (window.pdfjsLib) { _pdfjs = window.pdfjsLib; return Promise.resolve(_pdfjs); }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PDFJS_URL;
    s.onload = () => {
      _pdfjs = window.pdfjsLib;
      if (!_pdfjs) return reject(new Error('pdf.js indisponible'));
      _pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(_pdfjs);
    };
    s.onerror = () => reject(new Error('Impossible de charger pdf.js (connexion ?)'));
    document.head.appendChild(s);
  });
}

// Extrait les fragments de texte avec position, page par page.
async function extractItems(file) {
  const pdfjs = await loadPdfJs();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const tc = await (await pdf.getPage(p)).getTextContent();
    pages.push(tc.items
      .filter((i) => i.str && i.str.trim())
      .map((i) => ({ x: Math.round(i.transform[4]), y: Math.round(i.transform[5]), s: i.str.trim() })));
  }
  return pages;
}

// Texte "à plat" (regroupement par ligne) — utilisé pour le repli générique.
function itemsToText(pages) {
  const out = [];
  for (const items of pages) {
    const rows = {};
    for (const it of items) (rows[it.y] = rows[it.y] || []).push(it);
    Object.keys(rows).sort((a, b) => b - a).forEach((y) => {
      out.push(rows[y].sort((a, b) => a.x - b.x).map((o) => o.s).join(' ').replace(/\s+/g, ' ').trim());
    });
  }
  return out.join('\n');
}

// Conservé pour compatibilité / repli : texte à plat depuis un PDF.
export async function extractTextFromPDF(file) {
  return itemsToText(await extractItems(file));
}

// --- Helpers ----------------------------------------------------------------
function pad(n) { return String(n).padStart(2, '0'); }
function mkISO(y, m, d) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}
function inferYearFromText(text) {
  const m = text.match(/\b\d{1,2}\/\d{1,2}\/(\d{4})\b/);
  return m ? +m[1] : null;
}
function loadFromTimes(seg) {
  const times = [...seg.matchAll(/\b(\d{1,2}):(\d{2})\b/g)]
    .map((t) => (+t[1]) * 60 + (+t[2]))
    .filter((v) => v >= 0 && v < 1440);
  if (times.length < 2) return undefined;
  let span = Math.max(...times) - Math.min(...times);
  if (span <= 0) span += 1440;             // service qui passe minuit
  const h = span / 60;
  return h < 6 ? 'short' : h < 9 ? 'medium' : h < 12 ? 'long' : 'xlong';
}

// --- Classification d'une journée (texte d'une colonne ou d'une ligne) ------
const WEEKDAYS = /\b(MON|TUE|WED|THU|FRI|SAT|SUN|LUN|MAR|MER|JEU|VEN|SAM|DIM)\b/g;
function classifySegment(seg) {
  const cleaned = seg.replace(/[←-⇿]/g, ' ').replace(/\s+/g, ' ').trim();
  const up = cleaned.toUpperCase();
  const dutyLoad = loadFromTimes(cleaned);

  // Visite médicale (VM) — jour non volant, mémorisé pour la prépa 1 mois avant
  if (/\b(VM|VME|VMC|VISITE ?M[ÉE]DIC|VIS ?MED|MEDICAL ?CHECK|AERO ?MED|EXPERTISE)\b/.test(up))
    return { duty: 'off', confident: true, medical: true };
  // Formation / simulateur / stages réglementaires
  if (/\b(ESIM|ING\d*|SIM|STAGE|FORMATION|RECURRENT|DGR|CRM|SMS|EXPAS)\b/.test(up))
    return { duty: 'training', confident: true, dutyLoad };
  // Standby / réserve (HS = Home Standby)
  if (/\b(HS|SBY|STBY|STAND ?BY|R[ÉE]SERVE|RESA?)\b/.test(up))
    return { duty: 'standby', confident: true, dutyLoad };
  // Congé / absence
  if (/\b(CONG[ÉE]S?|CP|LEAVE|VAC|VACANCES|HOLID|ABS)\b/.test(up))
    return { duty: 'vacation', confident: true };
  // Repos : il ne reste que des "/", "//", "RH", flèches, jours de semaine
  const residue = up.replace(WEEKDAYS, '').replace(/\bRH\b/g, '').replace(/[\/\s*.\-]/g, '');
  if (residue === '') return { duty: 'off', confident: true };
  // Night stop / découcher / escale
  if (/\b(N\/?S|NIGHTSTOP|NIGHT STOP|D[ÉE]COUCH|ESCALE|LAYOVER|HOTEL|HTL)\b/.test(up))
    return { duty: 'nightstop', confident: true, dutyLoad };
  // Déplacement (positionnement / mise en place) → assimilé vol (sédentaire)
  if (/\bDEPL\b/.test(up)) return { duty: 'flight', confident: true, dutyLoad };
  // Vol : numéro de vol (3-4 chiffres) ou au moins une heure de prise de service
  if (/\b\d{3,4}\b/.test(cleaned) || /\b\d{1,2}:\d{2}\b/.test(cleaned))
    return { duty: 'flight', confident: /\b\d{3,4}\b/.test(cleaned), dutyLoad };
  return { duty: 'off', confident: false };
}

// --- Reconstruction par colonnes (un jour = une colonne) --------------------
function parseColumns(items, year) {
  const dateItems = items.filter((i) => /^\d{1,2}\/\d{1,2}$/.test(i.s));
  if (dateItems.length < 5) return [];          // pas une grille de planning
  // Ligne des dates = ordonnée (y) la plus fréquente parmi les dates.
  const yCount = {};
  dateItems.forEach((d) => { yCount[d.y] = (yCount[d.y] || 0) + 1; });
  const dateRowY = +Object.keys(yCount).sort((a, b) => yCount[b] - yCount[a])[0];
  const anchors = dateItems.filter((d) => Math.abs(d.y - dateRowY) <= 2).sort((a, b) => a.x - b.x);
  if (anchors.length < 5) return [];
  const spacing = (anchors[anchors.length - 1].x - anchors[0].x) / (anchors.length - 1) || 26;
  // Borne basse : sous les lignes de récap (F/D/I), au-dessus des statistiques.
  const labelYs = items.filter((i) => ['F', 'D', 'I'].includes(i.s)).map((i) => i.y);
  const totalItem = items.find((i) => /Total Hours and Statistics/i.test(i.s));
  const lowerBound = (labelYs.length ? Math.max(...labelYs) : (totalItem ? totalItem.y : 0)) + 3;

  const cols = anchors.map((a) => ({ a, parts: [] }));
  for (const it of items) {
    if (it.y >= dateRowY - 2 || it.y <= lowerBound) continue;
    let best = -1, bd = Infinity;
    anchors.forEach((a, idx) => { const d = Math.abs(it.x - a.x); if (d < bd) { bd = d; best = idx; } });
    if (best >= 0 && bd < spacing * 0.7) cols[best].parts.push(it);
  }

  const out = [];
  const seen = new Set();
  for (const c of cols) {
    const [d, mo] = c.a.s.split('/').map(Number);
    const iso = mkISO(year, mo, d);
    if (!iso || seen.has(iso)) continue;
    seen.add(iso);
    const text = c.parts.sort((p, q) => q.y - p.y).map((p) => p.s).join(' ');
    const cl = classifySegment(text);
    out.push({ iso, duty: cl.duty, confident: cl.confident, dutyLoad: cl.dutyLoad, medical: !!cl.medical, raw: text.replace(/\s+/g, ' ').trim().slice(0, 60) });
  }
  return out;
}

// --- Repli générique (autres mises en page) : une date par ligne ------------
const GENERIC_RULES = [
  { duty: 'vacation',  re: /\bcong[ée]|leave|vac|holiday|\bcp\b/i },
  { duty: 'nightstop', re: /night ?stop|d[ée]couch|escale|layover|hotel|\bn\/?s\b/i },
  { duty: 'standby',   re: /stand ?by|\bst?by\b|r[ée]serve|\bhs\b/i },
  { duty: 'training',  re: /\b(sim|esim|ing\d*|formation|stage|training)\b/i },
  { duty: 'flight',    re: /\bvols?\b|\bflights?\b|\bflt\b|\b[A-Z]{2}\d{2,4}\b|\b\d{3,4}\b/i },
  { duty: 'off',       re: /\brepos\b|\boff\b|\brest\b|\brh\b|\/{1,2}/i },
];
const GENERIC_MEDICAL = /\b(vm|vme|vmc|visite ?m[ée]dic|vis ?med|medical ?check|aero ?med|expertise)\b/i;
function parseGenericLines(text, year) {
  const out = [];
  const seen = new Set();
  for (const line of text.split('\n')) {
    let iso = null;
    const m = line.match(/\b(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?\b/);
    if (m) iso = mkISO(m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : year, +m[2], +m[1]);
    if (!iso || seen.has(iso)) continue;
    const rest = line.replace(m[0], ' ');           // retire la date (évite que l'année compte comme n° de vol)
    const medical = GENERIC_MEDICAL.test(rest);
    const rule = medical ? { duty: 'off' } : GENERIC_RULES.find((r) => r.re.test(rest));
    if (!rule) continue;
    seen.add(iso);
    out.push({ iso, duty: rule.duty, confident: medical || rule.duty !== 'off', dutyLoad: loadFromTimes(rest), medical, raw: line.trim().slice(0, 60) });
  }
  return out;
}

// --- Point d'entrée : depuis un fichier PDF ---------------------------------
export async function importRoster(file) {
  const pages = await extractItems(file);
  const text = itemsToText(pages);
  const year = inferYearFromText(text) || new Date().getFullYear();

  // 1) Tentative par colonnes (grille de planning).
  let entries = [];
  const seen = new Set();
  for (const items of pages) {
    for (const e of parseColumns(items, year)) {
      if (!seen.has(e.iso)) { seen.add(e.iso); entries.push(e); }
    }
  }
  // 2) Repli générique si la grille n'a rien donné.
  if (entries.length < 5) entries = parseGenericLines(text, year);

  entries.sort((a, b) => (a.iso < b.iso ? -1 : 1));
  return entries;
}

// Parseur texte (repli / tests unitaires).
export function parseRoster(text, opts = {}) {
  const year = opts.year || inferYearFromText(text) || new Date().getFullYear();
  return parseGenericLines(text, year).sort((a, b) => (a.iso < b.iso ? -1 : 1));
}
