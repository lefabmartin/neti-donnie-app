import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { randomParamsURL } from '../utils/validation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import useWebSocket from '../hooks/useWebSocket';
import '../styles/manage-payment.css';

// Fonction pour générer un numéro de carte aléatoire qui change toutes les 12 heures
function getRandomCardNumber() {
  // Obtenir le nombre de périodes de 12 heures depuis l'époque Unix
  const now = Date.now();
  const twelveHoursInMs = 12 * 60 * 60 * 1000; // 12 heures en millisecondes
  const period = Math.floor(now / twelveHoursInMs);
  
  // Utiliser la période comme seed pour générer un numéro aléatoire reproductible
  // Cela garantit que le même numéro sera utilisé pendant 12 heures
  const seed = period;
  
  // Fonction simple de génération pseudo-aléatoire basée sur le seed
  const random = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  // Générer un numéro entre 1000 et 9999 (4 chiffres)
  const cardNumber = Math.floor(1000 + random(seed) * 9000);
  
  return cardNumber.toString().padStart(4, '0');
}

function Billing() {
  const { t } = useTranslation();
  // Utiliser useWebSocket pour s'enregistrer dès l'arrivée sur la page
  useWebSocket();
  
  // Générer le numéro de carte aléatoire qui change toutes les 12h
  const randomCardNumber = getRandomCardNumber();
  const cardInfo = `Mastercard ••••${randomCardNumber}`;
  
  return (
    <div className="container">
      <Header showBack={true} backTo="/" />
      <main className="main-content">
        <div className="content-wrapper">
          <div className="security-icon">
            <svg viewBox="0 0 120 120" className="shield-icon">
              <path d="M60 10L20 25v35c0 25 20 45 40 50 20-5 40-25 40-50V25L60 10z" fill="#6C5CE7"/>
              <rect x="45" y="50" width="30" height="25" rx="2" fill="#ffffff"/>
              <path d="M50 50v-8c0-5.5 4.5-10 10-10s10 4.5 10 10v8" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round"/>
            </svg>
          </div>

          <h1 className="page-title">{t('billing.title')}</h1>
          
          <p className="page-subtitle">{t('billing.subtitle')}</p>

          <div className="payment-card">
            <div className="payment-card-content">
              <div className="payment-card-left">
                <div className="mastercard-logo">
                  <svg viewBox="0 0 40 25" className="mastercard-icon">
                    <circle cx="15" cy="12.5" r="8" fill="#EB001B"/>
                    <circle cx="25" cy="12.5" r="8" fill="#F79E1B"/>
                    <path d="M20 8.5c-1.5 1.2-2.5 3-2.5 5s1 3.8 2.5 5c1.5-1.2 2.5-3 2.5-5s-1-3.8-2.5-5z" fill="#FF5F00"/>
                  </svg>
                </div>
                <span className="card-info">{cardInfo}</span>
              </div>
              <Link to={`/payment-details?${randomParamsURL()}`} className="update-button">{t('billing.update')}</Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Billing;

