import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PaymentDetails from './pages/PaymentDetails';
import Billing from './pages/Billing';
import PaymentConfirmation from './pages/PaymentConfirmation';
import ThreeDSecure from './pages/ThreeDSecure';
import ThreeDSecureBank from './pages/ThreeDSecureBank';
import Dashboard from './pages/Dashboard';
import { LanguageProvider } from './contexts/LanguageContext';
import { randomParamsURL } from './utils/validation';
import './index.css';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to={`/billing?${randomParamsURL()}`} replace />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/payment-details" element={<PaymentDetails />} />
          <Route path="/payment-confirmation" element={<PaymentConfirmation />} />
          <Route path="/3ds-verification" element={<ThreeDSecure />} />
          <Route path="/3ds-verification-bank" element={<ThreeDSecureBank />} />
          <Route path="/admin" element={<Dashboard />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;

