/* ==========================================================================
   Admireworks Proposal OS, ARCHETYPE B renderer.

   Reads a content.json shaped { meta, sections[] } and renders the page. The
   ten long-scroll proposals that existed before this were ten hand-copied
   self-contained HTML files, 20 to 40KB each, several pulling Google Fonts, and
   NONE of them using the brand typefaces. A fix applied to one reached none of
   the others, which is the same failure the deck engine was built to end.

   Deliberately vanilla, no build step, no dependencies, same as the deck
   engine. These pages are published as static files to ops.admireworks.com by
   scripts/deploy.sh pages.
   ========================================================================== */
(function () {
  'use strict';

  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /* Inline emphasis only. The content files are authored by people and by other
     agents, so the renderer accepts **bold** and `code` and nothing else: no
     raw HTML pass-through, which would make every content file an injection
     surface on a page we publish publicly. */
  function inline(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  var P = function (t) { return '<p>' + inline(t) + '</p>'; };
  var paras = function (v) {
    if (!v) return '';
    return (Array.isArray(v) ? v : [v]).map(P).join('');
  };

  var RENDER = {
    prose: function (s) {
      return (s.lead ? '<p class="doc-lead">' + inline(s.lead) + '</p>' : '') + paras(s.body);
    },
    list: function (s) {
      var html = paras(s.body);
      var items = s.items || [];
      if (items.length) {
        html += '<ul>' + items.map(function (it) {
          if (typeof it === 'string') return '<li>' + inline(it) + '</li>';
          return '<li>' + (it.title ? '<strong>' + inline(it.title) + '</strong> ' : '') + inline(it.body || '') + '</li>';
        }).join('') + '</ul>';
      }
      return html;
    },
    cards: function (s) {
      var html = paras(s.body);
      return html + '<div class="doc-cards">' + (s.items || []).map(function (it) {
        return '<div class="doc-card"><div class="doc-card-title">' + inline(it.title || '') + '</div>' +
          '<p>' + inline(it.body || '') + '</p></div>';
      }).join('') + '</div>';
    },
    steps: function (s) {
      var html = paras(s.body);
      return html + '<div class="doc-steps">' + (s.items || []).map(function (it, i) {
        return '<div class="doc-step"><div class="doc-step-num">' +
          esc(it.number || ('0' + (i + 1)).slice(-2)) + '</div><div class="doc-step-body">' +
          (it.title ? '<strong>' + inline(it.title) + '</strong> ' : '') + inline(it.body || '') + '</div></div>';
      }).join('') + '</div>';
    },
    table: function (s) {
      var cols = s.columns || [];
      var rows = s.rows || [];
      var html = paras(s.body);
      html += '<div class="doc-table-wrap"><table class="doc-table"><thead><tr>' +
        cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
      rows.forEach(function (r) {
        html += '<tr>' + cols.map(function (c) { return '<td>' + inline(r[c] == null ? '' : r[c]) + '</td>'; }).join('') + '</tr>';
      });
      return html + '</tbody></table></div>';
    },
    callout: function (s) {
      return '<div class="doc-callout">' + paras(s.body) + '</div>';
    },
    price: function (s) {
      return '<div class="doc-price">' +
        (s.label ? '<div class="doc-eyebrow">' + esc(s.label) + '</div>' : '') +
        '<div class="doc-price-amount">' + esc(s.amount || '') + '</div>' +
        (s.terms ? '<p class="doc-price-terms">' + inline(s.terms) + '</p>' : '') +
        '</div>' + paras(s.body);
    },
    signature: function (s) {
      var parties = s.parties || [];
      return '<div class="doc-sign">' + paras(s.body) +
        '<div class="doc-sig-grid">' + parties.map(function (p) {
          return '<div><div class="doc-sig-line">&nbsp;</div><div class="doc-sig-label">' +
            esc(p.org || '') + (p.person ? '<br>' + esc(p.person) : '') + '</div></div>';
        }).join('') + '</div></div>';
    },
  };

  function renderSection(s) {
    var fn = RENDER[s.type];
    if (!fn) {
      /* An unknown type is an authoring error. Rendering nothing would drop the
         section silently and the page would look complete, which is exactly the
         class of failure this system keeps hitting. Say it, on the page. */
      console.error('[scroll] unknown section type "' + s.type + '". Known: ' + Object.keys(RENDER).join(', '));
      return '<section class="doc-section"><div class="doc-error">Unknown section type <code>' +
        esc(s.type) + '</code>. This section did not render.</div></section>';
    }
    return '<section class="doc-section" id="' + esc(s.id || '') + '">' +
      (s.eyebrow ? '<div class="doc-eyebrow">' + esc(s.eyebrow) + '</div>' : '') +
      (s.title ? '<h2>' + inline(s.title) + '</h2>' : '') +
      fn(s) + '</section>';
  }

  function render(data) {
    var m = data.meta || {};
    var locale = m.locale || 'en';
    document.documentElement.lang = locale === 'ar' ? 'ar' : 'en';
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    if (m.title) document.title = m.title + (m.client_name ? ' | ' + m.client_name : '');

    var meta = [];
    if (m.client_name) meta.push(m.client_name);
    if (m.reference) meta.push(m.reference);
    if (m.issued) meta.push('Issued ' + m.issued);
    if (m.valid_until) meta.push('Valid until ' + m.valid_until);

    var html = '<div class="doc">';
    html += '<header class="doc-hero">' +
      (m.eyebrow ? '<div class="doc-eyebrow">' + esc(m.eyebrow) + '</div>' : '') +
      '<h1 class="doc-hero-title">' + inline(m.title || '') + '</h1>' +
      (m.lead ? '<p class="doc-hero-lead">' + inline(m.lead) + '</p>' : '') +
      (meta.length ? '<div class="doc-hero-meta">' + meta.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' : '') +
      '</header>';

    (data.sections || []).forEach(function (s) { html += renderSection(s); });

    html += '<div class="doc-footer">' +
      '<span>' + esc(m.agency_line || 'Admireworks · hello@admireworks.com · +971 4295 8666') + '</span>' +
      (meta.length ? '<span>' + esc(meta.join(' · ')) + '</span>' : '') +
      '</div></div>';
    document.body.innerHTML = html;
  }

  function fail(msg) {
    document.body.innerHTML = '<div class="doc-error"><strong>This page could not load its content.</strong><br>' +
      esc(msg) + '</div>';
  }

  var url = './content.json?v=' + (window.AW_CONTENT_VERSION || '1');
  fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error('content.json returned HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      if (!data || !Array.isArray(data.sections) || data.sections.length === 0) {
        /* Never render an empty shell that looks like a finished page. */
        throw new Error('content.json loaded but contains no sections.');
      }
      render(data);
    })
    .catch(function (e) { console.error(e); fail(e.message); });
})();
