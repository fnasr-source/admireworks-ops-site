import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OFFLINE_DB_PATH = path.join(__dirname, 'offline-database.json');

/**
 * Discovers YouTube videos discussing MOND topics in GCC.
 * Gracefully attempts online API call, falls back to offline DB.
 * Writes output to raw-videos.json.
 * @param {Object} [options] Configuration options
 * @returns {Promise<Object>} Processed raw videos data
 */
export async function discoverVideos(options = {}) {
  const outputPath = options.outputPath || path.join(process.cwd(), 'raw-videos.json');
  const apiKey = process.env.YOUTUBE_API_KEY || options.apiKey;
  let videos = [];
  let isOnline = false;

  if (apiKey) {
    try {
      console.log('[Discovery] Attempting online YouTube discovery using API Key...');
      const query = 'direct response marketing Egypt KSA UAE MOND leads';
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${apiKey}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const searchData = await res.json();
        const videoIds = searchData.items?.map(item => item.id?.videoId).filter(Boolean) || [];
        
        if (videoIds.length > 0) {
          const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(',')}&key=${apiKey}`;
          const detailsRes = await fetch(detailsUrl);
          if (detailsRes.ok) {
            const detailsData = await detailsRes.json();
            videos = (detailsData.items || []).map(item => {
              const desc = item.snippet.description || '';
              const title = item.snippet.title || '';
              let country = 'Other';
              if (/egypt|cairo|مصر/i.test(title + ' ' + desc)) country = 'EG';
              else if (/saudi|ksa|riyadh|السعودية/i.test(title + ' ' + desc)) country = 'KSA';
              else if (/uae|dubai|emirates|الإمارات|دبي/i.test(title + ' ' + desc)) country = 'UAE';

              return {
                id: item.id,
                url: `https://www.youtube.com/watch?v=${item.id}`,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                views: parseInt(item.statistics?.viewCount || '0', 10),
                publishedDate: item.snippet.publishedAt,
                country,
                transcript: [
                  { text: title, start: 0, duration: 5.0 },
                  { text: desc.substring(0, 200), start: 5.0, duration: 15.0 }
                ]
              };
            });
            isOnline = true;
            console.log(`[Discovery] Online YouTube discovery succeeded. Fetched ${videos.length} videos.`);
          }
        }
      } else {
        console.warn(`[Discovery] YouTube API returned status: ${res.status}. Falling back to offline database.`);
      }
    } catch (err) {
      console.warn(`[Discovery] YouTube API fetch failed: ${err.message}. Falling back to offline database.`);
    }
  } else {
    console.log('[Discovery] No YOUTUBE_API_KEY provided. Using offline discovery mode.');
  }

  if (!isOnline) {
    console.log('[Discovery] Loading offline database of 8 GCC video transcripts...');
    try {
      const rawDb = fs.readFileSync(OFFLINE_DB_PATH, 'utf8');
      const db = JSON.parse(rawDb);
      videos = db.videos || [];
    } catch (err) {
      console.error(`[Discovery] Failed to load offline database: ${err.message}`);
      videos = [];
    }
  }

  const result = {
    discoveryMethod: isOnline ? 'online' : 'offline',
    timestamp: new Date().toISOString(),
    videos
  };

  try {
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
    console.log(`[Discovery] Successfully saved ${videos.length} raw videos to ${outputPath}`);
  } catch (err) {
    console.error(`[Discovery] Failed to write raw videos to ${outputPath}:`, err);
  }
  return result;
}

// Support running directly from CLI
if (process.argv[1] && (process.argv[1].endsWith('discovery.js') || process.argv[1].endsWith('discovery'))) {
  discoverVideos().catch(err => {
    console.error('Discovery CLI Error:', err);
    process.exit(1);
  });
}
