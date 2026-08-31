(function (window) {
  'use strict';

  var SESSION_ID = null;
  var ARTIFACT_ID = null;
  var ANONYMOUS_ID = null;
  var slidesViewed = [];
  var currentSlideEntry = null;
  var flushTimer = null;

  function getOrCreateAnonId() {
    try {
      var id = localStorage.getItem('aw_anon_id');
      if (!id) {
        id = 'anon-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
        localStorage.setItem('aw_anon_id', id);
      }
      return id;
    } catch (e) { return 'anon-' + Math.random().toString(36).slice(2); }
  }

  function flush(final) {
    if (!ARTIFACT_ID || !ANONYMOUS_ID) return;
    if (currentSlideEntry) {
      currentSlideEntry.dwellMs = Date.now() - currentSlideEntry._startTs;
      slidesViewed.push({
        index: currentSlideEntry.index,
        layout: currentSlideEntry.layout,
        enteredAt: new Date(currentSlideEntry._startTs).toISOString(),
        dwellMs: currentSlideEntry.dwellMs,
      });
      if (!final) currentSlideEntry = null;
    }
    if (!slidesViewed.length) return;

    var params = new URLSearchParams(window.location.search);
    var payload = {
      artifactId: ARTIFACT_ID,
      artifactSlug: window.__engineSlug || '',
      anonymousId: ANONYMOUS_ID,
      sessionId: params.get('session') || null,
      sharedLinkId: params.get('share') || null,
      startedAt: new Date(SESSION_ID).toISOString(),
      endedAt: final ? new Date().toISOString() : null,
      totalDwellMs: slidesViewed.reduce(function (a, s) { return a + (s.dwellMs || 0); }, 0),
      slidesViewed: slidesViewed.slice(),
      referrer: document.referrer || null,
      userAgent: navigator.userAgent,
    };

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/strategies/track-view', JSON.stringify(payload));
      } else {
        fetch('/api/strategies/track-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(function () {});
      }
    } catch (e) { /* ignore */ }

    if (!final) slidesViewed = [];
  }

  window.EngineAnalytics = {
    init: function (artifactId) {
      ARTIFACT_ID = artifactId;
      ANONYMOUS_ID = getOrCreateAnonId();
      SESSION_ID = Date.now();
      // Flush every 30s and on page exit
      flushTimer = setInterval(function () { flush(false); }, 30000);
      window.addEventListener('beforeunload', function () { flush(true); });
      window.addEventListener('pagehide', function () { flush(true); });
    },
    onSlideEnter: function (index, layout) {
      if (currentSlideEntry) {
        currentSlideEntry.dwellMs = Date.now() - currentSlideEntry._startTs;
        slidesViewed.push({
          index: currentSlideEntry.index,
          layout: currentSlideEntry.layout,
          enteredAt: new Date(currentSlideEntry._startTs).toISOString(),
          dwellMs: currentSlideEntry.dwellMs,
        });
      }
      currentSlideEntry = { index: index, layout: layout, _startTs: Date.now() };
    },
  };
}(window));
