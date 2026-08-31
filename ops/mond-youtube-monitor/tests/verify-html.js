import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = path.join(__dirname, '../../../youtube-monitor/index.html');

console.log('--- HTML Dashboard Validation ---');
console.log(`Verifying: ${htmlPath}`);

assert.ok(fs.existsSync(htmlPath), 'Generated HTML dashboard must exist');

const html = fs.readFileSync(htmlPath, 'utf8');

// Basic structural assertions
assert.ok(html.startsWith('<!DOCTYPE html>'), 'Must start with DOCTYPE');
assert.ok(html.includes('<html lang="en">'), 'Must contain html opening tag');
assert.ok(html.includes('</html>'), 'Must contain html closing tag');
assert.ok(html.includes('<head>'), 'Must contain head opening tag');
assert.ok(html.includes('</head>'), 'Must contain head closing tag');
assert.ok(html.includes('<body>'), 'Must contain body opening tag');
assert.ok(html.includes('</body>'), 'Must contain body closing tag');
assert.ok(html.includes('<style>'), 'Must contain style tag');
assert.ok(html.includes('<script>'), 'Must contain script tag');

// Check design tokens presence
assert.ok(html.includes('--primary-navy: #001a70;'), 'Must contain primary navy color token');
assert.ok(html.includes('--primary-gold: #cc9f53;'), 'Must contain primary gold color token');
assert.ok(html.includes('--jumeirah: #66bc99;'), 'Must contain jumeirah color token');
assert.ok(html.includes('--tomato: #d44315;'), 'Must contain tomato color token');
assert.ok(html.includes('--bg-warm: #faf9f6;'), 'Must contain bg warm color token');

// Check interactive elements
assert.ok(html.includes('id="search-input"'), 'Must contain search input element');
assert.ok(html.includes('id="country-filter"'), 'Must contain country filter dropdown');
assert.ok(html.includes('id="tag-filter"'), 'Must contain tag filter dropdown');
assert.ok(html.includes('id="prev-btn"'), 'Must contain previous page button');
assert.ok(html.includes('id="next-btn"'), 'Must contain next page button');
assert.ok(html.includes('btn-copy-text'), 'Must contain copy transcript button class');
assert.ok(html.includes('btn-copy-link'), 'Must contain copy time link button class');

// Check iframe embedding
assert.ok(html.includes('https://www.youtube.com/embed/'), 'Must embed YouTube iframe player URL');

console.log('HTML Validation passed successfully! Generated dashboard is well-formed and valid.');
