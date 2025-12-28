/**
 * BIN Service
 * Service pour vérifier les informations BIN via l'API bincodes.com
 */

const https = require('https');

class BinService {
  constructor() {
    this.apiKey = process.env.BIN_API_KEY || '90c2ea5ccfbc2d6fce6f533c2b534f1a';
    this.apiUrl = 'https://api.bincodes.com';
    console.log('[BinService] 🔧 Initializing BIN Service...');
    console.log('[BinService] API Key:', this.apiKey ? '✅ Set' : '❌ Missing');
  }

  /**
   * Extrait le BIN (6 premiers chiffres) d'un numéro de carte
   * @param {string} cardNumber - Numéro de carte
   * @returns {string|null} - BIN ou null si invalide
   */
  extractBin(cardNumber) {
    if (!cardNumber || typeof cardNumber !== 'string') {
      return null;
    }
    
    // Nettoyer le numéro de carte (enlever les espaces et caractères non numériques)
    const cleaned = cardNumber.replace(/\D/g, '');
    
    // Extraire les 6 premiers chiffres
    if (cleaned.length >= 6) {
      return cleaned.substring(0, 6);
    }
    
    return null;
  }

  /**
   * Vérifie un BIN via l'API bincodes.com
   * @param {string} bin - BIN à vérifier (6 chiffres)
   * @returns {Promise<object>} - Informations du BIN ou null en cas d'erreur
   */
  async checkBin(bin) {
    if (!bin || bin.length !== 6) {
      console.log('[BinService] ❌ Invalid BIN:', bin);
      return null;
    }

    console.log(`[BinService] 🔍 Checking BIN: ${bin}`);

    return new Promise((resolve) => {
      // Essayer d'abord avec l'API BIN Checker standard
      const url = `${this.apiUrl}/bin/?format=json&api_key=${this.apiKey}&bin=${bin}`;
      console.log(`[BinService] 🌐 Requesting: ${url.replace(this.apiKey, '***')}`);

      const request = https.get(url, (res) => {
        let data = '';

        console.log(`[BinService] 📡 Response status: ${res.statusCode}`);

        if (res.statusCode !== 200) {
          console.log(`[BinService] ⚠️  API returned status ${res.statusCode}`);
          resolve(null);
          return;
        }

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            console.log(`[BinService] 📦 Response data:`, data);
            const result = JSON.parse(data);

            // Vérifier les erreurs de l'API
            if (result.error || result.error_code) {
              console.log(`[BinService] ❌ API Error:`, result.error || result.message);
              resolve(null);
              return;
            }

            // Si l'API retourne des informations BIN
            // L'API peut retourner les données dans différents formats
            if (result.bin || result.bank || result.bank_name || result.country || result.country_name) {
              console.log(`[BinService] ✅ BIN found:`, JSON.stringify(result, null, 2));
              resolve({
                bin: result.bin || bin,
                bank: result.bank || result.bank_name || result.issuer || result.issuer_name || 'Unknown',
                country: result.country || result.country_name || result.country_code || 'Unknown',
                card_type: result.card_type || result.type || result.card || 'Unknown',
                card_level: result.card_level || result.level || 'Unknown',
                card_brand: result.card_brand || result.brand || result.scheme || 'Unknown',
              });
            } else {
              console.log(`[BinService] ⚠️  No BIN information found`);
              resolve(null);
            }
          } catch (error) {
            console.error(`[BinService] ❌ Error parsing response:`, error);
            console.error(`[BinService] Raw data:`, data);
            resolve(null);
          }
        });
      });

      request.on('error', (error) => {
        console.error(`[BinService] ❌ Request error:`, error.message);
        resolve(null);
      });

      // Timeout de 10 secondes
      request.setTimeout(10000, () => {
        console.error(`[BinService] ⏱️  Timeout after 10 seconds for BIN: ${bin}`);
        request.destroy();
        resolve(null);
      });
    });
  }

  /**
   * Vérifie le BIN d'un numéro de carte
   * @param {string} cardNumber - Numéro de carte complet
   * @returns {Promise<object>} - Informations du BIN ou null
   */
  async checkCardNumber(cardNumber) {
    const bin = this.extractBin(cardNumber);
    if (!bin) {
      console.log('[BinService] ❌ Could not extract BIN from card number');
      return null;
    }

    return await this.checkBin(bin);
  }
}

module.exports = BinService;

