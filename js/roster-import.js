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

// --- Dictionnaire des types de service (FR + EN + codes) --------------------
// Ordre = priorité de détection (du plus spécifique au plus générique).
const DUTY_RULES = [
  { duty: 'vacation',  res: [/\bcong[ée]s?\b/i, /\bvacances?\b/i, /\bvac\b/i, /\bleave\b/i, /\bholiday\b/i, /\bcp\b/i, /\bannual\b/i] },
  { duty: 'nightstop', res: [/\bnight\s?stop\b/i, /\bnightstop\b/i, /\bd[ée]couch/i, /\bescale\b/i, /\blayover\b/i, /\bhotel\b/i, /\bhtl\b/i, /\bn\/?s\b/i] },
  { duty: 'standby',   res: [/\bstand\s?by\b/i, /\bst?by\b/i, /\br[ée]serve\b/i, /\bréserve\b/i, /\bresa?\b/i, /\bsb\b/i, /\bhot\s?standby\b/i] },
  { duty: 'flight',    res: [/\bvols?\b/i, /\bflights?\b/i, /\bflt\b/i, /\bfly\b/i, /\bduty\b/i, /\b[A-Z]{2}\d{2,4}\b/, /\b[A-Z]{3}\s*[-→/]\s*[A-Z]{3}\b/] },
  { duty: 'off',       res: [/\brepos\b/i, /\boff\b/i, /\brest\b/i, /\bjdr\b/i, /\brp\b/i, /\bday\s?off\b/i, /\bx\b/i] },
];

export function detectDuty(line) {
  for (const rule of DUTY_RULES) {
    if (rule.res.some((re) => re.test(line))) {
      return { duty: rule.duty, confident: true };
    }
  }
  return { duty: 'off', confident: false }; // défaut prudent, à confirmer
}

// --- Détection des dates ----------------------------------------------------
const MONTHS = {
  jan: 1, janv: 1, january: 1, janvier: 1, feb: 2, fev: 2, févr: 2, fevr: 2, february: 2, février: 2,
  mar: 3, mars: 3, march: 3, apr: 4, avr: 4, april: 4, avril: 4, may: 5, mai: 5,
  jun: 6, juin: 6, june: 6, jul: 7, juil: 7, july: 7, juillet: 7, aug: 8, aout: 8, août: 8, august: 8,
  sep: 9, sept: 9, september: 9, septembre: 9, oct: 10, october: 10, octobre: 10,
  nov: 11, november: 11, novembre: 11, dec: 12, déc: 12, december: 12, décembre: 12,
};
function monthIdx(token) {
  const t = token.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const k in MONTHS) {
    const kk = k.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (t.startsWith(kk)) return MONTHS[k];
  }
  return null;
}
function pad(n) { return String(n).padStart(2, '0'); }
function mkISO(y, m, d) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}
function normYear(y) { return y < 100 ? 2000 + y : y; }

// Analyse le texte → tableau { iso, duty, confident, raw }.
export function parseRoster(text, opts = {}) {
  const fallbackYear = opts.year || new Date().getFullYear();
  const out = [];
  const seen = new Set();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    let iso = null;

    // jj/mm[/aaaa] ou jj.mm ou jj-mm
    let m = line.match(/\b(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?\b/);
    if (m) {
      iso = mkISO(m[3] ? normYear(+m[3]) : fallbackYear, +m[2], +m[1]);
    }
    // jj MoisTexte (01 Jun / 3 mars / 12 décembre)
    if (!iso) {
      m = line.match(/\b(\d{1,2})\s*([A-Za-zéûàôîÉ]{3,9})\.?\b/);
      if (m) { const mi = monthIdx(m[2]); if (mi) iso = mkISO(fallbackYear, mi, +m[1]); }
    }
    if (!iso || seen.has(iso)) continue;
    seen.add(iso);
    const d = detectDuty(line);
    out.push({ iso, duty: d.duty, confident: d.confident, raw: line.slice(0, 80) });
  }
  out.sort((a, b) => (a.iso < b.iso ? -1 : 1));
  return out;
}
