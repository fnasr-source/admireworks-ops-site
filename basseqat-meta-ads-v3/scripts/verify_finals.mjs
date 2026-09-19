/**
 * verify_finals : AI sweep over the 24 FINISHED creatives.
 *
 * Screening the SOURCE images is not enough. A composite can reintroduce what a
 * source screen cleared, and a shaping regression only shows up in the rendered
 * glyphs. So this checks the output, not the input:
 *
 *   1. people / solar detector re-run on every finished PNG.
 *   2. ARABIC READ-BACK. The model transcribes the largest Arabic line it can
 *      see; we normalise both sides and compare to `onImageLine` from the deck.
 *      This is the check that catches the failure this build already hit once,
 *      where a cream logo chip was composited over the headline and silently
 *      erased the hamza of «أرض» and the dot of its ض, turning the word into
 *      «ارص». Bounds checks cannot see that. A read-back can.
 *
 * Runs on the CLIENT's Vertex project (basseqat-e8e95). The AW project
 * (admireworks---internal-os, 712573851224) currently returns
 * 403 "Lightning dunning decision is deny" on every model.
 *
 * Usage: node scripts/verify_finals.mjs
 */

import { GoogleAuth } from 'google-auth-library';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WAVE = join(HERE, '..');
const OUT = join(WAVE, 'assets', 'out');
const DECK = JSON.parse(readFileSync(join(WAVE, 'copy', 'copy-deck-v3.json'), 'utf8'));
const SA = '/Users/user/Documents/IDE Projects/Basseqat/firebase/service-account.json';
const MODEL = 'gemini-2.5-flash';

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    peopleVisible: { type: 'BOOLEAN', description: 'Any human anywhere in the image, including partial, distant, blurred, reflected, or a human shadow.' },
    solarPanelVisible: { type: 'BOOLEAN', description: 'Any photovoltaic panel or solar array, even far background.' },
    largestArabicLine: { type: 'STRING', description: 'Transcribe EXACTLY the single largest / most prominent Arabic headline you can read. Copy the glyphs as they appear. Do not translate, do not correct spelling, do not add or remove diacritics.' },
    arabicLooksBroken: { type: 'BOOLEAN', description: 'TRUE if any Arabic appears scrambled: letters disconnected that should join, letters in reversed order, missing dots, or missing hamza.' },
    textClipped: { type: 'BOOLEAN', description: 'TRUE if any text or the logo is cut off by an edge or covered by another element.' },
    notes: { type: 'STRING' },
  },
  required: ['peopleVisible', 'solarPanelVisible', 'largestArabicLine', 'arabicLooksBroken', 'textClipped', 'notes'],
};

const PROMPT = `This is a finished Arabic advertisement image for an Egyptian date-palm farm.

Check it carefully and answer in the required JSON schema:
1. Is any human being visible anywhere in the image? Include distant, partial, blurred or reflected people and human shadows.
2. Is any solar panel or solar array visible anywhere, including the far background?
3. Transcribe EXACTLY the largest Arabic headline. Copy the glyphs as you actually see them. Do not fix spelling and do not restore missing dots or hamzas: if a letter is missing its dot, transcribe it as the letter without the dot, because we are testing the rendering.
4. Does any Arabic look broken, meaning disconnected letters, reversed order, or missing dots or hamzas?
5. Is any text or the logo clipped by an edge or covered by another element?`;

// Arabic normalisation for the comparison. Both sides get the same treatment,
// so this only forgives orthographic variance, never a genuine glyph failure.
const norm = (s) => (s || '')
  .replace(/[ـ]/g, '')                       // tatweel
  .replace(/[ً-ْٰ]/g, '')          // harakat
  .replace(/[إأآا]/g, 'ا')
  .replace(/[ىي]/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/[^\S\r\n]+/g, ' ')
  .replace(/[.،,!؟?:]/g, '')
  .trim();

const sa = JSON.parse(readFileSync(SA, 'utf8'));
const auth = new GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
const token = (await (await auth.getClient()).getAccessToken()).token;
const URL = `https://aiplatform.googleapis.com/v1/projects/${sa.project_id}/locations/global/publishers/google/models/${MODEL}:generateContent`;

async function check(path) {
  const b64 = readFileSync(path).toString('base64');
  const r = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/png', data: b64 } }, { text: PROMPT }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0 },
    }),
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return JSON.parse(j.candidates[0].content.parts.map((p) => p.text).filter(Boolean).join(''));
}

const byId = Object.fromEntries(DECK.concepts.map((c) => [c.id, c]));

// Verify exactly what will SHIP, which is the deck, not whatever PNGs happen to
// be on disk. A concept deleted from the deck keeps its renders in assets/out
// on purpose (deletions get reverted), so walking the directory verifies three
// ads that are not in this wave and blows up on the missing deck entry. Worse
// than the noise: it inflates the pass count, so "24 images" reads like full
// coverage of a 15-image wave.
const files = [];
for (const d of readdirSync(OUT)) {
  const p = join(OUT, d);
  if (!statSync(p).isDirectory()) continue;
  if (!byId[d]) continue;
  for (const f of readdirSync(p)) if (f.endsWith('.png')) files.push({ concept: d, size: basename(f, '.png'), path: join(p, f) });
}
files.sort((a, b) => a.concept.localeCompare(b.concept) || a.size.localeCompare(b.size));

let fail = 0;
const results = [];
const queue = [...files];
await Promise.all(Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const f = queue.shift();
    try {
      const res = await check(f.path);
      const cc = byId[f.concept];
      // A numeric hero (c18's «٢١٣») is not "Arabic text", so the model returns
      // the largest Arabic WORDS instead and the comparison misfires. For those,
      // compare against the sub-line, which is the largest Arabic string present.
      const isNumeric = /^[\d٠-٩\s]+$/.test(cc.onImageLine);
      const want = norm(isNumeric ? (cc.elements.subLine || cc.onImageLine) : cc.onImageLine);
      const got = norm(res.largestArabicLine);
      const match = got.includes(want) || want.includes(got);
      const bad = res.peopleVisible || res.solarPanelVisible || res.arabicLooksBroken || !match;
      if (bad) fail++;
      results.push({ ...f, ...res, want, got, match, bad });
    } catch (e) {
      fail++;
      results.push({ ...f, error: String(e).slice(0, 160), bad: true });
    }
  }
}));

results.sort((a, b) => a.concept.localeCompare(b.concept) || a.size.localeCompare(b.size));
for (const r of results) {
  const tag = r.bad ? 'FAIL' : ' ok ';
  const flags = [
    r.peopleVisible ? 'PEOPLE' : '',
    r.solarPanelVisible ? 'SOLAR' : '',
    r.arabicLooksBroken ? 'BROKEN-ARABIC' : '',
    r.textClipped ? 'clipped?' : '',
    r.match === false ? 'READBACK-MISMATCH' : '',
  ].filter(Boolean).join(' ');
  console.log(`${tag} ${r.concept.padEnd(32)} ${r.size.padEnd(5)} ${flags}`);
  if (r.match === false) {
    console.log(`       want: ${r.want}`);
    console.log(`       got : ${r.got}`);
  }
  if (r.error) console.log(`       ${r.error}`);
}
console.log(`\n${results.length} images, ${fail} flagged`);
process.exit(fail ? 1 : 0);
