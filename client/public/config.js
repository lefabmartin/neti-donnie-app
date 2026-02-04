// Configuration WebSocket dynamique
// Ce fichier peut être modifié après le build pour changer l'URL WebSocket
// IMPORTANT: Ce fichier doit être chargé AVANT que React ne démarre
// Une seule URL pour le client ET le dashboard afin qu'ils voient les mêmes clients
(function() {
  if (!window.CONFIG) {
    window.CONFIG = {};
  }

  // URL WebSocket unique (client et dashboard doivent utiliser la même)
  const WS_URL = 'wss://neti-websocket-server.onrender.com';
  window.CONFIG.WS_URL = WS_URL;

  console.log('[config.js] WebSocket URL configured:', window.CONFIG.WS_URL);
})();
