// ============================================================================
// roster-import.js — Import du roster compagnie depuis un PDF.
// Lecture du texte du PDF dans le navigateur (pdf.js, chargé à la demande),
// puis détection heuristique des dates + types de service. Format "mixte" :
// on couvre français, anglais et codes compagnie courants. L'utilisateur
// relit/corrige toujours avant d'appliquer au planning.
// ============================================================================

const PDFJS_VERSION = '3.11.174';
const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

// Charge pdf.js une seule fois (script UMD → window.pdfjsLib).
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

// Extrait le texte du PDF, reconstruit ligne par ligne (regroupement par Y).
export async function extractTextFromPDF(file) {
  const pdfjs = await loadPdfJs();
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    // Regroupe les fragments par position verticale (ligne).
    const rows = {};
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const y = Math.round(it.transform[5]);
      (rows[y] = rows[y] || []).push({ x: it.transform[4], s: it.str });
    }
    Object.keys(rows)
      .sort((a, b) => b - a) // haut → bas
      .forEach((y) => {
        const line = rows[y].sort((a, b) => a.x - b.x).map((o) => o.s).join(' ')
          .replace(/\s+/g, ' ').trim();
        if (line) lines.push(line);
      });
  }
  return lines.join('\n');
}

// ============================================================================
// PARSEUR — calibré sur les rapports type "Personal Crew Schedule Report"
// (dates en JJ/MM, code de service + horaires), avec repli générique.
// ============================================================================

// Année déduite de la période du rapport (ex. "01/06/2026 - 30/06/2026").
function inferYear(text) {
  const m = text.match(/\b\d{1,2}\/\d{1,2}\/(\d{4})\b/);
  return m ? +m[1] : null;
}

function pad(n) { return String(n).padStart(2, '0'); }
function mkISO(y, m, d) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

// Horaires HH:MM d'un segment → palier de temps de service.
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

// Classifie un segment de jour → { duty, confident, dutyLoad }.
const WEEKDAYS = /\b(MON|TUE|WED|THU|FRI|SAT|SUN|LUN|MAR|MER|JEU|VEN|SAM|DIM)\b/g;
function classifySegment(seg) {
  const cleaned = seg.replace(/[←-⇿]/g, ' ').replace(/\s+/g, ' ').trim();
  const up = cleaned.toUpperCase();
  const dutyLoad = loadFromTimes(cleaned);

  // Visite médicale (VM) — jour non volant, mais on mémorise la date (prépa 1 mois avant)
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

// Segmente par marqueurs de jour "JJ/MM" (sans année) — format crew report.
function parseByDayMarkers(body, year) {
  const re = /(\d{1,2})\/(\d{1,2})(?!\/\d)/g; // JJ/MM non suivi de "/chiffre"
  const marks = [];
  let m;
  while ((m = re.exec(body))) marks.push({ i: m.index, end: re.lastIndex, d: +m[1], mo: +m[2] });
  if (!marks.length) return [];
  const out = [];
  const seen = new Set();
  for (let k = 0; k < marks.length; k++) {
    const seg = body.slice(marks[k].end, k + 1 < marks.length ? marks[k + 1].i : body.length);
    const iso = mkISO(year, marks[k].mo, marks[k].d);
    if (!iso || seen.has(iso)) continue;
    seen.add(iso);
    const c = classifySegment(seg);
    out.push({ iso, duty: c.duty, confident: c.confident, dutyLoad: c.dutyLoad, medical: !!c.medical, raw: seg.replace(/\s+/g, ' ').trim().slice(0, 60) });
  }
  return out;
}

// Repli générique (autres compagnies) : une date par ligne, mot-clé sur la ligne.
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
    let m = line.match(/\b(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?\b/);
    if (m) iso = mkISO(m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : year, +m[2], +m[1]);
    if (!iso || seen.has(iso)) continue;
    const medical = GENERIC_MEDICAL.test(line);
    const rule = medical ? { duty: 'off' } : GENERIC_RULES.find((r) => r.re.test(line));
    if (!rule) continue;
    seen.add(iso);
    out.push({ iso, duty: rule.duty, confident: medical || rule.duty !== 'off', dutyLoad: loadFromTimes(line), medical, raw: line.trim().slice(0, 60) });
  }
  return out;
}

// Point d'entrée : renvoie [{ iso, duty, confident, dutyLoad, raw }] trié.
export function parseRoster(text, opts = {}) {
  const year = opts.year || inferYear(text) || new Date().getFullYear();
  // On ne garde que la zone planning (avant les stats / détails / expirations).
  let body = text;
  const cut = body.search(/Total Hours and Statistics|Expiry Dates|Training Details|Duty\s+Details/i);
  if (cut > 0) body = body.slice(0, cut);

  let entries = parseByDayMarkers(body, year);
  if (entries.length < 3) entries = parseGenericLines(text, year); // repli
  entries.sort((a, b) => (a.iso < b.iso ? -1 : 1));
  return entries;
}
