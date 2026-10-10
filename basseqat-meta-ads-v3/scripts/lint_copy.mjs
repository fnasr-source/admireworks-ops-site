/**
 * Compliance lint for the Basseqat August-2026 static wave.
 *
 * WHY THIS EXISTS SEPARATELY FROM check-forbidden-copy.mjs
 * --------------------------------------------------------
 * The Basseqat repo's linter is the right source of truth for the banned list,
 * and it reads it out of apps/web/src/lib/email-studio/forbidden-phrases.ts.
 * But its SCAN_GLOBS are hardcoded and repo-relative, so it cannot see a copy
 * deck that lives in Admireworks Internal OS. This lint imports the SAME
 * forbidden-phrases.ts (never a forked copy of the list) and points it at the
 * deck.
 *
 * It also closes a real gap. forbidden-phrases.ts bans SPECIFIC STRINGS for the
 * farm age: "أربع سنين", "شغالة من ٤ سنين", "عمره ٤ سنين" and a few more. A new
 * phrasing like «النخيل ليه ٤ سنين» passes it clean, while still making the
 * exact claim the client corrected in June 2026. So the wave adds a regex.
 *
 * Because build_v3.py reads every burned string from copy-deck-v3.json and from
 * nowhere else, linting that file transitively lints the pixels. That was NOT
 * true of build_v2.py, which hardcoded its Arabic inline.
 *
 * Usage: node scripts/lint_copy.mjs
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WAVE = join(HERE, '..');
const DECK = join(WAVE, 'copy', 'copy-deck-v3.json');
const PHRASES = '/Users/user/Documents/IDE Projects/Basseqat/apps/web/src/lib/email-studio/forbidden-phrases.ts';

function loadShared() {
  const src = readFileSync(PHRASES, 'utf8');
  const entries = [];
  const re = /pattern:\s*"([^"]+)"\s*,\s*reason:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) entries.push({ pattern: m[1], reason: m[2] });
  if (!entries.length) {
    console.error('FATAL: could not parse forbidden-phrases.ts. Refusing to run with an empty list.');
    process.exit(2);
  }
  const forb = src.match(/FOUNDER_TITLE_FORBIDDEN\s*=\s*"([^"]+)"/);
  return { entries, founderForbidden: forb ? forb[1] : 'مؤسس باسقات' };
}

// Age claims the shared list does not cover, because it enumerates strings.
//
// TWO DIFFERENT WRONG CLAIMS ARE BLOCKED HERE, and they point opposite ways.
//
// 1. «٤ سنين» understates the operating age (client correction, June 2026).
//
// 2. «نخيل عمره ٦ سنين» / «قايمة من ٦ سنين» OVERSTATE it, and that is the one
//    that actually shipped. The six years is agricultural operating experience
//    (Siwi palms plus medicinal and aromatic plants), NOT the age of the Medjool
//    palms in the ground. The StoryOS brief only ever said "6+ years
//    operational"; v6 of this wave inflated that into a planted-and-fruiting
//    claim on four concepts, and the client struck it out on 2026-08-13.
//
//    So «شغالة من ٦ سنين» and «خبرة ٦ سنين» are CORRECT and must keep passing.
//    Only the palm-age and farm-standing forms are blocked. The first pattern
//    requires an age word (من/عمره/بقاله) to sit AFTER the palm noun, which is
//    what separates the false «النخيل عمره ٦ سنين» from the true
//    «خبرة عمرها ٦ سنين في زراعة النخيل».
const AGE_RE = [
  /(٤|٥|4|5)\s*سن(ين|وات)/,
  /أربع\s*سن(ين|وات)/,
  /خمس\s*سن(ين|وات)/,
  /(النخل|النخيل|نخيل|نخلة)\s*(مجدول\s*)?(في الأرض\s*)?(من|عمره|عمرها|بقاله|بقالها)\s*٦\s*سن/,
  /قايمة من ٦ سنين/,
];

// Anything that would read as a promised number on an IMAGE.
const PRICE_RE = /(\d|[٠-٩])[\d٠-٩,،.]*\s*(جنيه|ج\.م|ألف|الف|مليون|EGP|SAR|%|٪)/;

const deck = JSON.parse(readFileSync(DECK, 'utf8'));
const { entries, founderForbidden } = loadShared();
const extra = deck.compliance.bannedSubstrings;

const problems = [];
const warnings = [];

function strings(obj, path = '') {
  const out = [];
  const walk = (v, p) => {
    if (typeof v === 'string') out.push([p, v]);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, p ? `${p}.${k}` : k);
  };
  walk(obj, path);
  return out;
}

// Fields that actually ship to a human. Everything else in the deck is our own
// rationale prose, which legitimately QUOTES banned phrases in order to warn
// about them (concept17's copyGuard names «ربح ثابت» on purpose).
const SHIPPING = new Set(['onImageLine', 'headline', 'linkDescription', 'primaryText', 'elements', 'unit']);

for (const c of deck.concepts) {
  const shipping = Object.fromEntries(Object.entries(c).filter(([k]) => SHIPPING.has(k)));
  for (const [path, text] of strings(shipping, c.id)) {
    for (const { pattern, reason } of entries) {
      if (text.includes(pattern)) problems.push(`${path}: banned «${pattern}» (${reason})`);
    }
    for (const pattern of extra) {
      if (text.includes(pattern)) problems.push(`${path}: banned «${pattern}» (wave list)`);
    }
    if (text.includes(founderForbidden)) problems.push(`${path}: forbidden founder title «${founderForbidden}»`);
    for (const re of AGE_RE) {
      const hit = text.match(re);
      if (hit) {
        // The two rule families fail for opposite reasons, so say which.
        const overstates = /٦/.test(hit[0]);
        problems.push(
          overstates
            ? `${path}: palm-age claim «${hit[0]}». The 6 years is OPERATING EXPERIENCE, not the age of the Medjool palms (client correction, 2026-08-13). Use «خبرة ٦ سنين» or «شغالة من ٦ سنين».`
            : `${path}: farm-age claim «${hit[0]}». Operating age is 6+ years (client correction, June 2026).`,
        );
      }
    }
  }
  // No price on any burned pixel.
  const burned = [c.onImageLine, ...strings(c.elements || {}).map(([, v]) => v)];
  for (const t of burned) {
    if (PRICE_RE.test(t)) problems.push(`${c.id}: price-like figure on a burned string: «${t}»`);
  }
  if (!/دليل باسقات/.test(c.primaryText) && c.cta !== 'WHATSAPP_MESSAGE') {
    warnings.push(`${c.id}: primaryText never names «دليل باسقات»`);
  }
}

console.log(`checked ${deck.concepts.length} concepts against ${entries.length} shared + ${extra.length} wave patterns`);
for (const w of warnings) console.log(`  WARN  ${w}`);
if (problems.length) {
  console.error(`\n${problems.length} VIOLATION(S):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('PASS: no banned phrase, no unlicensed farm-age claim, no price on any burned string.');
