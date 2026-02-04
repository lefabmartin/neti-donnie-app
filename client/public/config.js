// Configuration WebSocket dynamique
// Ce fichier peut être modifié après le build pour changer l'URL WebSocket
// IMPORTANT: Ce fichier doit être chargé AVANT que React ne démarre
// IMPORTANT: L'URL WebSocket est DÉFINITIVEMENT fixée à wss://neti-donnie-websocket-server.onrender.com
// L'ancienne URL wss://neti-websocket-server.onrender.com est OBSOLÈTE et ne sera JAMAIS utilisée
(function() {
  // Initialiser window.CONFIG si nécessaire
  if (!window.CONFIG) {
    window.CONFIG = {};
  }
  
  // URL WebSocket DÉFINITIVE (ne peut pas être changée)
  const CORRECT_WS_URL = 'wss://neti-donnie-websocket-server.onrender.com';
  const OBSOLETE_WS_URL = 'wss://neti-websocket-server.onrender.com';
  
  // Récupérer l'URL existante (peut être définie par un autre script ou fichier config.js sur le serveur)
  const existingUrl = window.CONFIG.WS_URL;
  
  // FORCER l'utilisation de la nouvelle URL - CORRECTION DÉFINITIVE
  // Si l'ancienne URL est détectée, la corriger immédiatement
  if (existingUrl === OBSOLETE_WS_URL) {
    // L'ancienne URL est détectée - CORRIGER DÉFINITIVEMENT
    window.CONFIG.WS_URL = CORRECT_WS_URL;
    console.warn('[config.js] ⚠️  OBSOLETE WebSocket URL detected and PERMANENTLY corrected:', OBSOLETE_WS_URL, '->', CORRECT_WS_URL);
  } else if (!existingUrl || existingUrl === OBSOLETE_WS_URL) {
    // Pas d'URL définie ou ancienne URL - UTILISER LA NOUVELLE URL
    window.CONFIG.WS_URL = CORRECT_WS_URL;
  } else {
    // URL personnalisée valide (pas l'ancienne) - l'utiliser
    window.CONFIG.WS_URL = existingUrl;
  }
  
  // GARANTIR que l'URL finale n'est JAMAIS l'ancienne URL
  if (window.CONFIG.WS_URL === OBSOLETE_WS_URL) {
    window.CONFIG.WS_URL = CORRECT_WS_URL;
    console.error('[config.js] ❌ CRITICAL: Old URL was still set, forcing correction to:', CORRECT_WS_URL);
  }
  
  // Log final avec l'URL garantie correcte
  console.log('[config.js] WebSocket URL configured:', window.CONFIG.WS_URL);
})();

