/**
 * Ein Abayaa x Admireworks — Strategy Presentation Engine
 * Total renovation — fixes all content rendering, mobile, navigation
 */
(function () {
  'use strict';

  /* ===== PDF MODE ===== */
  var IS_PDF_MODE = new URLSearchParams(window.location.search).get('pdf') === '1';
  if (IS_PDF_MODE) document.body.classList.add('pdf-mode');

  /* ===== SLUG ===== */
  var SLUG = (function () {
    var m = window.location.pathname.match(/\/strategies\/([^\/]+)\//);
    if (m) return m[1];
    var meta = document.querySelector('meta[name="aw-strategy-slug"]');
    return meta ? meta.getAttribute('content') : '';
  })();
  window.__engineSlug = SLUG;

  var slides = [];
  var meta = {};
  var currentIndex = -1;
  var channel = null;
  var isPresenter = false;

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  /* ===== INIT ===== */
  function init() {
    var params = new URLSearchParams(window.location.search);
    isPresenter = params.get('mode') === 'presenter';

    loadContent()
      .then(function (data) {
        slides = data.slides || [];
        meta = data.meta || {};
        if (!slides.length) { hideLoader(); return; }
        buildAllSlides();
        setupNavigation();
        setupScaling();
        setupBroadcastChannel();
        setupPresenterMode();
        setupLiveDataSource();
        setupLiveSession();
        setupAnalytics();

        var hashIndex = parseInt(window.location.hash.replace('#', ''), 10);
        goToSlide((!isNaN(hashIndex) && hashIndex >= 0 && hashIndex < slides.length) ? hashIndex : 0);
        updateLoaderProgress(100);
        setTimeout(hideLoader, 400);

        /* Expose navigation API for headless PDF rendering */
        if (IS_PDF_MODE) {
          window.goToSlide = goToSlide;
          window.__slidesReady = true;
          window.__slideCount = slides.length;
        }
      })
      .catch(function (err) {
        console.error('Content load error:', err);
        $('#slideContainer').innerHTML = '<div style="padding:80px;color:#c0392b;font-size:24px;">Error loading content.json — ' + err.message + '</div>';
        hideLoader();
      });
  }

  /* ===== CONTENT LOADING ===== */
  function loadContent() {
    return fetch('./content.json')
      .then(function (r) { if (r.ok) return r.json(); throw new Error('not found'); })
      .catch(function () {
        return fetch('../content.json').then(function (r) {
          if (r.ok) return r.json();
          throw new Error('content.json not found in ./ or ../');
        });
      });
  }

  /* ===== LOADER ===== */
  function updateLoaderProgress(pct) {
    var fill = $('.loader-fill');
    if (fill) fill.style.width = pct + '%';
  }
  function hideLoader() {
    var loader = $('#loader');
    if (loader) { loader.classList.add('fade-out'); setTimeout(function () { loader.remove(); }, 600); }
  }

  /* ===== BUILD ALL SLIDES ===== */
  function buildAllSlides() {
    var container = $('#slideContainer');
    container.innerHTML = '';
    slides.forEach(function (slide, i) {
      updateLoaderProgress(Math.round((i / slides.length) * 90));
      var el = document.createElement('div');
      el.className = 'slide layout-' + normalizeLayout(slide.layout);
      el.dataset.index = i;
      el.id = slide.id || ('slide-' + i);

      var bgImage = gf(slide.content, 'background_image');
      if (bgImage) {
        el.style.backgroundImage = "url('" + bgImage + "')";
        el.classList.add('has-bg');
      }

      var inner = document.createElement('div');
      inner.className = 'slide-inner';
      inner.innerHTML = renderSlide(slide);
      el.appendChild(inner);
      container.appendChild(el);
    });
  }

  /* ===== LAYOUT NORMALIZATION ===== */
  function normalizeLayout(layout) {
    var map = {
      'cover': 'cover', 'section-divider': 'section-divider', 'stat-highlight': 'stat-highlight',
      'title-body': 'content', 'title-bullets': 'content', 'grid-6': 'content', 'grid-3': 'content',
      'comparison-table': 'content', 'persona': 'persona', 'funnel': 'content',
      'ad-copy': 'ad-copy', 'closing': 'closing'
    };
    return map[layout] || 'content';
  }

  /* ===== RENDER DISPATCHER ===== */
  function renderSlide(slide) {
    var c = slide.content || {};
    switch (slide.layout) {
      case 'cover': return renderCover(c);
      case 'section-divider': return renderDivider(c);
      case 'stat-highlight': return renderStat(c);
      case 'title-body': return renderTitleBody(c);
      case 'title-bullets': return renderTitleBullets(c);
      case 'grid-6': return renderGrid6(c);
      case 'grid-3': return renderGrid3(c);
      case 'comparison-table': return renderTable(c);
      case 'persona': return renderPersona(c);
      case 'funnel': return renderFunnel(c);
      case 'ad-copy': return renderAdCopy(c);
      case 'closing': return renderClosing(c);
      default: return renderTitleBody(c);
    }
  }

  /* ===== HELPERS ===== */
  function gf(obj) {
    for (var i = 1; i < arguments.length; i++) {
      var k = arguments[i];
      if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
    }
    return null;
  }

  function esc(str) {
    if (!str) return '';
    var el = document.createElement('span');
    el.textContent = String(str);
    return el.innerHTML;
  }

  function makeHeader(c) {
    var title = gf(c, 'title');
    var titleAr = gf(c, 'title_ar');
    if (!title) return '';
    return '<div class="slide-header"><div class="slide-header-title">' + esc(title) + '</div>' +
      (titleAr ? '<div class="slide-header-title-ar">' + esc(titleAr) + '</div>' : '') + '</div>';
  }

  function renderBulletList(items, compact) {
    if (!Array.isArray(items) || !items.length) return '';
    var cls = compact ? ' compact' : '';
    var html = '<ul class="bullet-list' + cls + '">';
    items.forEach(function (b) {
      var text = typeof b === 'string' ? b : (b.text || b.title || '');
      var source = typeof b === 'object' ? b.source : null;
      html += '<li class="bullet-item"><span class="bullet-dot"></span><div class="bullet-content"><div class="bullet-text">' + esc(text) + '</div>' +
        (source ? '<div class="bullet-source">' + esc(source) + '</div>' : '') + '</div></li>';
    });
    return html + '</ul>';
  }

  function renderScreenshot(c) {
    if (!c.screenshot) return '';
    var src = c.screenshot.indexOf('/') >= 0 ? c.screenshot : './assets/screenshots/' + c.screenshot;
    return '<div class="slide-screenshot">' +
      '<img src="' + esc(src) + '" alt="' + esc(c.screenshot_caption || 'Screenshot') + '" class="screenshot-img">' +
      (c.screenshot_caption ? '<div class="screenshot-caption">' + esc(c.screenshot_caption) + '</div>' : '') +
      '</div>';
  }

  /* Split-image wrapper: wraps content HTML in a 2-column grid with image */
  function wrapSplitImage(contentHtml, c) {
    if (!c.split_image && !Array.isArray(c.image_grid)) return contentHtml;
    var side = c.split_image_side || 'right';
    var imageHtml = '';

    if (Array.isArray(c.image_grid)) {
      imageHtml = '<div class="image-grid">';
      c.image_grid.forEach(function (src) {
        var path = src.indexOf('/') >= 0 ? src : './assets/screenshots/' + src;
        imageHtml += '<img src="' + esc(path) + '" alt="">';
      });
      imageHtml += '</div>';
    } else if (c.split_image) {
      var frame = c.split_image_frame !== false ? ' frame' : '';
      var imgSrc = c.split_image.indexOf('/') >= 0 ? c.split_image : './assets/screenshots/' + c.split_image;
      imageHtml = '<div class="slide-split-image' + frame + '"><img src="' + esc(imgSrc) + '" alt=""></div>';
    }

    return '<div class="slide-split slide-split--image-' + side + '">' +
      '<div class="slide-split-text">' + contentHtml + '</div>' +
      imageHtml + '</div>';
  }

  /* ===== LAYOUT: COVER ===== */
  function renderCover(c) {
    return '<div class="cover-logos">' +
      '<img src="./assets/brand/brandmark.png" alt="Admireworks">' +
      '<div class="cover-divider"></div>' +
      '<img src="./assets/screenshots/ein-abaya-logo-zid.png" alt="Ein Abayaa">' +
      '</div>' +
      '<div class="cover-period">' + esc(c.period) + '</div>' +
      '<div class="cover-title">' + esc(c.title) + '</div>' +
      '<div class="cover-client">' + esc(c.client_name) + (c.client_name_ar ? ' &mdash; ' + esc(c.client_name_ar) : '') + '</div>' +
      '<div class="cover-subtitle">' + esc(c.subtitle) + '</div>' +
      (c.tagline ? '<div class="cover-tagline">' + esc(c.tagline) + '</div>' : '') +
      (c.branding ? '<div class="cover-badge">' + esc(c.branding) + '</div>' : '');
  }

  /* ===== LAYOUT: SECTION DIVIDER ===== */
  function renderDivider(c) {
    return (c.badge ? '<div class="divider-badge">' + esc(c.badge) + '</div>' : '') +
      '<div class="divider-title">' + esc(c.title) + '</div>' +
      (c.title_ar ? '<div class="divider-title-ar">' + esc(c.title_ar) + '</div>' : '') +
      '<div class="divider-line"></div>';
  }

  /* ===== LAYOUT: STAT HIGHLIGHT ===== */
  function renderStat(c) {
    var num = gf(c, 'stat', 'number') || '\u2014';
    return '<div class="stat-gold-line"></div>' +
      '<div class="stat-number">' + esc(num) + '</div>' +
      '<div class="stat-label">' + esc(gf(c, 'label')) + '</div>' +
      (c.sublabel ? '<div class="stat-sublabel">' + esc(c.sublabel) + '</div>' : '') +
      (c.context ? '<div class="stat-context">' + esc(c.context) + '</div>' : '') +
      renderScreenshot(c) +
      (c.source ? '<div class="stat-source">' + esc(c.source) + '</div>' : '');
  }

  /* ===== LAYOUT: TITLE-BODY ===== */
  function renderTitleBody(c) {
    if (Array.isArray(c.strengths) && Array.isArray(c.weaknesses)) return renderSwot(c);
    if (c.competitor_name || c.threat_level) return renderCompetitor(c);

    var html = makeHeader(c) + '<div class="slide-body">';
    if (c.headline) html += '<div class="body-headline">' + esc(c.headline) + '</div>';
    if (c.body) {
      html += '<div class="body-text">' + c.body.split('\n\n').filter(Boolean).map(function (p) { return '<p>' + esc(p.trim()) + '</p>'; }).join('') + '</div>';
    }
    if (Array.isArray(c.bullets)) html += renderBulletList(c.bullets);
    if (Array.isArray(c.key_facts)) {
      html += '<div class="key-facts">';
      c.key_facts.forEach(function (f) {
        html += '<div class="key-fact"><div class="key-fact-label">' + esc(f.label) + '</div><div class="key-fact-value">' + esc(f.value) + '</div></div>';
      });
      html += '</div>';
    }
    if (Array.isArray(c.brands)) {
      html += '<div class="brands-grid">';
      c.brands.forEach(function (b) {
        html += '<div class="brand-card"><div class="brand-name">' + esc(b.name) + '</div><div class="brand-detail">' + esc(b.detail) + '</div></div>';
      });
      html += '</div>';
    }
    if (Array.isArray(c.implementation)) html += renderBulletList(c.implementation);
    var ins = gf(c, 'key_insight', 'insight');
    if (ins) html += '<div class="body-insight">' + esc(ins) + '</div>';
    if (c.opportunity) html += '<div class="body-opportunity">' + esc(c.opportunity) + '</div>';
    if (!c.split_image) html += renderScreenshot(c);
    html += '</div>';
    return wrapSplitImage(html, c);
  }

  /* ===== SUB: SWOT ===== */
  function renderSwot(c) {
    var html = makeHeader(c) + '<div class="slide-body"><div class="swot-grid">';
    html += '<div class="swot-column strengths"><h3>Strengths</h3>' + renderBulletList(c.strengths, true) + '</div>';
    html += '<div class="swot-column weaknesses"><h3>Weaknesses</h3>' + renderBulletList(c.weaknesses, true) + '</div>';
    html += '</div></div>';
    return html;
  }

  /* ===== SUB: COMPETITOR ===== */
  function renderCompetitor(c) {
    var html = makeHeader(c) + '<div class="slide-body">';
    html += '<div class="competitor-header">' +
      (c.competitor_name ? '<span class="competitor-name">' + esc(c.competitor_name) + '</span>' : '') +
      (c.price_range ? '<span class="competitor-price">' + esc(c.price_range) + '</span>' : '') + '</div>';
    if (c.headline) html += '<div class="body-headline">' + esc(c.headline) + '</div>';
    if (c.body) {
      html += '<div class="body-text">' + c.body.split('\n\n').filter(Boolean).map(function (p) { return '<p>' + esc(p.trim()) + '</p>'; }).join('') + '</div>';
    }
    if (Array.isArray(c.bullets)) html += renderBulletList(c.bullets);
    /* Meta row: threat badge + ad status + link */
    html += '<div class="competitor-meta-row">';
    if (c.threat_level) {
      var lvl = c.threat_level.toLowerCase();
      var cls = lvl.indexOf('none') >= 0 ? 'none' : lvl.indexOf('medium') >= 0 && lvl.indexOf('high') >= 0 ? 'medium-high' : lvl.indexOf('high') >= 0 ? 'high' : lvl.indexOf('low') >= 0 ? 'low' : 'medium';
      html += '<div class="threat-badge ' + cls + '">' + esc(c.threat_level) + '</div>';
    }
    if (c.ad_status) {
      var adCls = c.ad_status.toLowerCase().indexOf('active') >= 0 ? 'ads-active' : c.ad_status.toLowerCase().indexOf('seasonal') >= 0 ? 'ads-seasonal' : c.ad_status.toLowerCase().indexOf('offline') >= 0 ? 'ads-offline' : 'ads-none';
      html += '<div class="competitor-ad-status ' + adCls + '">' + esc(c.ad_status) + '</div>';
    }
    if (c.competitor_url) {
      html += '<a href="https://' + esc(c.competitor_url) + '" target="_blank" rel="noopener" class="competitor-link">' + esc(c.competitor_url) + '</a>';
    }
    html += '</div>';
    var ins = gf(c, 'key_insight', 'insight');
    if (ins) html += '<div class="body-insight">' + esc(ins) + '</div>';
    if (c.opportunity) html += '<div class="body-opportunity">' + esc(c.opportunity) + '</div>';
    html += renderScreenshot(c);
    html += '</div>';
    return html;
  }

  /* ===== LAYOUT: TITLE-BULLETS (handles ALL content types) ===== */
  function renderTitleBullets(c) {
    return wrapSplitImage(_renderTitleBulletsInner(c), c);
  }
  function _renderTitleBulletsInner(c) {
    var html = makeHeader(c);
    if (c.note) html += '<div class="slide-note">' + esc(c.note) + '</div>';
    html += '<div class="slide-body">';

    // --- Concerns (bilingual Q&A) ---
    if (Array.isArray(c.concerns)) {
      html += '<div class="concern-list">';
      c.concerns.forEach(function (item) {
        html += '<div class="concern-item"><div class="concern-question">' +
          (item.concern_ar ? '<div class="concern-ar">' + esc(item.concern_ar) + '</div>' : '') +
          (item.concern_en ? '<div class="concern-en">' + esc(item.concern_en) + '</div>' : '') +
          '</div><div class="concern-response">' + esc(item.response) + '</div></div>';
      });
      html += '</div></div>'; return html;
    }

    // --- Platform data ---
    if (Array.isArray(c.platform_data)) {
      html += '<div class="platform-list">';
      c.platform_data.forEach(function (p) {
        html += '<div class="platform-row"><div class="platform-name">' + esc(p.platform) + '</div>' +
          '<div class="platform-insight">' + esc(p.key_insight) + '</div>' +
          '<div class="platform-relevance">' + esc(p.relevance) + '</div></div>';
      });
      html += '</div></div>'; return html;
    }

    // --- Findings (numbered analysis) ---
    if (Array.isArray(c.findings)) {
      html += '<div class="findings-list">';
      c.findings.forEach(function (f) {
        html += '<div class="finding-card"><div class="finding-number">' + esc(f.number) + '</div>' +
          '<div class="finding-body"><div class="finding-title">' + esc(f.finding) + '</div>' +
          '<div class="finding-detail">' + esc(f.detail) + '</div></div></div>';
      });
      html += '</div></div>'; return html;
    }

    // --- Channels + test_channels ---
    if (Array.isArray(c.channels)) {
      html += '<div class="channel-grid">';
      c.channels.forEach(function (ch) {
        html += '<div class="channel-card"><div class="channel-name">' + esc(ch.name) + '</div>' +
          '<div class="channel-rationale">' + esc(ch.rationale) + '</div>' +
          (ch.kpis ? '<div class="channel-kpis">' + esc(ch.kpis) + '</div>' : '') + '</div>';
      });
      html += '</div>';
      if (Array.isArray(c.test_channels)) {
        html += '<div class="test-channels-label">Test Channels</div><div class="channel-grid compact">';
        c.test_channels.forEach(function (ch) {
          html += '<div class="channel-card test"><div class="channel-name">' + esc(ch.name) + '</div>' +
            '<div class="channel-rationale">' + esc(ch.rationale) + '</div></div>';
        });
        html += '</div>';
      }
      if (c.budget_note) html += '<div class="budget-note">' + esc(c.budget_note) + '</div>';
      html += '</div>'; return html;
    }

    // --- Funnel stages ---
    if (Array.isArray(c.stages)) {
      html += '<div class="stages-list">';
      c.stages.forEach(function (s) {
        html += '<div class="stage-card"><div class="stage-name">' + esc(s.name) + '</div>' +
          (s.creative ? '<div class="stage-detail"><span class="stage-label">Creative:</span> ' + esc(s.creative) + '</div>' : '') +
          (s.kpis ? '<div class="stage-detail"><span class="stage-label">KPIs:</span> ' + esc(s.kpis) + '</div>' : '') + '</div>';
      });
      html += '</div>';
      if (Array.isArray(c.retargeting_loops)) {
        html += '<div class="retargeting-label">Retargeting Loops</div>' + renderBulletList(c.retargeting_loops, true);
      }
      html += '</div>'; return html;
    }

    // --- Landing page structure ---
    if (c.page) {
      var p = c.page;
      html += '<div class="page-preview">';
      if (p.headline_ar) html += '<div class="page-headline-ar">' + esc(p.headline_ar) + '</div>';
      if (p.headline_en) html += '<div class="page-headline-en">' + esc(p.headline_en) + '</div>';
      if (p.hook) html += '<div class="page-hook">' + esc(p.hook) + '</div>';
      var pageSections = p.sections || p.elements || [];
      if (Array.isArray(pageSections) && pageSections.length) {
        html += '<div class="page-sections">';
        pageSections.forEach(function (s) {
          var name = typeof s === 'string' ? s : (s.name || s.title || s);
          var purpose = typeof s === 'object' ? (s.purpose || s.description || '') : '';
          html += '<div class="page-section"><div class="page-section-name">' + esc(name) + '</div>' +
            (purpose ? '<div class="page-section-purpose">' + esc(purpose) + '</div>' : '') + '</div>';
        });
        html += '</div>';
      }
      var croCols = p.cro_elements || p.cro || [];
      if (Array.isArray(croCols) && croCols.length) {
        html += '<div class="page-cro-label">CRO Elements</div>' + renderBulletList(croCols, true);
      }
      var pageCta = p.cta || p.cta_ar || '';
      if (pageCta) html += '<div class="page-cta">' + esc(pageCta) + '</div>';
      html += '</div>';
      html += renderScreenshot(c);
      html += '</div>'; return html;
    }

    // --- Email/WhatsApp flows ---
    if (Array.isArray(c.flows)) {
      html += '<div class="flows-list">';
      c.flows.forEach(function (f) {
        html += '<div class="flow-card"><div class="flow-name">' + esc(f.name) + '</div>' +
          (f.trigger ? '<div class="flow-trigger"><span class="flow-label">Trigger:</span> ' + esc(f.trigger) + '</div>' : '');
        if (Array.isArray(f.sequence)) {
          html += '<ol class="flow-sequence">';
          f.sequence.forEach(function (s) { html += '<li>' + esc(s) + '</li>'; });
          html += '</ol>';
        }
        html += '</div>';
      });
      html += '</div></div>'; return html;
    }

    // --- Influencer tiers ---
    if (Array.isArray(c.tiers)) {
      if (c.headline) html += '<div class="body-headline">' + esc(c.headline) + '</div>';
      html += '<div class="tiers-list">';
      c.tiers.forEach(function (t) {
        html += '<div class="tier-card"><div class="tier-name">' + esc(t.tier) + '</div>' +
          '<div class="tier-detail">' + esc(t.detail) + '</div></div>';
      });
      html += '</div></div>'; return html;
    }

    // --- Content pillars ---
    if (Array.isArray(c.pillars)) {
      if (c.content_image) html += '<img src="' + esc(c.content_image) + '" alt="Content Pillars" class="content-image">';
      html += '<div class="pillars-list">';
      c.pillars.forEach(function (p) {
        html += '<div class="pillar-card"><div class="pillar-name">' + esc(p.name) + '</div>' +
          (p.purpose ? '<div class="pillar-purpose">' + esc(p.purpose) + '</div>' : '') +
          (p.frequency ? '<div class="pillar-freq">' + esc(p.frequency) + '</div>' : '') + '</div>';
      });
      html += '</div>';
      if (c.format_split && typeof c.format_split === 'object') {
        html += '<div class="format-split">';
        Object.keys(c.format_split).forEach(function (k) {
          html += '<div class="format-item"><span class="format-name">' + esc(k) + '</span><span class="format-pct">' + esc(c.format_split[k]) + '</span></div>';
        });
        html += '</div>';
      }
      html += '</div>'; return html;
    }

    // --- Weekly rhythm ---
    if (Array.isArray(c.weekly_rhythm)) {
      html += '<div class="rhythm-grid">';
      c.weekly_rhythm.forEach(function (d) {
        html += '<div class="rhythm-day"><div class="rhythm-day-name">' + esc(d.day) + '</div>' +
          '<div class="rhythm-content">' + esc(d.content) + '</div></div>';
      });
      html += '</div></div>'; return html;
    }

    // --- KPI categories ---
    if (Array.isArray(c.categories)) {
      c.categories.forEach(function (cat) {
        html += '<div class="kpi-category"><div class="kpi-category-name">' + esc(cat.category) + '</div>';
        if (Array.isArray(cat.metrics)) {
          html += '<div class="kpi-metrics">';
          cat.metrics.forEach(function (m) {
            html += '<div class="kpi-metric"><div class="kpi-metric-name">' + esc(m.metric) + '</div>' +
              '<div class="kpi-target">' + esc(m.target) + '</div>' +
              (m.tool ? '<div class="kpi-tool">' + esc(m.tool) + '</div>' : '') + '</div>';
          });
          html += '</div>';
        }
        html += '</div>';
      });
      html += '</div>'; return html;
    }

    // --- Reporting cadence ---
    if (Array.isArray(c.cadence)) {
      html += '<div class="cadence-list">';
      c.cadence.forEach(function (item) {
        html += '<div class="cadence-item"><div class="cadence-freq">' + esc(item.frequency) + '</div>' +
          '<div class="cadence-scope">' + esc(item.scope) + '</div></div>';
      });
      html += '</div></div>'; return html;
    }

    // --- Numbered items (goals, objectives, advantages) ---
    var items = gf(c, 'goals', 'objectives', 'advantages');
    if (Array.isArray(items) && items.length && typeof items[0] === 'object' && items[0].title) {
      html += '<ul class="bullet-list">';
      items.forEach(function (item) {
        html += '<li class="bullet-item"><span class="bullet-number">' + esc(String(item.number || '')) + '</span>' +
          '<div class="bullet-content"><div class="bullet-title">' + esc(item.title) + '</div>' +
          (item.description ? '<div class="bullet-desc">' + esc(item.description) + '</div>' : '') +
          (item.metric ? '<div class="bullet-desc"><strong>Metric:</strong> ' + esc(item.metric) + ' &mdash; <strong>Target:</strong> ' + esc(item.target || '') + '</div>' : '') +
          '</div></li>';
      });
      html += '</ul></div>'; return html;
    }

    // --- Simple bullets (also weaknesses standalone) ---
    var bullets = gf(c, 'bullets', 'strengths', 'weaknesses');
    if (Array.isArray(bullets)) { html += renderBulletList(bullets, bullets.length > 6); }

    // --- Headline (standalone, when no other content type matched above) ---
    if (c.headline && !c.tiers) html += '<div class="body-headline">' + esc(c.headline) + '</div>';

    // --- Timeline ---
    if (Array.isArray(c.timeline)) {
      html += '<div class="timeline">';
      c.timeline.forEach(function (t) {
        html += '<div class="timeline-item"><div class="timeline-period">' + esc(t.period) + '</div><div class="timeline-action">' + esc(t.action) + '</div></div>';
      });
      html += '</div>';
    }

    html += renderScreenshot(c);
    html += '</div>';
    return html;
  }

  /* ===== LAYOUT: GRID-6 ===== */
  function renderGrid6(c) {
    var html = makeHeader(c) + '<div class="grid-6">';
    (c.boxes || []).forEach(function (box) {
      html += '<div class="grid-6-card"><div class="grid-6-number">' + esc(box.number) + '</div>' +
        '<div class="grid-6-title">' + esc(box.title) + '</div>' +
        '<div class="grid-6-desc">' + esc(box.description) + '</div></div>';
    });
    return html + '</div>';
  }

  /* ===== LAYOUT: GRID-3 ===== */
  function renderGrid3(c) {
    var html = makeHeader(c);
    var items = gf(c, 'gaps', 'opportunities', 'items') || [];
    html += '<div class="grid-3">';
    items.forEach(function (item) {
      html += '<div class="grid-3-card"><div class="grid-3-title">' + esc(item.title) + '</div>' +
        '<div class="grid-3-desc">' + esc(item.description) + '</div></div>';
    });
    return html + '</div>';
  }

  /* ===== LAYOUT: COMPARISON TABLE ===== */
  function renderTable(c) {
    var html = makeHeader(c);
    var cols = c.columns || [];
    var rows = c.rows || [];
    var highlight = (c.highlight_row || '').toLowerCase();

    html += '<div class="comparison-table-wrap"><table class="comparison-table"><thead><tr>';
    cols.forEach(function (col) { html += '<th>' + esc(col) + '</th>'; });
    html += '</tr></thead><tbody>';
    rows.forEach(function (row) {
      var isHL = row.brand && row.brand.toLowerCase().indexOf(highlight) >= 0;
      html += '<tr class="' + (isHL ? 'highlight-row' : '') + '">';
      cols.forEach(function (col) {
        var key = col.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/__+/g, '_');
        var val = row[key];
        if (val === undefined) {
          var cl = col.toLowerCase();
          if (cl === 'brand') val = row.brand;
          else if (cl.indexOf('entry') >= 0) val = row.entry;
          else if (cl.indexOf('mid') >= 0) val = row.mid;
          else if (cl.indexOf('premium') >= 0) val = row.premium;
          else if (cl.indexOf('bnpl') >= 0) val = row.bnpl;
          else if (cl.indexOf('review') >= 0) val = row.reviews;
        }
        html += '<td>' + esc(val || '\u2014') + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    if (c.insight) html += '<div class="table-insight">' + esc(c.insight) + '</div>';
    return html;
  }

  /* ===== LAYOUT: PERSONA ===== */
  function renderPersona(c) {
    var html = '';
    var avatarUrl = gf(c, 'avatar_url', 'avatar');
    html += '<div class="persona-left">';
    if (avatarUrl) html += '<img src="' + esc(avatarUrl) + '" alt="' + esc(c.name) + '" class="persona-avatar">';
    html += '<div class="persona-name">' + esc(c.name) + '</div>';
    if (c.name_ar) html += '<div class="persona-name-ar">' + esc(c.name_ar) + '</div>';
    if (c.role) html += '<div class="persona-role">' + esc(c.role) + '</div>';
    html += '</div><div class="persona-right">';
    if (c.demographics) {
      html += '<div class="persona-section"><div class="persona-section-title">Demographics</div><div class="persona-demographics">';
      Object.keys(c.demographics).forEach(function (k) {
        html += '<div class="persona-demo-row"><span class="persona-demo-label">' + esc(k.charAt(0).toUpperCase() + k.slice(1)) + '</span><span class="persona-demo-value">' + esc(c.demographics[k]) + '</span></div>';
      });
      if (c.budget) html += '<div class="persona-demo-row"><span class="persona-demo-label">Budget</span><span class="persona-demo-value">' + esc(c.budget) + '</span></div>';
      html += '</div></div>';
    }
    if (Array.isArray(c.goals)) {
      html += '<div class="persona-section"><div class="persona-section-title">Goals</div><ul>';
      c.goals.forEach(function (g) { html += '<li>' + esc(g) + '</li>'; });
      html += '</ul></div>';
    }
    if (Array.isArray(c.pain_points)) {
      html += '<div class="persona-section"><div class="persona-section-title">Pain Points</div><ul>';
      c.pain_points.forEach(function (p) { html += '<li>' + esc(p) + '</li>'; });
      html += '</ul></div>';
    }
    if (c.channels) html += '<div class="persona-section"><div class="persona-section-title">Channels</div><p>' + esc(c.channels) + '</p></div>';
    if (c.language_ar) html += '<div class="persona-quote">' + esc(c.language_ar) + '</div>';
    if (c.objection_ar) html += '<div class="persona-quote" style="background:var(--ein-green);margin-top:12px;">' + esc(c.objection_ar) + '</div>';
    html += '</div>';
    return html;
  }

  /* ===== LAYOUT: FUNNEL ===== */
  function renderFunnel(c) {
    var html = makeHeader(c);
    /* Build HTML funnel visualization — no static image needed */
    if (Array.isArray(c.stages_summary)) {
      var colors = ['var(--aw-navy)', '#1a4a8a', 'var(--ein-green)', 'var(--aw-gold)', '#0d1f5c'];
      html += '<div class="funnel-visual">';
      c.stages_summary.forEach(function (s, i) {
        var w = 100 - (i * 13);
        html += '<div class="funnel-bar" style="width:' + w + '%;background:' + colors[i % colors.length] + ';">' +
          '<div class="funnel-bar-inner">' +
          '<span class="funnel-bar-num">' + esc(s.number) + '</span>' +
          '<span class="funnel-bar-name">' + esc(s.name) + '</span>' +
          (s.name_ar ? '<span class="funnel-bar-name-ar">' + esc(s.name_ar) + '</span>' : '') +
          '</div>' +
          '<div class="funnel-bar-detail">' + esc(s.channels) + ' → ' + esc(s.objective) + '</div>' +
          '</div>';
        if (i < c.stages_summary.length - 1) {
          html += '<div class="funnel-retarget">↻ retargeting</div>';
        }
      });
      html += '</div>';
    }
    return html;
  }

  /* ===== LAYOUT: AD COPY ===== */
  function renderAdCopy(c) {
    var html = '<div class="adcopy-meta">';
    if (c.ad_number) html += '<div class="adcopy-number">' + esc(String(c.ad_number).padStart(2, '0')) + '</div>';
    if (c.title) html += '<div class="adcopy-title">' + esc(c.title) + '</div>';
    html += '<div class="adcopy-detail">';
    if (c.persona_target) html += '<strong>Persona:</strong> ' + esc(c.persona_target) + '<br>';
    if (c.platform) html += '<strong>Platform:</strong> ' + esc(c.platform);
    html += '</div></div><div class="adcopy-cards">';
    if (c.hook_ar) {
      html += '<div class="adcopy-card arabic"><div class="adcopy-lang-label">ARABIC</div><div class="adcopy-copy">' + esc(c.hook_ar) + '</div></div>';
    }
    if (c.hook_en) {
      html += '<div class="adcopy-card english"><div class="adcopy-lang-label">ENGLISH</div><div class="adcopy-copy">' + esc(c.hook_en) + '</div></div>';
    }
    html += '</div>';
    if (c.cta) html += '<div class="adcopy-cta">' + esc(c.cta) + '</div>';
    return html;
  }

  /* ===== LAYOUT: CLOSING ===== */
  function renderClosing(c) {
    var html = '<div class="closing-title">' + esc(c.title || 'THANK YOU') + '</div>';
    if (c.subtitle) html += '<div class="closing-subtitle">' + esc(c.subtitle) + '</div>';
    html += '<div class="closing-line"></div>';
    if (c.client_name) html += '<div class="closing-client">' + esc(c.client_name) + '</div>';
    if (c.tagline) html += '<div class="closing-tagline">' + esc(c.tagline) + '</div>';
    if (Array.isArray(c.next_steps) && c.next_steps.length) {
      html += '<div class="closing-next-steps"><h3>Next Steps</h3><ol>';
      c.next_steps.forEach(function (s) { html += '<li>' + esc(s) + '</li>'; });
      html += '</ol></div>';
    }
    if (c.contact) {
      html += '<div class="closing-contact">';
      if (c.contact.email) html += '<span>' + esc(c.contact.email) + '</span>';
      if (c.contact.phone) html += '<span>' + esc(c.contact.phone) + '</span>';
      if (c.contact.website) html += '<span>' + esc(c.contact.website) + '</span>';
      html += '</div>';
    }
    if (c.badge) html += '<div class="closing-badge">' + esc(c.badge) + '</div>';
    return html;
  }

  /* ===== NAVIGATION ===== */
  var navigating = false; // prevent re-entry from hashchange/broadcast loops

  function goToSlide(index, fromExternal) {
    if (index < 0 || index >= slides.length) return;
    if (index === currentIndex && !fromExternal) return;
    if (navigating) return;
    navigating = true;

    currentIndex = index;
    var allSlides = $$('.slide');
    for (var i = 0; i < allSlides.length; i++) {
      if (i === index) allSlides[i].classList.add('active');
      else allSlides[i].classList.remove('active');
    }
    var counter = $('#slideCounter');
    if (counter) counter.textContent = (index + 1) + ' / ' + slides.length;
    var fill = $('#progressFill');
    if (fill) fill.style.width = (((index + 1) / slides.length) * 100) + '%';
    window.location.hash = index;
    var notesEl = $('#notesContent');
    if (notesEl) notesEl.innerHTML = (slides[index].presenter_notes || 'No notes for this slide.').replace(/\n/g, '<br>');
    if (isPresenter) updateNextSlidePreview(index);
    // Only broadcast if this navigation was local (not received from another tab)
    if (channel && !fromExternal) channel.postMessage({ type: 'goto', index: index });

    // Scroll slide to top
    var activeSlide = allSlides[index];
    if (activeSlide) activeSlide.scrollTop = 0;

    // Analytics + live session hooks
    if (window.EngineAnalytics) window.EngineAnalytics.onSlideEnter(index, slides[index] && slides[index].layout);
    if (window.EngineLiveSession) window.EngineLiveSession.onLocalSlideChange(index);

    navigating = false;
  }

  function nextSlide() { goToSlide(currentIndex + 1); }
  function prevSlide() { goToSlide(currentIndex - 1); }

  function setupNavigation() {
    var btnPrev = $('#btnPrev');
    var btnNext = $('#btnNext');
    if (btnPrev) btnPrev.addEventListener('click', prevSlide);
    if (btnNext) btnNext.addEventListener('click', nextSlide);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); nextSlide(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prevSlide(); }
      else if (e.key === 'Home') { e.preventDefault(); goToSlide(0); }
      else if (e.key === 'End') { e.preventDefault(); goToSlide(slides.length - 1); }
      else if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); }
    });

    var track = $('#progressTrack');
    if (track) {
      track.addEventListener('click', function (e) {
        var rect = track.getBoundingClientRect();
        var pct = (e.clientX - rect.left) / rect.width;
        goToSlide(Math.round(pct * (slides.length - 1)));
      });
    }

    // Touch swipe
    var touchStartX = 0;
    document.addEventListener('touchstart', function (e) { touchStartX = e.touches[0].clientX; }, { passive: true });
    document.addEventListener('touchend', function (e) {
      var diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) { diff > 0 ? nextSlide() : prevSlide(); }
    }, { passive: true });

    // Hash change listener (fromExternal to prevent broadcast loop)
    window.addEventListener('hashchange', function () {
      var idx = parseInt(window.location.hash.replace('#', ''), 10);
      if (!isNaN(idx) && idx >= 0 && idx < slides.length && idx !== currentIndex) goToSlide(idx, true);
    });
  }

  /* ===== SCALING — removed, fully responsive via CSS ===== */
  function setupScaling() { /* no-op */ }

  /* ===== FULLSCREEN ===== */
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(function () { });
  }

  /* ===== BROADCAST CHANNEL ===== */
  function setupBroadcastChannel() {
    try {
      channel = new BroadcastChannel('ein-abayaa-strategy');
      channel.onmessage = function (e) {
        if (e.data.type === 'goto') {
          goToSlide(e.data.index, true); // fromExternal prevents re-broadcast
        }
      };
    } catch (err) { /* not supported */ }
  }

  /* ===== PRESENTER CLOCK ===== */
  var presenterClockInterval = null;
  var presenterStartTime = null;

  function startPresenterClock() {
    presenterStartTime = Date.now();
    if (presenterClockInterval) clearInterval(presenterClockInterval);
    presenterClockInterval = setInterval(function () {
      if (!presenterStartTime) return;
      var elapsed = Math.floor((Date.now() - presenterStartTime) / 1000);
      var mm = Math.floor(elapsed / 60);
      var ss = elapsed % 60;
      var el = $('#presenterClock');
      if (el) el.textContent = (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
    }, 1000);
  }

  function stopPresenterClock() {
    if (presenterClockInterval) { clearInterval(presenterClockInterval); presenterClockInterval = null; }
    presenterStartTime = null;
    var el = $('#presenterClock');
    if (el) el.textContent = '00:00';
  }

  function updateNextSlidePreview(index) {
    var numEl = $('#presenterNextNumber');
    var titleEl = $('#presenterNextTitle');
    if (!numEl || !titleEl) return;
    var next = slides[index + 1];
    if (next) {
      numEl.textContent = 'Slide ' + (index + 2);
      titleEl.textContent = next.title || next.layout || '(no title)';
    } else {
      numEl.textContent = '—';
      titleEl.textContent = 'End of presentation';
    }
  }

  /* ===== PRESENTER MODE ===== */
  function setupPresenterMode() {
    var btnPresenter = $('#btnPresenter');
    var appEl = $('#app');
    var btnFullscreen = $('#btnFullscreen');

    function activatePresenter() {
      isPresenter = true;
      if (btnPresenter) btnPresenter.classList.add('active');
      if (appEl) appEl.classList.add('app--presenter');
      startPresenterClock();
      updateNextSlidePreview(currentIndex >= 0 ? currentIndex : 0);
      var notesEl = $('#notesContent');
      if (notesEl && slides[currentIndex]) {
        notesEl.innerHTML = (slides[currentIndex].presenter_notes || 'No notes for this slide.').replace(/\n/g, '<br>');
      }
    }

    function deactivatePresenter() {
      isPresenter = false;
      if (btnPresenter) btnPresenter.classList.remove('active');
      if (appEl) appEl.classList.remove('app--presenter');
      stopPresenterClock();
    }

    if (btnPresenter) {
      btnPresenter.addEventListener('click', function () {
        if (isPresenter) deactivatePresenter(); else activatePresenter();
      });
    }
    if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFullscreen);

    /* P key toggles presenter mode */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'p' || e.key === 'P') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (btnPresenter) btnPresenter.click();
      }
    });

    /* If opened with ?mode=presenter, activate immediately */
    if (isPresenter) activatePresenter();
  }

  /* ===== LIVE DATA SOURCE ===== */
  function setupLiveDataSource() {
    if (!window.EngineData || !SLUG || IS_PDF_MODE) return;
    window.EngineData.loadSlides(SLUG, function (updatedSlides) {
      if (updatedSlides.length && JSON.stringify(updatedSlides) !== JSON.stringify(slides)) {
        slides = updatedSlides;
        buildAllSlides();
        goToSlide(currentIndex >= 0 ? currentIndex : 0);
      }
    });
  }

  /* ===== LIVE SESSION ===== */
  function setupLiveSession() {
    if (!window.EngineLiveSession || IS_PDF_MODE) return;
    var params = new URLSearchParams(window.location.search);
    if (!params.get('session')) return;
    if (!window.__engineArtifactId && SLUG) {
      fetch('/api/strategies/resolve/' + encodeURIComponent(SLUG))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (res) {
          if (res && res.artifactId) {
            window.__engineArtifactId = res.artifactId;
            window.EngineLiveSession.init(res.artifactId, function (idx) {
              goToSlide(idx, true); // fromExternal=true
            });
          }
        }).catch(function () {});
    }
  }

  /* ===== ANALYTICS ===== */
  function setupAnalytics() {
    if (!window.EngineAnalytics || IS_PDF_MODE) return;
    if (window.__engineArtifactId) {
      window.EngineAnalytics.init(window.__engineArtifactId);
      return;
    }
    if (!SLUG) return;
    fetch('/api/strategies/resolve/' + encodeURIComponent(SLUG))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (res) {
        if (res && res.artifactId) {
          window.__engineArtifactId = res.artifactId;
          window.EngineAnalytics.init(res.artifactId);
        }
      }).catch(function () {});
  }

  /* ===== BOOT ===== */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
