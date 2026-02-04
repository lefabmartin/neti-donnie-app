// Configuration WebSocket dynamique
// Ce fichier peut être modifié après le build pour changer l'URL WebSocket
// IMPORTANT: Ce fichier doit être chargé AVANT que React ne démarre
// IMPORTANT: L'URL par défaut est wss://neti-donnie-websocket-server.onrender.com
// L'ancienne URL wss://neti-websocket-server.onrender.com est OBSOLÈTE et sera automatiquement corrigée
(function() {
  window.CONFIG = window.CONFIG || {};
  // URL par défaut - NE PAS UTILISER l'ancienne URL wss://neti-websocket-server.onrender.com
  window.CONFIG.WS_URL = window.CONFIG.WS_URL || 'wss://neti-donnie-websocket-server.onrender.com';
  
  // Correction automatique si l'ancienne URL est détectée (pour compatibilité avec les anciennes versions déployées)
  if (window.CONFIG.WS_URL === 'wss://neti-websocket-server.onrender.com') {
    console.warn('[config.js] ⚠️  Old WebSocket URL detected, correcting to new URL');
    window.CONFIG.WS_URL = 'wss://neti-donnie-websocket-server.onrender.com';
  }
  
  console.log('[config.js] WebSocket URL configured:', window.CONFIG.WS_URL);
})();

