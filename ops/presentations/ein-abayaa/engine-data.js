/**
 * engine-data.js — strategy presentation data loader
 *
 * Responsible for picking the right data source for the slides and feeding
 * them to engine.js via window.EngineData.loadSlides(slug, onSlides).
 *
 * Priority chain:
 *   1. PDF mode (?pdf=1)            → static content.json (Puppeteer needs no network)
 *   2. Share-link viewer (?share=…) → /api/strategies/slides/{slug}?share=…   (API, anonymous)
 *   3. Firebase SDK + auth ready    → Firestore onSnapshot                     (LIVE updates)
 *   4. Firebase SDK + no auth       → /api/strategies/slides/{slug}            (API, public)
 *   5. SDK never loaded             → static content.json                      (last-resort)
 *
 * Whatever path is chosen, the engine sees the same shape:
 *   { id, layout, content: {...}, presenter_notes }
 *
 * A small top-right badge briefly displays the active source ("LIVE",
 * "API", "STATIC") so silent fallbacks become visible during development.
 */
(function (window) {
  'use strict';

  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyBQk7osdbUb2hLoFrirVKhHadZ1mi9x_5I",
    authDomain: "admireworks---internal-os.firebaseapp.com",
    projectId: "admireworks---internal-os",
    appId: "1:712573851224:web:33541df018b7f51d8b1c2d"
  };

  var IS_PDF = new URLSearchParams(window.location.search).get('pdf') === '1';

  /* ─────────────────── Diagnostic badge ─────────────────── */
  function showDataSourceBadge(source, count) {
    if (IS_PDF) return;
    try {
      var existing = document.getElementById('engineDataBadge');
      if (existing) existing.remove();
      var badge = document.createElement('div');
      badge.id = 'engineDataBadge';
      badge.style.cssText = [
        'position:fixed', 'top:10px', 'right:14px',
        'padding:5px 11px', 'background:rgba(0,26,112,0.92)', 'color:#fff',
        'font:600 10px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        'border-radius:5px', 'z-index:9999', 'letter-spacing:0.08em',
        'text-transform:uppercase', 'box-shadow:0 2px 8px rgba(0,0,0,0.15)',
        'pointer-events:none', 'transition:opacity 0.5s'
      ].join(';');
      badge.textContent = source + ' · ' + count + ' slide' + (count === 1 ? '' : 's');
      document.body.appendChild(badge);
      setTimeout(function () { badge.style.opacity = '0'; }, 3500);
      setTimeout(function () { if (badge.parentNode) badge.remove(); }, 4200);
    } catch (e) { /* badge is decorative — never throw */ }
  }

  /* ─────────────────── Slide normalizers ─────────────────── */
  function normalizeStaticSlides(slides) {
    return (slides || []).map(function (s) {
      return {
        id: s.id || '',
        layout: s.layout || 'title-body',
        content: s.content || {},
        presenter_notes: s.presenter_notes || s.presenterNotes || '',
      };
    });
  }

  function normalizeFirestoreSlide(doc) {
    var d = doc.data();
    return {
      id: doc.id,
      layout: d.layout || 'title-body',
      content: d.content || {},
      presenter_notes: d.presenterNotes || '',
    };
  }

  /* ─────────────────── Loaders ─────────────────── */
  function loadFromStatic(onSlides) {
    return fetch('./content.json')
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('not found')); })
      .catch(function () { return fetch('../content.json').then(function (r) { return r.json(); }); })
      .then(function (data) {
        var slides = normalizeStaticSlides(data.slides || []);
        onSlides(slides, data.meta || {});
        showDataSourceBadge('STATIC', slides.length);
        return function () {}; // no-op unsubscribe
      })
      .catch(function (err) {
        console.error('[EngineData] Static load failed:', err);
        onSlides([], {});
        return function () {};
      });
  }

  function loadFromApi(slug, shareToken, onSlides, onError) {
    var url = '/api/strategies/slides/' + encodeURIComponent(slug);
    if (shareToken) url += '?share=' + encodeURIComponent(shareToken);
    return fetch(url, { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) return Promise.reject(new Error('HTTP ' + r.status));
        return r.json();
      })
      .then(function (data) {
        var slides = normalizeStaticSlides(data.slides || []);
        onSlides(slides, { title: data.title, clientName: data.clientName });
        showDataSourceBadge('API', slides.length);

        // Refresh on tab focus so reopening the tab gets fresh content
        // (no per-keystroke updates — share-link viewers don't need them)
        if (!window.__engineDataApiFocusBound) {
          window.__engineDataApiFocusBound = true;
          window.addEventListener('focus', function () {
            loadFromApi(slug, shareToken, onSlides, function () {});
          });
        }
        return function () {};
      })
      .catch(function (err) {
        console.warn('[EngineData] API load failed:', err.message);
        if (typeof onError === 'function') onError(err);
        return function () {};
      });
  }

  function ensureFirebaseApp() {
    if (!window.firebase || !window.firebase.firestore) return false;
    if (!window.firebase.apps || !window.firebase.apps.length) {
      try { window.firebase.initializeApp(FIREBASE_CONFIG); }
      catch (e) { console.warn('[EngineData] Firebase init failed:', e); return false; }
    }
    return true;
  }

  function subscribeToFirestoreSlides(artifactId, onSlides, onError) {
    var db = window.firebase.firestore();
    var firstSnapshot = true;
    var unsub = db.collection('clientArtifacts').doc(artifactId)
      .collection('slides').orderBy('order')
      .onSnapshot(function (snap) {
        var slides = snap.docs.map(normalizeFirestoreSlide);
        onSlides(slides, {});
        if (firstSnapshot) {
          firstSnapshot = false;
          showDataSourceBadge('LIVE', slides.length);
        }
      }, function (err) {
        console.warn('[EngineData] Firestore onSnapshot error:', err && err.message);
        if (typeof onError === 'function') onError(err);
      });
    return unsub;
  }

  function waitForAuthState(timeoutMs) {
    return new Promise(function (resolve) {
      if (!window.firebase || !window.firebase.auth) { resolve(null); return; }
      var resolved = false;
      var unsub = window.firebase.auth().onAuthStateChanged(function (user) {
        if (resolved) return;
        resolved = true;
        try { unsub(); } catch (e) {}
        resolve(user || null);
      }, function () {
        if (resolved) return;
        resolved = true;
        resolve(null);
      });
      setTimeout(function () {
        if (resolved) return;
        resolved = true;
        try { unsub(); } catch (e) {}
        resolve(null);
      }, timeoutMs || 1500);
    });
  }

  function tryFirestoreLive(slug, onSlides, onFallback) {
    if (!ensureFirebaseApp()) {
      onFallback(new Error('Firebase SDK not initialized'));
      return Promise.resolve(function () {});
    }

    return fetch('/api/strategies/resolve/' + encodeURIComponent(slug), { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) return Promise.reject(new Error('resolve HTTP ' + r.status));
        return r.json();
      })
      .then(function (res) {
        if (!res.artifactId) throw new Error('no artifactId in resolve response');
        return waitForAuthState(1500).then(function (user) {
          if (!user) {
            // Not signed in — Firestore rules will reject the slide read.
            // Let the caller fall back to the API endpoint instead.
            throw new Error('not signed in');
          }
          return subscribeToFirestoreSlides(res.artifactId, onSlides, function (err) {
            // onSnapshot error after subscribe — usually permission-denied
            onFallback(err);
          });
        });
      });
  }

  function whenFirebaseSdkReady(cb) {
    if (window.__firebaseSdkReady && window.firebase && window.firebase.firestore) {
      cb();
      return;
    }
    if (window.__firebaseSdkReady === false) {
      cb();
      return;
    }
    var prev = window.__onFirebaseSdkReady;
    window.__onFirebaseSdkReady = function () {
      try { if (typeof prev === 'function') prev(); } catch (e) {}
      cb();
    };
    // Safety timeout — if SDK never loads, proceed anyway after 3s
    setTimeout(cb, 3000);
  }

  /* ─────────────────── Public API ─────────────────── */
  window.EngineData = {
    loadSlides: function (slug, onSlides) {
      var params = new URLSearchParams(window.location.search);
      var shareToken = params.get('share') || '';

      // 1. PDF export → static (Puppeteer, no network)
      if (IS_PDF) {
        console.info('[EngineData] PDF mode — loading content.json');
        return loadFromStatic(onSlides);
      }

      // 2. Share-link viewer → API endpoint (admin SDK bypasses rules)
      if (shareToken) {
        console.info('[EngineData] Share token present — using API endpoint');
        return loadFromApi(slug, shareToken, onSlides, function () {
          loadFromStatic(onSlides);
        });
      }

      // 3. Wait for Firebase SDK, then try live Firestore (auth required by rules),
      //    fall back to API endpoint, then to static.
      whenFirebaseSdkReady(function () {
        if (window.firebase && window.firebase.firestore) {
          tryFirestoreLive(slug, onSlides, function (err) {
            console.info('[EngineData] Firestore unavailable (' + (err && err.message) + ') — trying API');
            loadFromApi(slug, null, onSlides, function () {
              loadFromStatic(onSlides);
            });
          }).catch(function (err) {
            console.info('[EngineData] Live setup failed (' + (err && err.message) + ') — trying API');
            loadFromApi(slug, null, onSlides, function () {
              loadFromStatic(onSlides);
            });
          });
        } else {
          console.warn('[EngineData] Firebase SDK never loaded — trying API');
          loadFromApi(slug, null, onSlides, function () {
            loadFromStatic(onSlides);
          });
        }
      });

      // Return a no-op unsub immediately — the chain above runs async and
      // may swap in a real onSnapshot unsubscribe via repeat onSlides() calls.
      return function () {};
    },
  };
}(window));
