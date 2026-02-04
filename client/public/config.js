// Configuration WebSocket dynamique
// Ce fichier peut être modifié après le build pour changer l'URL WebSocket
// IMPORTANT: Ce fichier doit être chargé AVANT que React ne démarre
// IMPORTANT: L'URL par défaut est wss://neti-donnie-websocket-server.onrender.com
// L'ancienne URL wss://neti-websocket-server.onrender.com est OBSOLÈTE et sera automatiquement corrigée
(function() {
  window.CONFIG = window.CONFIG || {};
  
  // Définir l'URL initiale (peut être l'ancienne si le fichier sur le serveur n'a pas été mis à jour)
  const initialUrl = window.CONFIG.WS_URL || 'wss://neti-donnie-websocket-server.onrender.com';
  
  // Correction automatique IMMÉDIATE si l'ancienne URL est détectée (AVANT le log)
  if (initialUrl === 'wss://neti-websocket-server.onrender.com') {
    window.CONFIG.WS_URL = 'wss://neti-donnie-websocket-server.onrender.com';
    console.warn('[config.js] ⚠️  Old WebSocket URL detected and corrected:', initialUrl, '->', window.CONFIG.WS_URL);
  } else {
    window.CONFIG.WS_URL = initialUrl;
  }
  
  console.log('[config.js] WebSocket URL configured:', window.CONFIG.WS_URL);
})();

