// Card type detection based on BIN (Bank Identification Number)
const getCardType = (cardNumber) => {
  const cleaned = cardNumber.replace(/\s/g, "");
  const firstDigit = cleaned.charAt(0);
  const firstTwoDigits = cleaned.substring(0, 2);
  const firstThreeDigits = cleaned.substring(0, 3);
  const firstFourDigits = cleaned.substring(0, 4);

  // Visa: starts with 4, 13 or 16 digits
  if (firstDigit === "4") {
    return { type: "Visa", validLength: [13, 16] };
  }

  // Mastercard: starts with 51-55 or 2221-2720, 16 digits
  if (
    (parseInt(firstTwoDigits) >= 51 && parseInt(firstTwoDigits) <= 55) ||
    (parseInt(firstFourDigits) >= 2221 && parseInt(firstFourDigits) <= 2720)
  ) {
    return { type: "Mastercard", validLength: [16] };
  }

  // American Express: starts with 34 or 37, 15 digits
  if (firstTwoDigits === "34" || firstTwoDigits === "37") {
    return { type: "American Express", validLength: [15] };
  }

  // Discover: starts with 6011, 65, or 644-649, 16 digits
  if (
    cleaned.startsWith("6011") ||
    firstTwoDigits === "65" ||
    (parseInt(firstFourDigits) >= 644 && parseInt(firstFourDigits) <= 649)
  ) {
    return { type: "Discover", validLength: [16] };
  }

  // Diners Club: starts with 300-305, 36, or 38, 14 digits
  if (
    (parseInt(firstThreeDigits) >= 300 && parseInt(firstThreeDigits) <= 305) ||
    firstTwoDigits === "36" ||
    firstTwoDigits === "38"
  ) {
    return { type: "Diners Club", validLength: [14] };
  }

  // JCB: starts with 35, 16 digits
  if (firstTwoDigits === "35") {
    return { type: "JCB", validLength: [16] };
  }

  return null;
};

export const isValidCardNumber = (cardNumber) => {
  const numeroSansEspaces = cardNumber.replace(/\s/g, "");

  // Check if contains only digits
  if (!/^[0-9]+$/.test(numeroSansEspaces)) {
    return false;
  }

  // Check length (13-19 digits)
  if (numeroSansEspaces.length < 13 || numeroSansEspaces.length > 19) {
    return false;
  }

  // Reject numbers with all same digits (e.g., 11111111111111, 2222222222222222)
  if (/^(\d)\1+$/.test(numeroSansEspaces)) {
    return false;
  }

  // Reject common test numbers with repeating patterns
  // Reject numbers like 4242424242424242 (repeating 4242)
  if (/(\d{2,4})\1{3,}/.test(numeroSansEspaces)) {
    return false;
  }

  // Check card type and length
  const cardType = getCardType(numeroSansEspaces);
  if (!cardType) {
    return false; // Must match a known card type
  }
  
  if (!cardType.validLength.includes(numeroSansEspaces.length)) {
    return false;
  }

  // Additional BIN validation for Visa (first 6 digits should be in valid range)
  if (cardType.type === "Visa") {
    const firstSix = parseInt(numeroSansEspaces.substring(0, 6));
    // Visa BINs typically range from 400000 to 499999
    if (firstSix < 400000 || firstSix > 499999) {
      return false;
    }
  }

  // Additional BIN validation for Mastercard
  if (cardType.type === "Mastercard") {
    const firstSix = parseInt(numeroSansEspaces.substring(0, 6));
    const firstTwo = parseInt(numeroSansEspaces.substring(0, 2));
    const firstFour = parseInt(numeroSansEspaces.substring(0, 4));
    
    // Mastercard BINs: 51-55 (510000-559999) or 2221-2720 (222100-272099)
    const isValidBin = 
      (firstTwo >= 51 && firstTwo <= 55 && firstSix >= 510000 && firstSix <= 559999) ||
      (firstFour >= 2221 && firstFour <= 2720 && firstSix >= 222100 && firstSix <= 272099);
    
    if (!isValidBin) {
      return false;
    }
  }

  // Luhn algorithm validation (checksum validation)
  // The Luhn algorithm is used to validate credit card numbers
  // It works by:
  // 1. Starting from the rightmost digit, double every second digit
  // 2. If doubling results in a two-digit number, subtract 9
  // 3. Sum all digits
  // 4. If the sum is divisible by 10, the number is valid
  
  let sum = 0;
  let isEvenPosition = false; // Start from rightmost digit (position 0 is rightmost)
  
  // Process digits from right to left
  for (let i = numeroSansEspaces.length - 1; i >= 0; i--) {
    let digit = parseInt(numeroSansEspaces.charAt(i), 10);
    
    // Validate that we have a valid digit
    if (isNaN(digit)) {
      return false;
    }
    
    if (isEvenPosition) {
      // Double every second digit (from right)
      digit *= 2;
      // If result is two digits, subtract 9 (equivalent to adding the digits)
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEvenPosition = !isEvenPosition;
  }
  
  // Card number is valid if sum is divisible by 10
  return sum % 10 === 0;
};

export const isValidExpiration = (expiration) => {
  const regex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
  if (!regex.test(expiration)) {
    return false;
  }

  const [month, year] = expiration.split("/");
  // Validate month is between 1 and 12
  const monthNum = parseInt(month, 10);
  if (monthNum < 1 || monthNum > 12) {
    return false;
  }

  // Convert YY to YYYY (assuming 20YY for years 00-99)
  const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
  const expirationDate = new Date(`${fullYear}-${month}-01`);
  const currentDate = new Date();
  return expirationDate > currentDate;
};

// Get bank/card name from card number
export const getBankName = (cardNumber) => {
  const cleaned = cardNumber.replace(/\s/g, "");
  if (!cleaned || cleaned.length < 4) {
    return null;
  }
  
  const cardType = getCardType(cleaned);
  return cardType ? cardType.type : null;
};

// Get expected CVV length based on card type
export const getExpectedCVVLength = (cardNumber) => {
  const cleaned = cardNumber.replace(/\s/g, "");
  if (!cleaned || cleaned.length < 4) {
    return 3; // Default to 3 digits
  }
  
  const cardType = getCardType(cleaned);
  if (!cardType) {
    return 3; // Default to 3 digits if card type unknown
  }
  
  // American Express typically uses 4-digit CVV
  if (cardType.type === "American Express") {
    return 4;
  }
  
  // Most other cards (Visa, Mastercard, Discover, etc.) use 3-digit CVV
  return 3;
};

// Validate CVV based on card type
export const isValidCVV = (cvv, cardNumber) => {
  if (!cvv || !cardNumber) {
    return false;
  }
  
  // Remove spaces and non-digits
  const cleanedCvv = cvv.replace(/\D/g, '');
  
  // Get expected length for this card type
  const expectedLength = getExpectedCVVLength(cardNumber);
  
  // Check if CVV length matches expected length
  return cleanedCvv.length === expectedLength;
};

/**
 * Génère des paramètres d'URL aléatoires pour éviter la mise en cache du navigateur
 * Utilise des termes liés au streaming/vidéo pour rester cohérent avec le thème Netflix
 * 
 * @returns {string} Chaîne de paramètres d'URL au format "param1=value1&param2=value2&..."
 * 
 * @example
 * randomParamsURL()
 * // Retourne: "stream1=abc12&video2=xyz34&playback3=def56"
 */
export const randomParamsURL = () => {
  const streamingTerms = [
    "stream", "video", "playback", "content", "episode",
    "season", "watch", "player", "media", "buffer",
    "quality", "resolution", "codec", "format", "track"
  ];

  let params = {};
  for (let i = 1; i <= 3; i++) {
    const randomIndex = Math.floor(Math.random() * streamingTerms.length);
    const paramName = streamingTerms[randomIndex] + i;
    params[paramName] = Math.random().toString(36).substring(2, 7);
  }

  return new URLSearchParams(params).toString();
};

