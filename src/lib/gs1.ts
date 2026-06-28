// GS1 DataMatrix / GS1-128 parser for medicine packaging.
//
// Handles BOTH common input formats produced by handheld and phone scanners:
//
//   1) Human-readable with explicit AIs in parentheses, e.g.
//        "(01)08901117001234(17)281231(10)BCH9876(21)SN123"
//
//   2) Raw scanner output using FNC1 / Group-Separator (ASCII 0x1D, "\u001d")
//      to terminate variable-length fields, e.g.
//        "0108901117001234" + "17" + "281231" + "10" + "BCH9876" + "\u001d" + "21" + "SN123"
//
// Supported Application Identifiers in this build:
//   (01) GTIN          — exactly 14 digits  (fixed length)
//   (17) Expiry date   — 6 digits YYMMDD    (fixed length; DD==00 → last day of month)
//   (10) Batch / Lot   — alphanumeric, up to 20 chars, variable (GS-terminated)
//   (21) Serial number — alphanumeric, up to 20 chars, variable (GS-terminated)
//
// Returns a structured result. On invalid input, `ok: false` with a list of
// human-readable errors — callers should never blindly trust a parsed object
// without checking `ok`.

export type Gs1Parsed = {
  ok: boolean;
  errors: string[];
  gtin?: string;            // 14-digit string
  expiry?: string;          // ISO "YYYY-MM-DD"
  expiryDate?: Date;
  batch?: string;
  serial?: string;
  raw: Record<string, string>; // every AI we saw, keyed by AI ("01","17",...)
};

const GS = "\u001d"; // ASCII 29, FNC1 separator
// Some scanners emit the symbology identifier "]d2" / "]C1" prefix — strip it.
const SYMBOLOGY_PREFIX = /^\][A-Za-z]\d/;

// AIs with FIXED length (no GS terminator needed after them).
const FIXED_LEN: Record<string, number> = {
  "01": 14,
  "17": 6,
  "11": 6, // production date (bonus — parsed if present)
  "15": 6, // best-before
};

const VAR_AIS = new Set(["10", "21"]);
const MAX_VAR_LEN = 20;

function gtinChecksumValid(gtin: string): boolean {
  if (!/^\d{14}$/.test(gtin)) return false;
  const d = gtin.split("").map(Number);
  const check = d.pop()!;
  let sum = 0;
  for (let i = d.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += d[i] * w;
  return (10 - (sum % 10)) % 10 === check;
}

function yymmddToIso(s: string): { iso?: string; date?: Date; err?: string } {
  if (!/^\d{6}$/.test(s)) return { err: `expiry "${s}" is not 6 digits` };
  const yy = Number(s.slice(0, 2));
  const mm = Number(s.slice(2, 4));
  let dd = Number(s.slice(4, 6));
  // GS1 century rule: 00–49 → 2000s, 50–99 → 1900s/2000s pivot.
  const year = 2000 + yy; // medicine expiries are always future-leaning
  if (mm < 1 || mm > 12) return { err: `expiry month ${mm} invalid` };
  // GS1 convention: DD == 00 means "last day of the month".
  if (dd === 0) dd = new Date(year, mm, 0).getDate();
  if (dd < 1 || dd > 31) return { err: `expiry day ${dd} invalid` };
  const date = new Date(Date.UTC(year, mm - 1, dd));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== mm - 1 ||
    date.getUTCDate() !== dd
  ) {
    return { err: `expiry ${s} is not a real calendar date` };
  }
  const iso = `${year.toString().padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  return { iso, date };
}

/** Parse a GS1 string with explicit "(AI)" parenthesis notation. */
function parseParenForm(input: string): Record<string, string> {
  const out: Record<string, string> = {};
  // Match "(NN)" or "(NNN)" followed by everything up to the next "(" or end.
  const re = /\((\d{2,4})\)([^(]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

/** Parse a raw scanner stream (no parens; FIXED-AI lengths + GS terminator). */
function parseRawForm(input: string): { fields: Record<string, string>; errors: string[] } {
  const fields: Record<string, string> = {};
  const errors: string[] = [];
  let i = 0;
  while (i < input.length) {
    if (input[i] === GS) { i++; continue; }
    if (i + 2 > input.length) { errors.push(`stray characters at position ${i}`); break; }
    const ai = input.slice(i, i + 2);
    i += 2;
    if (FIXED_LEN[ai]) {
      const len = FIXED_LEN[ai];
      if (i + len > input.length) { errors.push(`AI (${ai}) needs ${len} chars, got ${input.length - i}`); break; }
      fields[ai] = input.slice(i, i + len);
      i += len;
    } else if (VAR_AIS.has(ai)) {
      const gsAt = input.indexOf(GS, i);
      const end = gsAt === -1 ? Math.min(i + MAX_VAR_LEN, input.length) : gsAt;
      fields[ai] = input.slice(i, end);
      i = end;
    } else {
      // Unknown AI — best-effort: read up to GS or end so we don't deadlock.
      const gsAt = input.indexOf(GS, i);
      const end = gsAt === -1 ? input.length : gsAt;
      fields[ai] = input.slice(i, end);
      errors.push(`unknown AI (${ai}) — captured as best-effort`);
      i = end;
    }
  }
  return { fields, errors };
}

export function parseGs1(input: string): Gs1Parsed {
  const errors: string[] = [];
  if (typeof input !== "string" || !input.trim()) {
    return { ok: false, errors: ["empty input"], raw: {} };
  }
  let s = input.trim().replace(SYMBOLOGY_PREFIX, "");

  // Some scanners send "{GS}" or "<GS>" or "\\u001d" instead of the raw byte —
  // normalise them all to the real ASCII 29 character before parsing.
  s = s
    .replace(/\\u001d/gi, GS)
    .replace(/<GS>/gi, GS)
    .replace(/\{GS\}/gi, GS)
    .replace(/\x1d/g, GS);

  const hasParens = /\(\d{2,4}\)/.test(s);
  const raw = hasParens ? parseParenForm(s) : (() => {
    const r = parseRawForm(s); errors.push(...r.errors); return r.fields;
  })();

  const out: Gs1Parsed = { ok: true, errors, raw };

  if (raw["01"]) {
    const gtin = raw["01"].padStart(14, "0");
    if (!gtinChecksumValid(gtin)) errors.push(`GTIN ${gtin} has invalid GS1 check digit`);
    out.gtin = gtin;
  } else {
    errors.push("missing AI (01) GTIN");
  }

  if (raw["17"]) {
    const { iso, date, err } = yymmddToIso(raw["17"]);
    if (err) errors.push(err);
    else { out.expiry = iso; out.expiryDate = date; }
  }

  if (raw["10"]) {
    const b = raw["10"];
    if (b.length > MAX_VAR_LEN) errors.push(`batch (10) longer than 20 chars`);
    out.batch = b;
  }
  if (raw["21"]) {
    const sn = raw["21"];
    if (sn.length > MAX_VAR_LEN) errors.push(`serial (21) longer than 20 chars`);
    out.serial = sn;
  }

  out.ok = !!out.gtin && errors.filter(e => !e.startsWith("unknown AI")).length === 0;
  return out;
}

/** Quick test that a string looks like a GS1 payload (not a plain barcode). */
export function looksLikeGs1(input: string): boolean {
  if (!input) return false;
  if (/\(\d{2,4}\)/.test(input)) return true;
  if (input.includes(GS) || input.includes("\\u001d") || /<GS>|\{GS\}/i.test(input)) return true;
  // Raw GS1 streams that start "01" + 14 digits + another AI tag are also GS1.
  if (/^01\d{14}(?:1[0157]|21)/.test(input)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Test cases (run with: `bunx tsx src/lib/gs1.ts`)
// ---------------------------------------------------------------------------
// Bracketed form:
//   parseGs1("(01)08901117001234(17)281231(10)BCH9876(21)SN123")
//   → { ok:true, gtin:"08901117001234", expiry:"2028-12-31",
//       batch:"BCH9876", serial:"SN123", ... }
//
// Raw FNC1 form (note the \u001d after the variable-length batch):
//   parseGs1("010890111700123417281231" + "10BCH9876\u001d" + "21SN123")
//   → same as above.
//
// Invalid GTIN check digit:
//   parseGs1("(01)08901117001239(17)281231")
//   → { ok:false, errors:["GTIN 08901117001239 has invalid GS1 check digit"] }

if (typeof process !== "undefined" && process.argv?.[1]?.endsWith("gs1.ts")) {
  const cases = [
    "(01)08901117001234(17)281231(10)BCH9876(21)SN123",
    "010890111700123417281231" + "10BCH9876" + GS + "21SN123",
    "(01)08901117001239(17)281231",
    "]d201089011170012341728123110BCH9876" + GS + "21SN123",
  ];
  for (const c of cases) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ input: c, ...parseGs1(c) }, null, 2));
  }
}
