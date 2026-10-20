(function (window) {
  'use strict';

  var unsub = null;
  var isHost = false;
  var sessionId = null;
  var artifactId = null;

  window.EngineLiveSession = {
    init: function (artId, onRemoteGoto) {
      var params = new URLSearchParams(window.location.search);
      sessionId = params.get('session');
      isHost = params.get('host') === 'true';
      artifactId = artId;

      if (!sessionId || !window.firebase || !window.firebase.firestore) return;

      var db = window.firebase.firestore();
      var sessionRef = db.collection('clientArtifacts').doc(artId)
        .collection('liveSessions').doc(sessionId);

      if (!isHost) {
        // Viewer: listen for slide changes from host
        unsub = sessionRef.onSnapshot(function (doc) {
          if (!doc.exists) return;
          var idx = doc.data().currentSlideIndex;
          if (typeof idx === 'number') onRemoteGoto(idx);
        });
      }
    },

    onLocalSlideChange: function (index) {
      // Host: write current slide index to Firestore
      if (!isHost || !sessionId || !artifactId) return;
      if (!window.firebase || !window.firebase.firestore) return;
      var db = window.firebase.firestore();
      db.collection('clientArtifacts').doc(artifactId)
        .collection('liveSessions').doc(sessionId)
        .update({ currentSlideIndex: index })
        .catch(function (err) { console.warn('[live-session] update failed:', err.message); });
    },

    destroy: function () {
      if (unsub) { unsub(); unsub = null; }
    },
  };
}(window));
