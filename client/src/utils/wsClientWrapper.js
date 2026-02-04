// Wrapper pour adapter globalWebSocket au format attendu par Dashboard
// Ce wrapper expose window.wsClient avec une interface compatible

let wsClientWrapper = null;
let eventListeners = new Map(); // Map<eventName, Set<callbacks>>
let ws = null; // WebSocket instance globale
let reconnectTimeout = null; // Timeout pour la reconnexion
let reconnectAttempts = 0; // Nombre de tentatives de reconnexion
const MAX_RECONNECT_ATTEMPTS = 10; // Nombre maximum de tentatives
const RECONNECT_DELAY = 3000; // Délai entre les tentatives (3 secondes)

// Fonction pour obtenir ou créer le wrapper
function getWsClientWrapper() {
  if (wsClientWrapper) {
    return wsClientWrapper;
  }

  // Importer globalWebSocket depuis useWebSocket
  // Note: On doit accéder à globalWebSocket via le module useWebSocket
  // Pour cela, on va créer une connexion WebSocket dédiée pour le dashboard
  
  // En production, utiliser toujours window.CONFIG.WS_URL ou une URL par défaut
  // Ne jamais utiliser localhost en production
  const getWebSocketUrl = () => {
    if (window.CONFIG?.WS_URL) {
      return window.CONFIG.WS_URL;
    }
    if (import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL;
    }
    // En production, utiliser l'URL par défaut, pas localhost
    if (window.location.protocol === 'https:') {
      return 'wss://neti-donnie-websocket-server.onrender.com';
    }
    // Seulement en développement local
    return 'ws://localhost:8080';
  };
  const wsUrl = getWebSocketUrl();
  let isConnected = false;
  let clientId = null;

  // Créer une connexion WebSocket dédiée pour le dashboard
  const connect = (url) => {
    // Réutiliser la connexion existante si elle est ouverte
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('[wsClientWrapper] Already connected, reusing existing connection');
      return;
    }

    // Attendre si la connexion est en cours
    if (ws && ws.readyState === WebSocket.CONNECTING) {
      console.log('[wsClientWrapper] Connection already in progress, waiting...');
      return;
    }

    // Fermer l'ancienne connexion si elle existe et est fermée
    if (ws && ws.readyState === WebSocket.CLOSED) {
      console.log('[wsClientWrapper] Old connection closed, creating new one');
      ws = null;
    }

    console.log('[wsClientWrapper] Connecting to:', url);
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('[wsClientWrapper] WebSocket connected (waiting for welcome message)');
      isConnected = true;
      reconnectAttempts = 0; // Réinitialiser le compteur de tentatives en cas de succès
      // Ne pas émettre 'connected' ici - attendre le message 'welcome'
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[wsClientWrapper] Message received:', data.type, data);
        
        // Émettre les événements spécifiques
        if (data.type === 'welcome') {
          clientId = data.clientId;
          console.log('[wsClientWrapper] ✅ Welcome message received, clientId:', clientId);
          console.log('[wsClientWrapper] ✅ Emitting connected event now');
          emit('connected');
        } else if (data.type === 'registered') {
          clientId = data.clientId;
          console.log('[wsClientWrapper] ✅ Registered, clientId:', clientId);
          emit('registered', data);
        } else if (data.type === 'clients') {
          emit('clients', data);
        } else if (data.type === 'client_registered') {
          emit('client_registered', data);
        } else if (data.type === 'client_updated') {
          emit('client_updated', data);
        } else if (data.type === 'client_disconnected') {
          emit('client_disconnected', data);
        }
        
        // Émettre un événement générique 'message'
        emit('message', data);
      } catch (error) {
        console.error('[wsClientWrapper] Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[wsClientWrapper] WebSocket error:', error);
      isConnected = false;
      emit('error', error);
    };

    ws.onclose = (event) => {
      console.log('[wsClientWrapper] WebSocket closed', event.code, event.reason);
      isConnected = false;
      emit('close');
      
      // Tentative de reconnexion automatique (sauf si c'est une fermeture intentionnelle)
      // Code 1000 = fermeture normale, on ne reconnecte pas automatiquement
      // Code 1001 = going away, on reconnecte
      // Code 1006 = connexion fermée anormalement, on reconnecte
      if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = RECONNECT_DELAY * Math.min(reconnectAttempts, 5); // Augmenter le délai progressivement
        console.log(`[wsClientWrapper] ⏳ Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        
        reconnectTimeout = setTimeout(() => {
          if (!ws || ws.readyState === WebSocket.CLOSED) {
            console.log(`[wsClientWrapper] 🔄 Reconnecting... (attempt ${reconnectAttempts})`);
            connect(url || wsUrl);
          }
        }, delay);
      } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('[wsClientWrapper] ❌ Max reconnect attempts reached. Stopping reconnection.');
      } else {
        console.log('[wsClientWrapper] ⚠️  Normal closure (code 1000), not reconnecting automatically');
      }
    };
  };

  const emit = (eventName, ...args) => {
    const listeners = eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`[wsClientWrapper] Error in ${eventName} listener:`, error);
        }
      });
    }
  };

  wsClientWrapper = {
    connect(url) {
      connect(url || wsUrl);
    },
    
    register(role) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        const message = {
          type: 'register',
          role: role,
          page: window.location.pathname
        };
        console.log('[wsClientWrapper] Registering as:', role);
        ws.send(JSON.stringify(message));
      } else {
        console.warn('[wsClientWrapper] Cannot register - WebSocket not open');
      }
    },
    
    send(message) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        console.log('[wsClientWrapper] 📤 Sending message:', messageStr);
        console.log('[wsClientWrapper] 📤 WebSocket readyState:', ws.readyState);
        ws.send(messageStr);
        console.log('[wsClientWrapper] ✅ Message sent successfully');
        return true;
      } else {
        console.warn('[wsClientWrapper] Cannot send - WebSocket not open, readyState:', ws?.readyState);
        return false;
      }
    },
    
    on(eventName, callback) {
      if (!eventListeners.has(eventName)) {
        eventListeners.set(eventName, new Set());
      }
      eventListeners.get(eventName).add(callback);
    },
    
    off(eventName, callback) {
      const listeners = eventListeners.get(eventName);
      if (listeners) {
        listeners.delete(callback);
      }
    }
  };

  // Mettre à jour isConnected via un getter
  Object.defineProperty(wsClientWrapper, 'isConnected', {
    get() {
      return ws && ws.readyState === WebSocket.OPEN;
    },
    configurable: true
  });

  return wsClientWrapper;
}

// Exposer sur window pour que Dashboard puisse l'utiliser
if (typeof window !== 'undefined') {
  // Fonction pour initialiser et connecter
  const initAndConnect = () => {
    // Initialiser le wrapper
    if (!window.wsClient) {
      window.wsClient = getWsClientWrapper();
    }
    
    // Connecter automatiquement si pas déjà connecté
    if (!window.wsClient.isConnected) {
      // En production, utiliser toujours window.CONFIG.WS_URL ou une URL par défaut
      // Ne jamais utiliser localhost en production
      // CORRIGER automatiquement l'ancienne URL si détectée
      const getWebSocketUrl = () => {
        let url = null;
        
        if (window.CONFIG?.WS_URL) {
          url = window.CONFIG.WS_URL;
          // CORRIGER l'ancienne URL automatiquement
          if (url === 'wss://neti-websocket-server.onrender.com') {
            console.warn('[wsClientWrapper] ⚠️  Old WebSocket URL detected, correcting to new URL');
            url = 'wss://neti-donnie-websocket-server.onrender.com';
            // Mettre à jour window.CONFIG pour éviter de re-vérifier
            window.CONFIG.WS_URL = url;
          }
          return url;
        }
        
        if (import.meta.env.VITE_WS_URL) {
          url = import.meta.env.VITE_WS_URL;
          // CORRIGER l'ancienne URL automatiquement
          if (url === 'wss://neti-websocket-server.onrender.com') {
            console.warn('[wsClientWrapper] ⚠️  Old WebSocket URL detected in env, correcting to new URL');
            url = 'wss://neti-donnie-websocket-server.onrender.com';
          }
          return url;
        }
        
        // En production, utiliser l'URL par défaut, pas localhost
        if (window.location.protocol === 'https:') {
          return 'wss://neti-donnie-websocket-server.onrender.com';
        }
        // Seulement en développement local
        return 'ws://localhost:8080';
      };
      const wsUrl = getWebSocketUrl();
      console.log('[wsClientWrapper] Initializing with WebSocket URL:', wsUrl);
      console.log('[wsClientWrapper] window.CONFIG:', window.CONFIG);
      window.wsClient.connect(wsUrl);
    }
  };
  
  // Attendre que config.js soit chargé
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Attendre un peu plus pour que config.js soit chargé
      setTimeout(initAndConnect, 50);
    });
  } else {
    // DOM déjà chargé, attendre un peu pour config.js
    setTimeout(initAndConnect, 50);
  }
}

export default getWsClientWrapper;

