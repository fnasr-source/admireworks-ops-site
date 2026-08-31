import assert from 'node:assert/strict';
import {
  normalizeText,
  matchKeyword,
  extractVideoInsights,
  extractBatchInsights,
  extractSnippets
} from '../src/extractor.js';
import { generateHtml } from '../src/generator.js';

console.log('=== STARTING ADVERSARIAL STRESS-TEST SUITE ===\n');

let failedTests = 0;
let passedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${err.message}`);
    if (err.stack) {
      console.log(`   Stack:\n${err.stack.split('\n').slice(1, 4).join('\n')}`);
    }
    failedTests++;
  }
}

// 1. Crash on Non-String Types (Robustness fix)
test('Crash on Non-String Types in normalizeText', () => {
  const resultNum = normalizeText(123);
  assert.equal(resultNum, '123', 'Should coerce 123 to string and return "123"');

  const resultBool = normalizeText(true);
  assert.equal(resultBool, 'true', 'Should coerce true to string and return "true"');
});

// 2. Arabic Kashida Normalization
test('Arabic Kashida Normalization', () => {
  const hasMatch = matchKeyword('نجمع ارقـــام عملاء', 'أرقام');
  assert.equal(hasMatch, true, 'Kashidas should be stripped and matched correctly');
});

// 3. Arabic Hamza Normalization (ئ, ؤ, ء)
test('Arabic Hamza Normalization (ئ, ؤ, ء)', () => {
  const norm1 = normalizeText('مسئول');
  const norm2 = normalizeText('مسؤول');
  assert.equal(norm1, norm2, 'ئ and ؤ should be folded to a common form');
});

// 4. Over-60s Snippet Duration via Transitive Merging
test('Snippet Duration bounds (Transitive Merging)', () => {
  const mockVideo = {
    id: 'vid_long_merge',
    title: 'Transitive Merging Video',
    channel: 'Test Channel',
    transcript: [
      { text: 'leads here', start: 0, duration: 10 },
      { text: 'leads here', start: 8, duration: 10 },
      { text: 'leads here', start: 16, duration: 10 },
      { text: 'leads here', start: 24, duration: 10 },
      { text: 'leads here', start: 32, duration: 10 },
      { text: 'leads here', start: 40, duration: 10 },
      { text: 'leads here', start: 48, duration: 10 },
      { text: 'leads here', start: 56, duration: 10 }
    ]
  };

  const result = extractSnippets([mockVideo]);
  assert.ok(result.snippets.length > 0, 'Should extract snippets');
  result.snippets.forEach(snippet => {
    const duration = snippet.end - snippet.start;
    assert.ok(duration >= 15.0 && duration <= 60.0, `Snippet duration ${duration}s must be within [15, 60]s`);
  });
});

// 5. Short/Isolated Snippets under 15s
test('Short/Isolated Snippets under 15s', () => {
  const mockVideo = {
    id: 'vid_short',
    title: 'Short Video',
    channel: 'Test Channel',
    transcript: [
      { text: 'leads here', start: 0, duration: 5 }
    ]
  };

  const result = extractSnippets([mockVideo]);
  assert.equal(result.snippets.length, 0, 'Short snippet under 15s should be discarded if it cannot be expanded');
});

// 6. Out-of-order Transcript Segments
test('Out-of-order Transcript Segments Behavior', () => {
  const mockVideo = {
    id: 'vid_ooo',
    title: 'Out of Order Video',
    channel: 'Test Channel',
    transcript: [
      { text: 'second segment leads', start: 20, duration: 15 },
      { text: 'first segment', start: 0, duration: 15 }
    ]
  };

  const result = extractSnippets([mockVideo]);
  assert.ok(result.snippets.length > 0);
  const snippet = result.snippets[0];
  assert.equal(snippet.start, 20, 'Should process the correct segment start after sorting');
  assert.ok(snippet.end > snippet.start, 'Duration must be positive');
});

// 7. NaN/Undefined Time Fields in Transcript
test('NaN/Undefined Time Fields in Transcript Propagation', () => {
  const mockVideo = {
    id: 'vid_nan',
    title: 'NaN Times Video',
    channel: 'Test Channel',
    transcript: [
      { text: 'leads here', start: undefined, duration: 15 }
    ]
  };

  const result = extractSnippets([mockVideo]);
  assert.ok(result.snippets.length > 0);
  const snippet = result.snippets[0];
  assert.ok(!isNaN(snippet.start) && !isNaN(snippet.end), 'NaN/undefined times must be coerced/handled without NaN output');
  assert.equal(snippet.start, 0, 'Undefined start should default/coerce to 0');
});

// 8. HTML Breakage / Script Injection in JSON Embedding
test('HTML Breakage / Script Injection in JSON Embedding', () => {
  const snippetsData = {
    snippets: [
      {
        videoId: 'vid_xss',
        videoTitle: '</script><script>alert("XSS")</script>',
        channel: 'Test Channel',
        url: 'https://youtube.com',
        country: 'EG',
        views: 100,
        publishedDate: '2026-06-20',
        text: 'leads',
        start: 0,
        end: 15,
        context: 'context',
        tags: ['leads']
      }
    ]
  };

  const html = generateHtml(snippetsData);
  const unescapedScriptClose = html.includes('</script><script>alert');
  assert.equal(unescapedScriptClose, false, 'HTML should escape script tag breakout close');
  assert.ok(html.includes('<\\/script>'), 'HTML should contain escaped script tag close');
});

// 9. Client-side HTML Injection / XSS via fields
test('Client-side HTML Injection / XSS via fields', () => {
  const snippetsData = {
    snippets: [
      {
        videoId: 'vid_xss',
        videoTitle: 'title_val',
        channel: 'channel_val',
        url: 'https://youtube.com',
        country: 'EG',
        views: 100,
        publishedDate: '2026-06-20',
        text: 'leads',
        start: 0,
        end: 15,
        context: 'context',
        tags: ['leads']
      }
    ]
  };

  const html = generateHtml(snippetsData);
  
  assert.ok(html.includes('title="${escapeHtml(s.videoTitle)}"'), 'Template should escape videoTitle');
  assert.ok(html.includes('Channel: ${escapeHtml(s.channel)}'), 'Template should escape channel name');
  assert.ok(html.includes('"${highlightKeywords(escapeHtml(s.text), s.tags)}"'), 'Template should escape text');
  assert.ok(html.includes('style="display: none;">${escapeHtml(s.context)}</div>'), 'Template should escape context');
  assert.ok(html.includes('s.tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`)'), 'Template should escape tags');
});

console.log(`\n=== ADVERSARIAL TEST SUITE SUMMARY ===`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed (Vulnerabilities/Bugs Found): ${failedTests}`);
console.log(`Total: ${passedTests + failedTests}`);

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
