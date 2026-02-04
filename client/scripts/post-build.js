#!/usr/bin/env node

/**
 * Script post-build pour créer admin.html
 * Ce fichier permet d'accéder à /admin même si le serveur ne redirige pas les routes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '..', 'dist');
const indexHtml = path.join(distDir, 'index.html');
const adminHtml = path.join(distDir, 'admin.html');

try {
  if (fs.existsSync(indexHtml)) {
    let content = fs.readFileSync(indexHtml, 'utf8');
    
    // Ajouter un script pour forcer la navigation vers /admin si on est sur /admin.html
    const adminScript = `
    <script>
      // Forcer la navigation vers /admin après le chargement de React Router
      (function() {
        const currentPath = window.location.pathname;
        if (currentPath === '/admin.html' || currentPath === '/admin.html/') {
          // Attendre que React Router soit chargé, puis naviguer vers /admin
          function navigateToAdmin() {
            if (window.location.pathname !== '/admin') {
              window.history.replaceState({}, '', '/admin');
              // Déclencher un événement popstate pour que React Router détecte le changement
              window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
            }
          }
          
          // Essayer immédiatement
          navigateToAdmin();
          
          // Réessayer après le chargement du DOM
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', navigateToAdmin);
          }
          
          // Réessayer après un court délai pour laisser React Router s'initialiser
          setTimeout(navigateToAdmin, 100);
        }
      })();
    </script>
    `;
    
    // Insérer le script avant la fermeture de </body>
    content = content.replace('</body>', adminScript + '</body>');
    
    // Créer admin.html à la racine pour gérer /admin
    fs.writeFileSync(adminHtml, content, 'utf8');
    console.log('✅ admin.html créé avec succès');
  } else {
    console.error('❌ index.html non trouvé dans dist/');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Erreur lors de la création de admin.html:', error);
  process.exit(1);
}

