#!/usr/bin/env node
/**
 * Basseqat Ads v2, social-icon + URL inpaint via Nano Banana 2.
 * Takes the original ad creative as `--reference` so the model preserves
 * every element except the social-icon strip and the embedded www URL.
 *
 * Usage:
 *   node scripts/inpaint.mjs \
 *     --asset-id 365158509117 \
 *     --in source-creatives/365158509117.jpg \
 *     --out proposed/inpaint/365158509117.png \
 *     --slot landscape \
 *     --social-position top-right \
 *     --url-position top-left
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname, isAbsolute, extname } from 'path';
import { homedir } from 'os';
import process from 'process';

const MODEL = 'gemini-3.1-flash-image-preview';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function parseArgs() {
  const args = { retries: 2, slot: 'square', socialPosition: 'top-right', urlPosition: 'top-left', dryRun: false };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k === '--asset-id') args.assetId = a[++i];
    else if (k === '--in') args.in = a[++i];
    else if (k === '--out') args.out = a[++i];
    else if (k === '--slot') args.slot = a[++i];
    else if (k === '--social-position') args.socialPosition = a[++i];
    else if (k === '--url-position') args.urlPosition = a[++i];
    else if (k === '--no-url') args.noUrl = true;
    else if (k === '--no-social') args.noSocial = true;
    else if (k === '--retries') args.retries = Number(a[++i]);
    else if (k === '--dry-run') args.dryRun = true;
  }
  if (!args.in || !args.out) {
    console.error('Required: --in <path> --out <path>');
    process.exit(1);
  }
  return args;
}

function loadApiKey() {
  const envPath = resolve(homedir(), '.admireworks', 'research.env');
  let contents;
  try { contents = readFileSync(envPath, 'utf8'); } catch {
    throw new Error(`Missing GOOGLE_GEMINI_API_KEY at ${envPath}`);
  }
  for (const line of contents.split('\n')) {
    if (line.startsWith('GOOGLE_GEMINI_API_KEY=')) {
      const k = line.slice('GOOGLE_GEMINI_API_KEY='.length).trim();
      if (k) return k;
    }
  }
  throw new Error(`GOOGLE_GEMINI_API_KEY not found in ${envPath}`);
}

function mimeForPath(p) {
  const e = extname(p).toLowerCase();
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
  if (e === '.png') return 'image/png';
  return 'image/jpeg';
}

function buildPrompt(args) {
  const removals = [];
  if (!args.noSocial) {
    removals.push(`the cluster of round social-media icons (Facebook, Instagram, TikTok, YouTube, and any similar circular icons) located at the ${args.socialPosition} of the image`);
  }
  if (!args.noUrl) {
    removals.push(`the website-URL text "www.basseqat.com" located at the ${args.urlPosition} of the image`);
  }
  const removalText = removals.join(' AND ');

  return [
    `Edit the attached image: cleanly REMOVE ${removalText}.`,
    `Fill the area where the removed elements were with content that matches the surrounding background seamlessly (sky, palm fronds, sand, or whatever is directly behind the removed elements).`,
    `Preserve EVERY OTHER element exactly as it appears in the original: the same composition, the same palm trees, the same Arabic typography on any signposts, the same overall color palette, the same lighting and shadows, the same aspect ratio (${args.slot === 'landscape' ? '1.91:1 landscape' : '1:1 square'}), the same resolution.`,
    `Do NOT add a new logo, do NOT add any new text, do NOT change the color grade, do NOT shift the layout.`,
    `Output the modified image with no other modifications. The result must look identical to the original except for the cleanly removed elements.`,
  ].join(' ');
}

async function run() {
  const args = parseArgs();
  const inPath = isAbsolute(args.in) ? args.in : resolve(process.cwd(), args.in);
  const outPath = isAbsolute(args.out) ? args.out : resolve(process.cwd(), args.out);
  if (!existsSync(inPath)) throw new Error(`Input not found: ${inPath}`);

  const prompt = buildPrompt(args);
  console.log(`\n[${args.assetId || 'unknown'}] inpaint`);
  console.log(`  in:  ${inPath}`);
  console.log(`  out: ${outPath}`);
  console.log(`  slot: ${args.slot}, social=${!args.noSocial}@${args.socialPosition}, url=${!args.noUrl}@${args.urlPosition}`);

  if (args.dryRun) {
    console.log(`  PROMPT:\n${prompt}\n`);
    return;
  }

  const apiKey = loadApiKey();
  const refBuf = readFileSync(inPath);
  const parts = [
    { inlineData: { mimeType: mimeForPath(inPath), data: refBuf.toString('base64') } },
    { text: prompt },
  ];

  for (let attempt = 0; attempt <= args.retries; attempt++) {
    try {
      const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = JSON.stringify(data).slice(0, 300);
        console.error(`  [attempt ${attempt + 1}] HTTP ${res.status}: ${msg}`);
        if (attempt < args.retries) { await new Promise(r => setTimeout(r, 3000)); continue; }
        throw new Error(`API error ${res.status}: ${msg}`);
      }
      const partsOut = data.candidates?.[0]?.content?.parts || [];
      const imgPart = partsOut.find(p => p.inlineData);
      if (!imgPart) {
        const textPart = partsOut.find(p => p.text);
        console.error(`  [attempt ${attempt + 1}] No image returned. Text: ${textPart?.text?.slice(0, 200) || '(none)'}`);
        if (attempt < args.retries) { await new Promise(r => setTimeout(r, 2000)); continue; }
        throw new Error('Model returned no image.');
      }
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, Buffer.from(imgPart.inlineData.data, 'base64'));
      const bytes = Buffer.from(imgPart.inlineData.data, 'base64').length;
      console.log(`  OK (${(bytes / 1024).toFixed(0)} KB)`);
      return;
    } catch (err) {
      if (attempt < args.retries) { console.error(`  [attempt ${attempt + 1}] ${err.message}`); await new Promise(r => setTimeout(r, 3000)); continue; }
      throw err;
    }
  }
}

run().catch(e => { console.error(`FATAL: ${e.message}`); process.exit(1); });
