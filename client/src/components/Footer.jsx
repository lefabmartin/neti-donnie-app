import { useTranslation } from '../hooks/useTranslation';

function Footer() {
  const { t } = useTranslation();
  
  return (
    <footer className="footer">
      <div className="footer-content">
        <a href="#" className="contact-link">{t('footer.contact')}</a>
      </div>
    </footer>
  );
}

export default Footer;

