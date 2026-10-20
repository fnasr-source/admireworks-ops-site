#!/usr/bin/env node
/**
 * Basseqat meta-ads-v2 image generator: fork of mond-image-pipeline/generate.mjs
 * with model + location selection (Gemini 3 Pro Image aka Nano Banana Pro runs on
 * the GLOBAL Vertex endpoint; 2.5-flash-image on us-central1 as fallback).
 * Founder faces NEVER go through this generator: scenes/backgrounds only.
 * Auth: AW service account (no API keys). Usage logged per --client/--source.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname, isAbsolute } from 'path';
import { homedir } from 'os';
import { createSign } from 'crypto';
import process from 'process';

const VERTEX_PROJECT = process.env.VERTEX_PROJECT || 'admireworks---internal-os';

function parseArgs() {
    const args = { retries: 2, aspect: '1:1', refImages: [], skill: 'basseqat-meta-ads-v2', noLog: false,
        model: 'gemini-3-pro-image-preview', location: 'global' };
    const a = process.argv.slice(2);
    for (let i = 0; i < a.length; i++) {
        const k = a[i];
        if (k === '--prompt') args.prompt = a[++i];
        else if (k === '--out') args.out = a[++i];
        else if (k === '--aspect') args.aspect = a[++i];
        else if (k === '--model') args.model = a[++i];
        else if (k === '--location') args.location = a[++i];
        else if (k === '--ref-image') args.refImages.push(a[++i]);
        else if (k === '--retries') args.retries = Number(a[++i]);
        else if (k === '--client') args.client = a[++i];
        else if (k === '--source') args.source = a[++i];
        else if (k === '--no-log') args.noLog = true;
    }
    if (!args.prompt || !args.out) {
        console.error('Usage: generate_v2.mjs --prompt "..." --out <path> [--aspect 1:1|9:16|16:9|3:4] [--model gemini-3-pro-image-preview|gemini-2.5-flash-image] [--location global|us-central1] [--ref-image <path>]... [--client Basseqat] [--source meta-ads-v2]');
        process.exit(1);
    }
    return args;
}

function loadRefImages(paths) {
    return paths.map(p => {
        const abs = isAbsolute(p) ? p : resolve(process.cwd(), p);
        const ext = abs.toLowerCase().slice(abs.lastIndexOf('.'));
        const mimeType = ext === '.png' ? 'image/png' : (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        return { path: abs, part: { inlineData: { mimeType, data: readFileSync(abs).toString('base64') } } };
    });
}

function b64url(buf) { return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
async function vertexAccessToken() {
    const saPath = (process.env.GOOGLE_APPLICATION_CREDENTIALS && existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS))
        ? process.env.GOOGLE_APPLICATION_CREDENTIALS
        : resolve(homedir(), 'Documents/IDE Projects/Admireworks Internal OS/firebase/service-account.json');
    const sa = JSON.parse(readFileSync(saPath, 'utf8'));
    const now = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
    const unsigned = `${header}.${claim}`;
    const sig = b64url(createSign('RSA-SHA256').update(unsigned).sign(sa.private_key));
    const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }) });
    const data = await res.json();
    if (!data.access_token) throw new Error('Vertex token exchange failed: ' + JSON.stringify(data).slice(0, 200));
    return data.access_token;
}

function loadEnvValue(key) {
    try {
        const contents = readFileSync(resolve(homedir(), '.admireworks', 'research.env'), 'utf8');
        for (const line of contents.split('\n')) {
            const t = line.trim();
            if (t.startsWith(`${key}=`)) { const v = t.slice(key.length + 1).trim(); if (v) return v; }
        }
    } catch { /* ignore */ }
    return process.env[key] || null;
}

async function logUsage({ client, source, skill, model, usage, outPath }) {
    const key = loadEnvValue('AW_AI_USAGE_KEY');
    if (!key) { console.log('   (usage not logged: AW_AI_USAGE_KEY unset)'); return; }
    const base = (loadEnvValue('AW_PORTAL_URL') || 'https://my.admireworks.com').replace(/\/$/, '');
    const payload = { clientSlug: client || null, source: source || 'unspecified', skill, model, kind: 'image', images: 1,
        promptTokens: usage?.promptTokenCount ?? 0, outputTokens: usage?.candidatesTokenCount ?? 0, totalTokens: usage?.totalTokenCount ?? 0,
        gcpProject: VERTEX_PROJECT, outPath };
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${base}/api/ai-usage/log`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-ai-usage-key': key, Authorization: `Bearer ${key}` }, body: JSON.stringify(payload), signal: controller.signal });
        clearTimeout(timer);
        console.log(res.ok ? `   usage logged for ${client || '(untagged)'}` : `   (usage log skipped: HTTP ${res.status})`);
    } catch (err) { console.log(`   (usage log skipped: ${err?.message || err})`); }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function generate(args) {
    const token = await vertexAccessToken();
    const host = args.location === 'global' ? 'aiplatform.googleapis.com' : `${args.location}-aiplatform.googleapis.com`;
    const url = `https://${host}/v1/projects/${VERTEX_PROJECT}/locations/${args.location}/publishers/google/models/${args.model}:generateContent`;
    const refs = loadRefImages(args.refImages);
    const requestParts = [...refs.map(r => r.part), { text: args.prompt }];
    const outPath = isAbsolute(args.out) ? args.out : resolve(process.cwd(), args.out);
    for (let attempt = 0; attempt <= args.retries; attempt++) {
        try {
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ contents: [{ role: 'user', parts: requestParts }], generationConfig: { responseModalities: ['IMAGE', 'TEXT'], imageConfig: { aspectRatio: args.aspect } } }) });
            const data = await res.json();
            if (!res.ok) {
                console.error(`  [attempt ${attempt + 1}] HTTP ${res.status}: ${JSON.stringify(data).slice(0, 250)}`);
                if (attempt < args.retries) { await sleep(3000); continue; }
                throw new Error(`API error ${res.status}`);
            }
            const imgPart = (data.candidates?.[0]?.content?.parts || []).find(p => p.inlineData);
            if (!imgPart) {
                const txt = (data.candidates?.[0]?.content?.parts || []).find(p => p.text)?.text;
                console.error(`  [attempt ${attempt + 1}] no image. Text: ${txt?.slice(0, 180) || '(none)'}`);
                if (attempt < args.retries) { await sleep(2000); continue; }
                throw new Error('Model returned no image.');
            }
            mkdirSync(dirname(outPath), { recursive: true });
            writeFileSync(outPath, Buffer.from(imgPart.inlineData.data, 'base64'));
            return { outPath, usage: data.usageMetadata || null };
        } catch (err) {
            if (attempt < args.retries) { console.error(`  [attempt ${attempt + 1}] ${err.message}`); await sleep(3000); continue; }
            throw err;
        }
    }
    throw new Error('Exhausted retries.');
}

const args = parseArgs();
console.log(`v2 generator: ${args.model} @ ${args.location} aspect ${args.aspect} refs ${args.refImages.length}`);
console.log(`   out: ${args.out}`);
try {
    const { outPath, usage } = await generate(args);
    console.log(`   saved ${outPath}`);
    if (!args.noLog) await logUsage({ client: args.client, source: args.source, skill: args.skill, model: args.model, usage, outPath });
} catch (err) {
    console.error(`FAILED: ${err.message}`);
    process.exit(1);
}
