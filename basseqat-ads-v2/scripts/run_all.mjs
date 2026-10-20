#!/usr/bin/env node
/**
 * Orchestrator. Reads audit/audit.json and runs the right fix per image:
 *   - keep                : copy original to proposed/keep/ (no API cost)
 *   - logo_overlay_only   : python logo_composite.py (free, deterministic)
 *   - inpaint             : node scripts/inpaint.mjs (Nano Banana 2)
 *   - inpaint_plus_logo   : inpaint -> then logo_composite (Nano Banana + PIL)
 *
 * Concurrency 2 for the API calls. Hard-stops at $20 of estimated spend.
 */
import { readFileSync, mkdirSync, copyFileSync } from 'fs';
import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const AUDIT = JSON.parse(readFileSync(resolve(ROOT, 'audit/audit.json'), 'utf8'));

const LANDSCAPE_LOGO = resolve(ROOT, 'logo-uploads/logo-primary-src.png');
const SQUARE_LOGO = resolve(ROOT, 'logo-uploads/logo-primary-src.png');

const COST_PER_GENERATION_USD = 0.13;  // upper bound for Nano Banana 2
const COST_CEILING_USD = 20;
let estimatedSpend = 0;

function runCmd(cmd, args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${label} exited ${code}`));
    });
  });
}

async function processImage(img) {
  const src = resolve(ROOT, 'source-creatives', img.file);
  const verdict = img.verdict;
  const logo = img.slot === 'landscape' ? LANDSCAPE_LOGO : SQUARE_LOGO;

  if (verdict === 'keep') {
    const dest = resolve(ROOT, 'proposed/keep', img.file);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    console.log(`[${img.asset_id}] keep -> copied as-is`);
    return;
  }

  if (verdict === 'logo_overlay_only') {
    const out = resolve(ROOT, 'proposed/logo-overlay', `${img.asset_id}.jpg`);
    console.log(`[${img.asset_id}] logo_overlay_only (PIL, free)`);
    await runCmd('python3', [
      resolve(__dirname, 'logo_composite.py'),
      '--in', src,
      '--out', out,
      '--slot', img.slot,
      '--logo', logo,
    ], `logo_composite ${img.asset_id}`);
    return;
  }

  if (verdict === 'inpaint' || verdict === 'inpaint_plus_logo') {
    if (estimatedSpend + COST_PER_GENERATION_USD > COST_CEILING_USD) {
      throw new Error(`Cost ceiling $${COST_CEILING_USD} would be exceeded. Current $${estimatedSpend.toFixed(2)}.`);
    }
    estimatedSpend += COST_PER_GENERATION_USD;
    const inpaintOut = resolve(ROOT, 'proposed/inpaint', `${img.asset_id}.png`);
    const inpaintArgs = [
      resolve(__dirname, 'inpaint.mjs'),
      '--asset-id', img.asset_id,
      '--in', src,
      '--out', inpaintOut,
      '--slot', img.slot,
    ];
    if (img.has_social_icons) {
      inpaintArgs.push('--social-position', img.social_icons_position || 'top-right');
    } else {
      inpaintArgs.push('--no-social');
    }
    if (img.has_basseqat_com_text) {
      inpaintArgs.push('--url-position', img.url_position || 'top-left');
    } else {
      inpaintArgs.push('--no-url');
    }
    await runCmd('node', inpaintArgs, `inpaint ${img.asset_id}`);

    if (verdict === 'inpaint_plus_logo') {
      const finalOut = resolve(ROOT, 'proposed/inpaint', `${img.asset_id}.final.png`);
      await runCmd('python3', [
        resolve(__dirname, 'logo_composite.py'),
        '--in', inpaintOut,
        '--out', finalOut,
        '--slot', img.slot,
        '--logo', logo,
      ], `logo_composite (post-inpaint) ${img.asset_id}`);
    }
    console.log(`[${img.asset_id}] cost now ~$${estimatedSpend.toFixed(2)}`);
    return;
  }

  console.warn(`[${img.asset_id}] unknown verdict: ${verdict}`);
}

async function main() {
  const queue = AUDIT.images;
  console.log(`Processing ${queue.length} images.`);
  console.log(`Verdicts: keep=${queue.filter(i => i.verdict === 'keep').length}, ` +
              `logo-overlay=${queue.filter(i => i.verdict === 'logo_overlay_only').length}, ` +
              `inpaint=${queue.filter(i => i.verdict === 'inpaint').length}, ` +
              `inpaint+logo=${queue.filter(i => i.verdict === 'inpaint_plus_logo').length}`);
  console.log(`Estimated max cost: $${(queue.filter(i => i.verdict.startsWith('inpaint')).length * COST_PER_GENERATION_USD).toFixed(2)}\n`);

  // Concurrency 2
  const concurrency = 2;
  let cursor = 0;
  async function worker() {
    while (cursor < queue.length) {
      const i = cursor++;
      try { await processImage(queue[i]); }
      catch (e) { console.error(`[${queue[i].asset_id}] FAILED: ${e.message}`); }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  console.log(`\nDONE. Estimated Nano Banana spend: $${estimatedSpend.toFixed(2)}`);
}

main().catch(e => { console.error(`FATAL: ${e.message}`); process.exit(1); });
