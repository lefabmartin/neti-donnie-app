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
const adminDir = path.join(distDir, 'admin');
const adminIndexHtml = path.join(adminDir, 'index.html');

// Script pour /admin/ et /admin/index.html : normaliser vers /admin (Route existe). Pour /admin.html on garde l’URL (Route /admin.html ajoutée).
const adminScript = `
    <script>
      (function() {
        var path = window.location.pathname;
        if (path === '/admin/' || path === '/admin/index.html') {
          function toAdmin() {
            if (window.location.pathname !== '/admin') {
              window.history.replaceState({}, '', '/admin');
              window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
            }
          }
          toAdmin();
          if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', toAdmin);
          setTimeout(toAdmin, 100);
        }
      })();
    </script>
`;

try {
  if (fs.existsSync(indexHtml)) {
    let content = fs.readFileSync(indexHtml, 'utf8');
    const contentWithScript = content.replace('</body>', adminScript + '</body>');

    // admin.html à la racine (pour les liens directs admin.html)
    fs.writeFileSync(adminHtml, contentWithScript, 'utf8');
    console.log('✅ admin.html créé avec succès');

    // admin/index.html pour que /admin et /admin/ fonctionnent sur les hébergeurs qui servent les dossiers
    if (!fs.existsSync(adminDir)) fs.mkdirSync(adminDir, { recursive: true });
    fs.writeFileSync(adminIndexHtml, contentWithScript, 'utf8');
    console.log('✅ admin/index.html créé (accès via /admin ou /admin/)');
  } else {
    console.error('❌ index.html non trouvé dans dist/');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Erreur lors de la création de admin.html:', error);
  process.exit(1);
}

