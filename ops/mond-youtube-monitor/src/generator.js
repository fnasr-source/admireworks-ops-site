import fs from 'node:fs';
import path from 'node:path';

/**
 * Generates the HTML string for the YouTube Monitor dashboard
 * incorporating Admireworks design tokens and client-side interactive search/filter.
 * @param {Object} snippetsData Data containing snippets array
 * @returns {string} Fully formed HTML document
 */
export function generateHtml(snippetsData) {
  const snippetsJson = JSON.stringify(snippetsData.snippets || [], null, 2).replace(/<\/script>/ig, '<\\/script>');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MOND YouTube Monitor | Admireworks</title>
  <style>
    :root {
      --primary-navy: #001a70;
      --primary-gold: #cc9f53;
      --jumeirah: #66bc99;
      --tomato: #d44315;
      --bg-warm: #faf9f6;
      --card-bg: #ffffff;
      --text-navy: #001a70;
      --text-dark: #1a1a1a;
      --text-muted: #666666;
      --border-color: #e6e4e0;
      
      --font-serif: 'Jaymont', Georgia, 'Times New Roman', serif;
      --font-sans: 'Akkurat Pro', 'Noor', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      background-color: var(--bg-warm);
      color: var(--text-dark);
      font-family: var(--font-sans);
      line-height: 1.6;
      padding: 0 0 80px 0;
    }
    
    header {
      background-color: var(--primary-navy);
      color: #ffffff;
      padding: 45px 20px;
      text-align: center;
      border-bottom: 4px solid var(--primary-gold);
    }
    
    header h1 {
      font-family: var(--font-serif);
      font-size: 2.5rem;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }
    
    header p {
      font-size: 1.1rem;
      color: #ffffffb3;
      max-width: 600px;
      margin: 0 auto;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    /* Control Bar styling */
    .control-bar {
      background-color: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 20px;
      margin: -25px auto 40px auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      align-items: center;
      justify-content: space-between;
    }
    
    .search-input {
      flex: 1 1 300px;
      padding: 10px 15px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      font-size: 1rem;
      font-family: var(--font-sans);
      outline: none;
    }
    
    .search-input:focus {
      border-color: var(--primary-navy);
    }
    
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    
    select {
      padding: 10px 15px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      font-family: var(--font-sans);
      font-size: 0.95rem;
      background-color: #ffffff;
      outline: none;
      cursor: pointer;
    }
    
    select:focus {
      border-color: var(--primary-navy);
    }
    
    /* Stats banner */
    .stats-banner {
      display: flex;
      justify-content: space-around;
      margin-bottom: 30px;
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    
    .stat-item h3 {
      font-size: 1.8rem;
      color: var(--primary-navy);
      font-family: var(--font-serif);
    }
    
    .stat-item p {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
    }
    
    /* Snippet Grid */
    .snippets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 30px;
    }
    
    .snippet-card {
      background-color: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
      display: flex;
      flex-direction: column;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .snippet-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
    }
    
    .video-container {
      position: relative;
      padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
      height: 0;
      background-color: #000;
    }
    
    .video-container iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    
    .card-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }
    
    .card-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .country-badge {
      font-size: 0.8rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 50px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .country-badge.eg { background-color: #ffebe6; color: var(--tomato); }
    .country-badge.ksa { background-color: #e6f7ff; color: var(--primary-navy); }
    .country-badge.uae { background-color: #e6f9f0; color: var(--jumeirah); }
    
    .pub-date {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    
    .video-title {
      font-family: var(--font-serif);
      font-size: 1.15rem;
      color: var(--primary-navy);
      margin-bottom: 8px;
      line-height: 1.4;
      min-height: 2.8rem;
    }
    
    .channel-name {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-dark);
      margin-bottom: 15px;
    }
    
    .transcript-box {
      background-color: var(--bg-warm);
      border-left: 3px solid var(--primary-gold);
      padding: 12px 15px;
      font-size: 0.92rem;
      border-radius: 0 4px 4px 0;
      margin-bottom: 15px;
      flex-grow: 1;
      max-height: 150px;
      overflow-y: auto;
      font-style: italic;
    }
    
    .highlight {
      background-color: #fff3cd;
      color: #856404;
      font-weight: 600;
      padding: 0 2px;
      border-radius: 2px;
    }
    
    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 20px;
    }
    
    .tag {
      font-size: 0.75rem;
      background-color: #f0eff5;
      color: var(--primary-navy);
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 500;
    }
    
    .card-actions {
      display: flex;
      gap: 10px;
      margin-top: auto;
    }
    
    .btn {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      background-color: #ffffff;
      color: var(--text-dark);
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
      font-family: var(--font-sans);
    }
    
    .btn:hover {
      background-color: var(--primary-navy);
      color: #ffffff;
      border-color: var(--primary-navy);
    }
    
    .btn-gold {
      border-color: var(--primary-gold);
      color: var(--primary-gold);
    }
    
    .btn-gold:hover {
      background-color: var(--primary-gold);
      color: #ffffff;
    }
    
    /* Pagination */
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 15px;
      margin-top: 50px;
    }
    
    .page-btn {
      padding: 8px 16px;
      border: 1px solid var(--border-color);
      background-color: #ffffff;
      cursor: pointer;
      border-radius: 4px;
      font-family: var(--font-sans);
      font-weight: 600;
      transition: all 0.2s;
    }
    
    .page-btn:hover:not(:disabled) {
      background-color: var(--primary-navy);
      color: #ffffff;
    }
    
    .page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .page-info {
      font-size: 0.95rem;
      color: var(--text-muted);
    }
    
    /* Alert Toast */
    .toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: var(--primary-navy);
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 4px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 1000;
      border-left: 4px solid var(--primary-gold);
      font-weight: 600;
    }
    
    .toast.show {
      transform: translateY(0);
      opacity: 1;
    }
    
    @media (max-width: 600px) {
      header h1 {
        font-size: 1.8rem;
      }
      
      .control-bar {
        flex-direction: column;
        align-items: stretch;
      }
      
      .snippets-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>

  <header>
    <h1>MOND YouTube Monitor</h1>
    <p>Real-time marketing intelligence from YouTube discussions in Egypt, Saudi Arabia, and UAE.</p>
  </header>

  <div class="container" style="margin-top: -20px;">
    
    <div class="control-bar">
      <input type="text" class="search-input" id="search-input" placeholder="Search by video title, channel, or transcript content...">
      
      <div class="filters">
        <select id="country-filter">
          <option value="">All Countries</option>
          <option value="EG">Egypt (EG)</option>
          <option value="KSA">Saudi Arabia (KSA)</option>
          <option value="UAE">United Arab Emirates (UAE)</option>
        </select>
        
        <select id="tag-filter">
          <option value="">All Tags</option>
          <option value="leads">leads</option>
          <option value="customers">customers</option>
          <option value="أرقام">أرقام</option>
        </select>
        
        <select id="sort-select">
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="views-desc">Most Viewed</option>
        </select>
      </div>
    </div>
    
    <div class="stats-banner" id="stats-banner">
      <div class="stat-item">
        <h3 id="stat-total-snippets">0</h3>
        <p>Total Snippets</p>
      </div>
      <div class="stat-item">
        <h3 id="stat-eg">0</h3>
        <p>Egypt</p>
      </div>
      <div class="stat-item">
        <h3 id="stat-ksa">0</h3>
        <p>Saudi Arabia</p>
      </div>
      <div class="stat-item">
        <h3 id="stat-uae">0</h3>
        <p>UAE</p>
      </div>
    </div>

    <div class="snippets-grid" id="snippets-grid">
      <!-- Snippet cards will be rendered dynamically here -->
    </div>
    
    <div class="pagination" id="pagination-controls">
      <button class="page-btn" id="prev-btn" disabled>Previous</button>
      <span class="page-info" id="page-info">Page 1 of 1</span>
      <button class="page-btn" id="next-btn" disabled>Next</button>
    </div>

  </div>

  <div class="toast" id="toast">Copied to clipboard!</div>

  <script>
    // Safe HTML escape helper function
    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // Embedded snippets data
    const snippets = ${snippetsJson};
    
    const ITEMS_PER_PAGE = 6;
    let currentPage = 1;
    let filteredSnippets = [...snippets];

    const searchInput = document.getElementById('search-input');
    const countryFilter = document.getElementById('country-filter');
    const tagFilter = document.getElementById('tag-filter');
    const sortSelect = document.getElementById('sort-select');
    const snippetsGrid = document.getElementById('snippets-grid');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    const toast = document.getElementById('toast');

    // Setup stats
    function updateStats() {
      document.getElementById('stat-total-snippets').innerText = snippets.length;
      document.getElementById('stat-eg').innerText = snippets.filter(s => s.country === 'EG').length;
      document.getElementById('stat-ksa').innerText = snippets.filter(s => s.country === 'KSA').length;
      document.getElementById('stat-uae').innerText = snippets.filter(s => s.country === 'UAE').length;
    }

    // Helper to format date
    function formatDate(dateStr) {
      try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      } catch (e) {
        return dateStr;
      }
    }

    // Helper to format number
    function formatViews(views) {
      if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M views';
      if (views >= 1000) return (views / 1000).toFixed(1) + 'K views';
      return views + ' views';
    }

    // Helper to highlight keywords
    function highlightKeywords(text, tags) {
      let highlighted = text;
      
      const keywords = ['leads', 'customers', 'أرقام', 'ارقام'];
      keywords.forEach(kw => {
        let regex;
        if (kw === 'أرقام' || kw === 'ارقام') {
          regex = new RegExp('(أرقام|ارقام|رقام)', 'gi');
        } else {
          regex = new RegExp('\\\\b' + kw + '\\\\b', 'gi');
        }
        highlighted = highlighted.replace(regex, (match) => \`<span class="highlight">\${match}</span>\`);
      });
      return highlighted;
    }

    function showToast(message) {
      toast.innerText = message;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2000);
    }

    function copyToClipboard(text, message) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(message || 'Copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy: ', err);
      });
    }

    // Filter and Sort Logic
    function applyFiltersAndSort() {
      const search = searchInput.value.toLowerCase().trim();
      const country = countryFilter.value;
      const tag = tagFilter.value;
      const sortBy = sortSelect.value;

      filteredSnippets = snippets.filter(snippet => {
        // Search text match
        const matchesSearch = !search || 
          snippet.videoTitle.toLowerCase().includes(search) ||
          snippet.channel.toLowerCase().includes(search) ||
          snippet.text.toLowerCase().includes(search);
          
        // Country match
        const matchesCountry = !country || snippet.country === country;
        
        // Tag match
        const matchesTag = !tag || snippet.tags.some(t => {
          if ((tag === 'أرقام' || tag === 'ارقام') && (t === 'أرقام' || t === 'ارقام')) return true;
          return t.toLowerCase() === tag.toLowerCase();
        });

        return matchesSearch && matchesCountry && matchesTag;
      });

      // Sorting
      if (sortBy === 'date-desc') {
        filteredSnippets.sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));
      } else if (sortBy === 'date-asc') {
        filteredSnippets.sort((a, b) => new Date(a.publishedDate) - new Date(b.publishedDate));
      } else if (sortBy === 'views-desc') {
        filteredSnippets.sort((a, b) => b.views - a.views);
      }

      currentPage = 1;
      renderSnippets();
    }

    // Render snippets on current page
    function renderSnippets() {
      snippetsGrid.innerHTML = '';
      
      const totalItems = filteredSnippets.length;
      const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
      
      prevBtn.disabled = currentPage === 1;
      nextBtn.disabled = currentPage === totalPages;
      pageInfo.innerText = \`Page \${currentPage} of \${totalPages} (\${totalItems} items)\`;

      if (totalItems === 0) {
        snippetsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted); font-size: 1.1rem; border: 1px dashed var(--border-color); border-radius: 8px; background: white;">No snippets found matching the filter criteria.</div>';
        return;
      }

      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
      const pageItems = filteredSnippets.slice(startIndex, endIndex);

      pageItems.forEach((s) => {
        const card = document.createElement('div');
        card.className = 'snippet-card';
        
        const flag = s.country === 'EG' ? '🇪🇬' : s.country === 'KSA' ? '🇸🇦' : '🇦🇪';
        const startSec = Math.floor(s.start);
        
        card.innerHTML = \`
          <div class="video-container">
            <iframe 
              src="https://www.youtube.com/embed/\${escapeHtml(s.videoId)}?start=\${startSec}" 
              title="\${escapeHtml(s.videoTitle)}" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen>
            </iframe>
          </div>
          <div class="card-body">
            <div class="card-meta">
              <span class="country-badge \${escapeHtml(s.country.toLowerCase())}">\${flag} \${escapeHtml(s.country)}</span>
              <span class="pub-date">\${formatDate(s.publishedDate)} • \${formatViews(s.views)}</span>
            </div>
            <h2 class="video-title" title="\${escapeHtml(s.videoTitle)}">\${escapeHtml(s.videoTitle)}</h2>
            <div class="channel-name">Channel: \${escapeHtml(s.channel)}</div>
            
            <div class="transcript-box">
              "\${highlightKeywords(escapeHtml(s.text), s.tags)}"
            </div>
            
            <div class="tags-container">
              \${s.tags.map(t => \`<span class="tag">#\${escapeHtml(t)}</span>\`).join('')}
              <span class="tag" style="background-color: #fcf8e3; border: 1px solid #faebcc; color: #8a6d3b;">⏱️ \${s.start}s - \${s.end}s</span>
            </div>
            
            <div class="context-info" style="display: none;">\${escapeHtml(s.context)}</div>

            <div class="card-actions">
              <button class="btn btn-copy-text">Copy Transcript</button>
              <button class="btn btn-gold btn-copy-link">Copy Time Link</button>
            </div>
          </div>
        \`;
        
        // Wire copy buttons
        const copyTextBtn = card.querySelector('.btn-copy-text');
        copyTextBtn.addEventListener('click', () => {
          copyToClipboard(s.text, 'Transcript copied to clipboard!');
        });
        
        const copyLinkBtn = card.querySelector('.btn-copy-link');
        copyLinkBtn.addEventListener('click', () => {
          const videoLink = \`https://www.youtube.com/watch?v=\${s.videoId}&t=\${startSec}\`;
          copyToClipboard(videoLink, 'YouTube link with timestamp copied!');
        });

        snippetsGrid.appendChild(card);
      });
    }

    // Event Listeners
    searchInput.addEventListener('input', applyFiltersAndSort);
    countryFilter.addEventListener('change', applyFiltersAndSort);
    tagFilter.addEventListener('change', applyFiltersAndSort);
    sortSelect.addEventListener('change', applyFiltersAndSort);

    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderSnippets();
        window.scrollTo({ top: 200, behavior: 'smooth' });
      }
    });

    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredSnippets.length / ITEMS_PER_PAGE);
      if (currentPage < totalPages) {
        currentPage++;
        renderSnippets();
        window.scrollTo({ top: 200, behavior: 'smooth' });
      }
    });

    // Initialize
    updateStats();
    applyFiltersAndSort();
  </script>
</body>
</html>
`;
}

// Support running directly from CLI
if (process.argv[1] && (process.argv[1].endsWith('generator.js') || process.argv[1].endsWith('generator'))) {
  try {
    const snippetsPath = path.join(process.cwd(), 'snippets.json');
    const outputDir = path.join(process.cwd(), '../../youtube-monitor');
    const outputPath = path.join(outputDir, 'index.html');
    
    if (!fs.existsSync(snippetsPath)) {
      console.error(`Error: input file ${snippetsPath} does not exist. Run extraction first.`);
      process.exit(1);
    }
    
    const rawData = fs.readFileSync(snippetsPath, 'utf8');
    const data = JSON.parse(rawData);
    
    console.log('[Generator] Rendering dashboard HTML...');
    const htmlContent = generateHtml(data);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, htmlContent, 'utf8');
    console.log(`[Generator] Successfully generated dashboard HTML and saved to ${outputPath}`);
  } catch (err) {
    console.error('Generator CLI Error:', err);
    process.exit(1);
  }
}
