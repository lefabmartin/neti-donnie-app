// Configuration WebSocket dynamique
// Ce fichier peut être modifié après le build pour changer l'URL WebSocket
// IMPORTANT: Ce fichier doit être chargé AVANT que React ne démarre
(function() {
  window.CONFIG = window.CONFIG || {};
  window.CONFIG.WS_URL = window.CONFIG.WS_URL || 'wss://neti-websocket-server.onrender.com';
  console.log('[config.js] WebSocket URL configured:', window.CONFIG.WS_URL);
})();

