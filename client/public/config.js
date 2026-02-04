// Configuration WebSocket dynamique
// Ce fichier peut être modifié après le build pour changer l'URL WebSocket
// IMPORTANT: Ce fichier doit être chargé AVANT que React ne démarre
// IMPORTANT: L'URL par défaut est wss://neti-donnie-websocket-server.onrender.com
// L'ancienne URL wss://neti-websocket-server.onrender.com est OBSOLÈTE et sera automatiquement corrigée
(function() {
  // Initialiser window.CONFIG si nécessaire
  if (!window.CONFIG) {
    window.CONFIG = {};
  }
  
  // Récupérer l'URL existante (peut être définie par un autre script ou fichier config.js sur le serveur)
  const existingUrl = window.CONFIG.WS_URL;
  
  // URL par défaut (nouvelle URL)
  const defaultUrl = 'wss://neti-donnie-websocket-server.onrender.com';
  const oldUrl = 'wss://neti-websocket-server.onrender.com';
  
  // Déterminer l'URL à utiliser
  let finalUrl;
  if (existingUrl === oldUrl) {
    // Correction automatique si l'ancienne URL est détectée
    finalUrl = defaultUrl;
    console.warn('[config.js] ⚠️  Old WebSocket URL detected and corrected:', oldUrl, '->', defaultUrl);
  } else if (existingUrl && existingUrl !== oldUrl) {
    // Utiliser l'URL existante si elle est valide (pas l'ancienne)
    finalUrl = existingUrl;
  } else {
    // Utiliser l'URL par défaut
    finalUrl = defaultUrl;
  }
  
  // Définir l'URL finale (toujours la nouvelle URL ou une URL valide)
  window.CONFIG.WS_URL = finalUrl;
  
  console.log('[config.js] WebSocket URL configured:', window.CONFIG.WS_URL);
})();

