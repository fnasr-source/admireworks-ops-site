import fs from 'node:fs';
import path from 'node:path';

/**
 * YouTube Monitor Extractor
 * Genuine implementation for extracting keywords and geographic regions
 * from YouTube video titles, descriptions, and transcripts.
 */

// Default configuration
const DEFAULT_REGIONS = {
  EG: {
    names: ['egypt', 'cairo'],
    arabicNames: ['مصر', 'القاهرة']
  },
  KSA: {
    names: ['saudi', 'ksa', 'riyadh', 'kingdom of saudi arabia'],
    arabicNames: ['السعودية', 'المملكة', 'الرياض']
  },
  UAE: {
    names: ['uae', 'dubai', 'emirates', 'united arab emirates'],
    arabicNames: ['الإمارات', 'دبي']
  }
};

export const DEFAULT_KEYWORDS = ['leads', 'customers', 'أرقام'];

/**
 * Normalizes text for robust matching (folds hamzas, taa marbuta, alef maksura, case-insensitive, trims)
 * @param {string} text 
 * @returns {string}
 */
export function normalizeText(text) {
  if (text === null || text === undefined) return '';
  let normalized = String(text).toLowerCase().trim();
  // Remove Kashidas (Arabic elongation \u0640)
  normalized = normalized.replace(/\u0640/g, '');
  // Fold Arabic Hamza variations ئ, ؤ, ء to ا
  normalized = normalized.replace(/[ئؤء]/g, 'ا');
  // Simple Arabic Alef normalization: replace أ, إ, آ with ا
  normalized = normalized.replace(/[أإآ]/g, 'ا');
  // Fold Taa Marbuta to Haa
  normalized = normalized.replace(/ة/g, 'ه');
  // Fold Alef Maksura to Yaa
  normalized = normalized.replace(/ى/g, 'ي');
  // Remove diacritics (harakat)
  normalized = normalized.replace(/[\u064B-\u0652]/g, '');
  return normalized;
}

/**
 * Checks if a keyword or phrase exists in the text
 * @param {string} text 
 * @param {string} keyword 
 * @returns {boolean}
 */
export function matchKeyword(text, keyword) {
  const normalizedText = normalizeText(text);
  const normalizedKeyword = normalizeText(keyword);
  return normalizedText.includes(normalizedKeyword);
}

/**
 * Sanitizes and sorts transcript segments:
 * - Guards against null, undefined, or malformed segments.
 * - Prevents NaN times by coercing invalid/non-numeric start and duration values to 0.
 * - Sorts segments by start timestamp in ascending order.
 * @param {Array} transcript
 * @returns {Array} Sanitized and sorted transcript segments
 */
export function getSanitizedTranscript(transcript) {
  if (!Array.isArray(transcript)) {
    return [];
  }
  const sanitized = [];
  for (const segment of transcript) {
    if (!segment || typeof segment !== 'object') {
      continue;
    }
    let start = Number(segment.start);
    if (isNaN(start) || !isFinite(start)) {
      start = 0;
    }
    let duration = Number(segment.duration);
    if (isNaN(duration) || !isFinite(duration)) {
      duration = 0;
    }
    const text = segment.text ? String(segment.text) : '';
    sanitized.push({
      ...segment,
      text,
      start,
      duration
    });
  }
  sanitized.sort((a, b) => a.start - b.start);
  return sanitized;
}

/**
 * Extracts insights from a single video object (for existing test suite)
 * @param {Object} video 
 * @param {Object} [config] Custom keywords and region mappings
 * @returns {Object} Extracted insights
 */
export function extractVideoInsights(video, config = {}) {
  const keywords = config.keywords || DEFAULT_KEYWORDS;
  const regionMap = config.regions || DEFAULT_REGIONS;

  const title = video.title || '';
  const description = video.description || '';
  
  // Combine transcript segments if available, or use empty string
  let transcriptText = '';
  let transcriptSegments = [];
  if (Array.isArray(video.transcript)) {
    transcriptSegments = getSanitizedTranscript(video.transcript);
    transcriptText = transcriptSegments.map(s => s.text).join(' ');
  } else if (typeof video.transcript === 'string') {
    transcriptText = video.transcript;
  }

  const combinedText = `${title} ${description} ${transcriptText}`;
  const normalizedCombined = normalizeText(combinedText);

  // 1. Extract keyword hits with details
  const keywordHits = {};
  keywords.forEach(keyword => {
    const normKeyword = normalizeText(keyword);
    // Find all occurrences
    let count = 0;
    
    // Simple count of occurrences
    if (normKeyword.length > 0) {
      let pos = normalizedCombined.indexOf(normKeyword);
      while (pos !== -1) {
        count++;
        pos = normalizedCombined.indexOf(normKeyword, pos + normKeyword.length);
      }
    }
    
    if (count > 0) {
      keywordHits[keyword] = count;
    }
  });

  // 2. Determine associated countries/regions
  const matchedCountries = new Set();
  Object.entries(regionMap).forEach(([countryCode, data]) => {
    // Check English terms
    const hasEnglishMatch = data.names.some(name => 
      normalizedCombined.includes(normalizeText(name))
    );
    // Check Arabic terms
    const hasArabicMatch = data.arabicNames.some(name => 
      normalizedCombined.includes(normalizeText(name))
    );

    if (hasEnglishMatch || hasArabicMatch) {
      matchedCountries.add(countryCode);
    }
  });

  // 3. Extract occurrences with context (segment start time if matches transcript)
  const segmentsWithHits = [];
  if (transcriptSegments.length > 0) {
    transcriptSegments.forEach((segment) => {
      const normSeg = normalizeText(segment.text);
      const matchedKeywords = keywords.filter(kw => matchKeyword(normSeg, kw));
      
      if (matchedKeywords.length > 0) {
        segmentsWithHits.push({
          text: segment.text,
          start: segment.start,
          duration: segment.duration,
          matchedKeywords
        });
      }
    });
  }

  return {
    videoId: video.id,
    title: video.title,
    matchedCountries: Array.from(matchedCountries),
    keywordHits,
    segmentsWithHits
  };
}

/**
 * Extracts insights and aggregates metrics across a batch of videos
 * @param {Array<Object>} videos 
 * @param {Object} [config] 
 * @returns {Object} Aggregated insights
 */
export function extractBatchInsights(videos, config = {}) {
  if (!Array.isArray(videos)) {
    throw new Error('Input must be an array of videos');
  }

  const videoInsights = videos.map(v => extractVideoInsights(v, config));

  // Initialize aggregates
  const countryCounts = {};
  const keywordCounts = {};
  let totalKeywordHits = 0;

  videoInsights.forEach(insight => {
    // Aggregate countries
    insight.matchedCountries.forEach(country => {
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });

    // Aggregate keywords
    Object.entries(insight.keywordHits).forEach(([kw, count]) => {
      keywordCounts[kw] = (keywordCounts[kw] || 0) + count;
      totalKeywordHits += count;
    });
  });

  return {
    summary: {
      totalVideosProcessed: videos.length,
      totalKeywordHits,
      countryCounts,
      keywordCounts
    },
    videos: videoInsights
  };
}

/**
 * Extracts 15-60 second snippets with start/end timestamps from a list of videos,
 * merging overlapping segments from the same video.
 * @param {Array<Object>} videos 
 * @param {Array<string>} [keywords] 
 * @returns {Object} Snippets payload
 */
export function extractSnippets(videos, keywords = DEFAULT_KEYWORDS) {
  const snippets = [];

  for (const video of videos) {
    if (!video.transcript || !Array.isArray(video.transcript)) {
      continue;
    }

    const transcript = getSanitizedTranscript(video.transcript);
    const candidates = [];

    // Find all keyword hits and build raw snippet candidates around them
    for (let k = 0; k < transcript.length; k++) {
      const seg = transcript[k];
      const matchedKeywords = keywords.filter(kw => matchKeyword(seg.text, kw));

      if (matchedKeywords.length > 0) {
        let start = seg.start;
        let end = seg.start + seg.duration;
        let textSegments = [seg];
        let tags = new Set(matchedKeywords);

        // 1. Expand forward to reach at least 15s, but cap at 60s
        for (let j = k + 1; j < transcript.length; j++) {
          const nextSeg = transcript[j];
          const nextEnd = nextSeg.start + nextSeg.duration;
          // In the window expansion, never exceed 60s
          if (nextEnd - start <= 60.0) {
            textSegments.push(nextSeg);
            end = nextEnd;
            keywords.forEach(kw => {
              if (matchKeyword(nextSeg.text, kw)) tags.add(kw);
            });
            if (end - start >= 15.0) {
              break;
            }
          } else {
            break;
          }
        }

        // 2. Expand backward if still less than 15s
        if (end - start < 15.0) {
          for (let j = k - 1; j >= 0; j--) {
            const prevSeg = transcript[j];
            // In the window expansion, never exceed 60s
            if (end - prevSeg.start <= 60.0) {
              textSegments.unshift(prevSeg);
              start = prevSeg.start;
              keywords.forEach(kw => {
                if (matchKeyword(prevSeg.text, kw)) tags.add(kw);
              });
              if (end - start >= 15.0) {
                break;
              }
            } else {
              break;
            }
          }
        }

        // Ensure snippet duration is strictly bounded: >= 15s and <= 60s
        const candidateDuration = end - start;
        if (candidateDuration >= 15.0 && candidateDuration <= 60.0) {
          candidates.push({
            start,
            end,
            text: textSegments.map(s => s.text).join(' '),
            tags: Array.from(tags)
          });
        }
      }
    }

    if (candidates.length === 0) {
      continue;
    }

    // Sort candidates by start time
    candidates.sort((a, b) => a.start - b.start);

    // Merge overlapping candidates
    const mergedCandidates = [];
    for (const cand of candidates) {
      if (mergedCandidates.length === 0) {
        mergedCandidates.push(cand);
      } else {
        const last = mergedCandidates[mergedCandidates.length - 1];
        // Overlap condition: current candidate start is before or equal to last end
        if (cand.start <= last.end) {
          const mergedEnd = Math.max(last.end, cand.end);
          const mergedDuration = mergedEnd - last.start;
          // In transitive merging, enforce that no merged segment's duration exceeds 60s
          if (mergedDuration <= 60.0) {
            last.end = mergedEnd;
            last.tags = Array.from(new Set([...last.tags, ...cand.tags]));
            // Re-fetch segments in new range to prevent duplication and preserve order
            const mergedSegs = transcript.filter(s => s.start >= last.start && (s.start + s.duration) <= last.end);
            last.text = mergedSegs.map(s => s.text).join(' ');
          } else {
            // Cannot merge because duration would exceed 60s
            mergedCandidates.push(cand);
          }
        } else {
          mergedCandidates.push(cand);
        }
      }
    }

    // Construct final snippet objects
    for (const cand of mergedCandidates) {
      const roundedStart = Math.round(cand.start * 100) / 100;
      const roundedEnd = Math.round(cand.end * 100) / 100;
      const roundedDuration = roundedEnd - roundedStart;
      // Ensure rounded duration also strictly satisfies bounds
      if (roundedDuration >= 15.0 && roundedDuration <= 60.0) {
        snippets.push({
          videoId: video.id,
          videoTitle: video.title,
          channel: video.channel || 'YouTube Monitor',
          url: video.url || `https://www.youtube.com/watch?v=${video.id}`,
          country: video.country || 'EG',
          views: video.views || 0,
          publishedDate: video.publishedDate || new Date().toISOString(),
          text: cand.text.trim(),
          start: roundedStart,
          end: roundedEnd,
          context: `Key segment matching tags: ${cand.tags.join(', ')}`,
          tags: cand.tags
        });
      }
    }
  }

  return { snippets };
}

// Support running directly from CLI
if (process.argv[1] && (process.argv[1].endsWith('extractor.js') || process.argv[1].endsWith('extractor'))) {
  try {
    const inputPath = path.join(process.cwd(), 'raw-videos.json');
    const outputPath = path.join(process.cwd(), 'snippets.json');
    
    if (!fs.existsSync(inputPath)) {
      console.error(`Error: input file ${inputPath} does not exist. Run discovery first.`);
      process.exit(1);
    }
    
    const rawData = fs.readFileSync(inputPath, 'utf8');
    const data = JSON.parse(rawData);
    
    console.log('[Extractor] Extracting snippets from discovered videos...');
    const result = extractSnippets(data.videos || []);
    
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
    console.log(`[Extractor] Successfully extracted ${result.snippets.length} snippets and saved to ${outputPath}`);
  } catch (err) {
    console.error('Extractor CLI Error:', err);
    process.exit(1);
  }
}
