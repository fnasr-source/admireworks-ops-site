import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import {
  normalizeText,
  matchKeyword,
  extractVideoInsights,
  extractBatchInsights
} from '../src/extractor.js';

// Setup file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mockDataPath = path.join(__dirname, 'mock-youtube-data.json');

console.log('--- YouTube Monitor Test Suite ---');
console.log(`Loading mock data from: ${mockDataPath}`);

// 1. Load mock data
const mockDataRaw = fs.readFileSync(mockDataPath, 'utf8');
const mockData = JSON.parse(mockDataRaw);

assert.ok(Array.isArray(mockData.videos), 'Mock data must contain a videos array');
assert.equal(mockData.videos.length, 4, 'Mock data must contain exactly 4 videos');

// 2. Test text normalization and Arabic Normalization
console.log('Testing text normalization...');
assert.equal(normalizeText('  TESTing  '), 'testing', 'Should lowercase and trim whitespace');
assert.equal(normalizeText('أرقام'), 'ارقام', 'Should normalize alef hamza (أ) to (ا)');
assert.equal(normalizeText('إشهار'), 'اشهار', 'Should normalize alef hamza (إ) to (ا)');
assert.equal(normalizeText('آثار'), 'اثار', 'Should normalize alef madda (آ) to (ا)');

// 3. Test keyword matching
console.log('Testing keyword matching...');
assert.ok(matchKeyword('we have leads here', 'leads'), 'Should match exact keyword');
assert.ok(matchKeyword('We Have LEADS Here', 'leads'), 'Should match case-insensitively');
assert.ok(matchKeyword('نجمع أرقام عملاء', 'أرقام'), 'Should match Arabic keyword with normalization');
assert.ok(matchKeyword('نجمع ارقام عملاء', 'أرقام'), 'Should match Arabic keyword even if input lacks hamza');
assert.ok(matchKeyword('نجمع أرقام عملاء', 'ارقام'), 'Should match Arabic keyword even if keyword lacks hamza');
assert.ok(!matchKeyword('only lead here', 'leads'), 'Should not match partial keyword plural');

// 4. Test individual video insight extraction
console.log('Testing individual video insight extraction...');

// Video 1: Egypt
const egVideo = mockData.videos.find(v => v.id === 'vid_eg_01');
const egInsights = extractVideoInsights(egVideo);
console.log('EG Video Insights:', egInsights);
assert.equal(egInsights.videoId, 'vid_eg_01');
assert.ok(egInsights.matchedCountries.includes('EG'), 'Should match Egypt (EG)');
assert.equal(egInsights.keywordHits['leads'], 2, 'Should have 2 leads hits');
assert.equal(egInsights.keywordHits['customers'], 2, 'Should have 2 customers hits');

// Video 2: KSA
const ksaVideo = mockData.videos.find(v => v.id === 'vid_ksa_01');
const ksaInsights = extractVideoInsights(ksaVideo);
console.log('KSA Video Insights:', ksaInsights);
assert.equal(ksaInsights.videoId, 'vid_ksa_01');
assert.ok(ksaInsights.matchedCountries.includes('KSA'), 'Should match Saudi Arabia (KSA)');
assert.equal(ksaInsights.keywordHits['leads'], 1, 'Should have 1 leads hit');
assert.equal(ksaInsights.keywordHits['customers'], 2, 'Should have 2 customers hits');

// Video 3: UAE
const uaeVideo = mockData.videos.find(v => v.id === 'vid_uae_01');
const uaeInsights = extractVideoInsights(uaeVideo);
console.log('UAE Video Insights:', uaeInsights);
assert.equal(uaeInsights.videoId, 'vid_uae_01');
assert.ok(uaeInsights.matchedCountries.includes('UAE'), 'Should match United Arab Emirates (UAE)');
assert.equal(uaeInsights.keywordHits['leads'], 1, 'Should have 1 leads hit');
assert.equal(uaeInsights.keywordHits['customers'], 1, 'Should have 1 customers hit');

// Video 4: Arabic (EG, KSA, UAE and 'أرقام')
const arVideo = mockData.videos.find(v => v.id === 'vid_arabic_01');
const arInsights = extractVideoInsights(arVideo);
console.log('Arabic Video Insights:', arInsights);
assert.equal(arInsights.videoId, 'vid_arabic_01');
assert.ok(arInsights.matchedCountries.includes('EG'), 'Should match EG (مصر)');
assert.ok(arInsights.matchedCountries.includes('KSA'), 'Should match KSA (السعودية)');
assert.ok(arInsights.matchedCountries.includes('UAE'), 'Should match UAE (الإمارات)');
assert.equal(arInsights.keywordHits['أرقام'], 3, 'Should have 3 أرقام hits');

// 5. Test batch insights aggregation
console.log('Testing batch insights aggregation...');
const batchInsights = extractBatchInsights(mockData.videos);
console.log('Batch Insights Summary:', batchInsights.summary);

assert.equal(batchInsights.summary.totalVideosProcessed, 4, 'Should process 4 videos');
assert.equal(batchInsights.summary.totalKeywordHits, 12, 'Should have 12 total keyword hits across all videos');

// Country counts: EG (2), KSA (2), UAE (2)
assert.equal(batchInsights.summary.countryCounts['EG'], 2, 'EG should appear in 2 videos');
assert.equal(batchInsights.summary.countryCounts['KSA'], 2, 'KSA should appear in 2 videos');
assert.equal(batchInsights.summary.countryCounts['UAE'], 2, 'UAE should appear in 2 videos');

// Keyword counts: leads (4), customers (5), أرقام (3)
assert.equal(batchInsights.summary.keywordCounts['leads'], 4, 'Should have 4 total leads hits');
assert.equal(batchInsights.summary.keywordCounts['customers'], 5, 'Should have 5 total customers hits');
assert.equal(batchInsights.summary.keywordCounts['أرقام'], 3, 'Should have 3 total أرقام hits');

// Segment level keyword mapping assertions
console.log('Testing segment level verification...');
const egSegHits = egInsights.segmentsWithHits;
assert.ok(egSegHits.length > 0, 'Should find segments with keyword hits');
assert.ok(egSegHits.some(s => s.text.includes('leads') && s.matchedKeywords.includes('leads')), 'Should find segment with leads');

// 6. Test extractSnippets module
console.log('Testing extractSnippets function...');
import { extractSnippets } from '../src/extractor.js';
import { discoverVideos } from '../src/discovery.js';

// Run discovery (mock/offline mode by default) to generate raw-videos.json
const rawOutputTestPath = path.join(__dirname, 'raw-videos-test.json');
const discoveryResult = await discoverVideos({ outputPath: rawOutputTestPath });
assert.equal(discoveryResult.discoveryMethod, 'offline', 'Should default to offline discovery');
assert.ok(discoveryResult.videos.length >= 8, 'Should discover at least 8 videos');

// Verify discovery output schema
discoveryResult.videos.forEach(v => {
  assert.ok(typeof v.id === 'string', 'video id must be string');
  assert.ok(typeof v.title === 'string', 'video title must be string');
  assert.ok(Array.isArray(v.transcript), 'video transcript must be array');
  v.transcript.forEach(seg => {
    assert.ok(typeof seg.text === 'string', 'segment text must be string');
    assert.ok(typeof seg.start === 'number', 'segment start must be number');
    assert.ok(typeof seg.duration === 'number', 'segment duration must be number');
  });
});

// Run extraction
const extractResult = extractSnippets(discoveryResult.videos);
console.log(`Extracted ${extractResult.snippets.length} snippets.`);
assert.ok(extractResult.snippets.length > 0, 'Should extract at least one snippet');

// Verify snippet structure and constraints
extractResult.snippets.forEach(s => {
  assert.strictEqual(typeof s.videoId, 'string', 'videoId must be a string');
  assert.strictEqual(typeof s.videoTitle, 'string', 'videoTitle must be a string');
  assert.strictEqual(typeof s.channel, 'string', 'channel must be a string');
  assert.strictEqual(typeof s.url, 'string', 'url must be a string');
  assert.ok(['EG', 'KSA', 'UAE'].includes(s.country), 'country must be EG, KSA, or UAE');
  assert.strictEqual(typeof s.views, 'number', 'views must be a number');
  assert.strictEqual(typeof s.publishedDate, 'string', 'publishedDate must be a string');
  assert.strictEqual(typeof s.text, 'string', 'text must be a string');
  assert.strictEqual(typeof s.start, 'number', 'start must be a number');
  assert.strictEqual(typeof s.end, 'number', 'end must be a number');
  assert.strictEqual(typeof s.context, 'string', 'context must be a string');
  assert.ok(Array.isArray(s.tags), 'tags must be an array');
  
  // Verify duration constraints: 15s to 60s (unless video ends, but our mock videos have enough length)
  const duration = s.end - s.start;
  assert.ok(duration >= 14.9, `Snippet duration ${duration}s should be at least 15s`);
  assert.ok(duration <= 60.1, `Snippet duration ${duration}s should be at most 60s`);
});

// Clean up test file
if (fs.existsSync(rawOutputTestPath)) {
  fs.unlinkSync(rawOutputTestPath);
}

console.log('All tests passed successfully!');

