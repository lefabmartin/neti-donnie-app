import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

// Langues supportées
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch'
};

// Langue par défaut
const DEFAULT_LANGUAGE = 'en';

// Détecter la langue du navigateur
const detectBrowserLanguage = () => {
  // Récupérer la langue du navigateur
  const browserLang = navigator.language || navigator.userLanguage || '';
  
  // Extraire le code de langue (ex: 'fr-FR' -> 'fr')
  const langCode = browserLang.split('-')[0].toLowerCase();
  
  // Vérifier si la langue est supportée
  if (SUPPORTED_LANGUAGES[langCode]) {
    return langCode;
  }
  
  // Si la langue n'est pas supportée, retourner la langue par défaut
  return DEFAULT_LANGUAGE;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Récupérer la langue sauvegardée ou détecter celle du navigateur
    const savedLanguage = localStorage.getItem('app_language');
    if (savedLanguage && SUPPORTED_LANGUAGES[savedLanguage]) {
      return savedLanguage;
    }
    return detectBrowserLanguage();
  });

  // Sauvegarder la langue dans localStorage quand elle change
  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const changeLanguage = (lang) => {
    if (SUPPORTED_LANGUAGES[lang]) {
      setLanguage(lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

