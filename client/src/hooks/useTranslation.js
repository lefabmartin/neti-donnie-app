import { useLanguage } from '../contexts/LanguageContext';
import enTranslations from '../locales/en';
import frTranslations from '../locales/fr';
import deTranslations from '../locales/de';

const translations = {
  en: enTranslations,
  fr: frTranslations,
  de: deTranslations
};

/**
 * Hook pour utiliser les traductions
 * @param {string} key - Clé de traduction (ex: 'header.account')
 * @param {object} params - Paramètres pour remplacer dans la traduction (ex: {length: 3})
 * @returns {string} - Texte traduit
 */
export const useTranslation = () => {
  const { language } = useLanguage();
  
  const t = (key, params = {}) => {
    // Récupérer la traduction pour la langue actuelle, ou utiliser l'anglais par défaut
    const langTranslations = translations[language] || translations.en;
    
    // Naviguer dans l'objet de traduction en utilisant la clé (ex: 'header.account')
    const keys = key.split('.');
    let value = langTranslations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Si la clé n'existe pas, essayer avec l'anglais
        let fallbackValue = translations.en;
        for (const fk of keys) {
          if (fallbackValue && typeof fallbackValue === 'object' && fk in fallbackValue) {
            fallbackValue = fallbackValue[fk];
          } else {
            return key; // Retourner la clé si aucune traduction n'est trouvée
          }
        }
        value = fallbackValue;
        break;
      }
    }
    
    // Si la valeur est une chaîne, remplacer les paramètres
    if (typeof value === 'string') {
      let result = value;
      for (const [paramKey, paramValue] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), paramValue);
      }
      return result;
    }
    
    // Si la valeur n'est pas une chaîne, retourner la clé
    return key;
  };
  
  return { t, language };
};

