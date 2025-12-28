# 🔧 Fix pour /admin sur Apache

## Problème
- `https://netflixapp.webusrer.info/admin` retourne **404 Not Found**
- Le serveur est Apache

## ✅ Solutions

### Solution 1 : Vérifier que .htaccess est activé

Le fichier `.htaccess` est inclus dans le build, mais Apache doit avoir `AllowOverride` activé.

#### Via cPanel/aaPanel :
1. Allez dans **File Manager** (Gestionnaire de fichiers)
2. Naviguez vers le dossier de votre site (où se trouve `index.html`)
3. Vérifiez que le fichier `.htaccess` est présent
4. Si absent, téléchargez-le depuis le dossier `dist/` de votre build

#### Via SSH :
```bash
# Vérifier que .htaccess existe
ls -la /chemin/vers/votre/site/.htaccess

# Si absent, copiez-le
cp /chemin/vers/dist/.htaccess /chemin/vers/votre/site/
```

### Solution 2 : Vérifier la configuration Apache

La configuration Apache doit avoir `AllowOverride All` :

```apache
<Directory "/chemin/vers/votre/site">
    AllowOverride All
    Require all granted
</Directory>
```

#### Via cPanel/aaPanel :
1. Allez dans **Apache Configuration** ou **.htaccess Editor**
2. Vérifiez que `AllowOverride` est activé

#### Via SSH (si vous avez accès root) :
```bash
# Éditer la configuration Apache
sudo nano /etc/apache2/apache2.conf
# ou
sudo nano /etc/httpd/conf/httpd.conf

# Chercher le bloc Directory et ajouter/modifier :
<Directory "/chemin/vers/votre/site">
    AllowOverride All
    Require all granted
</Directory>

# Redémarrer Apache
sudo systemctl restart apache2
# ou
sudo service httpd restart
```

### Solution 3 : Vérifier le contenu de .htaccess

Le fichier `.htaccess` dans votre dossier de site doit contenir :

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Ne pas rediriger les fichiers existants
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  
  # Route spécifique pour /admin
  RewriteRule ^admin$ /index.html [L]
  
  # Rediriger tout le reste vers index.html
  RewriteRule ^ index.html [L]
</IfModule>

Options -MultiViews
```

### Solution 4 : Utiliser admin.html (solution immédiate)

En attendant de configurer Apache, utilisez :
- `https://netflixapp.webusrer.info/admin.html` ✅

Cette solution fonctionne immédiatement sans configuration.

## 🔍 Vérifications

1. **Le fichier .htaccess existe-t-il ?**
   ```bash
   ls -la /chemin/vers/votre/site/.htaccess
   ```

2. **Les permissions sont-elles correctes ?**
   ```bash
   chmod 644 .htaccess
   ```

3. **Le module mod_rewrite est-il activé ?**
   ```bash
   # Vérifier
   apache2ctl -M | grep rewrite
   # ou
   httpd -M | grep rewrite
   
   # Activer si nécessaire
   sudo a2enmod rewrite
   sudo systemctl restart apache2
   ```

4. **Vérifier les logs d'erreur Apache**
   ```bash
   tail -f /var/log/apache2/error.log
   # ou
   tail -f /var/log/httpd/error_log
   ```

## 📝 Configuration .htaccess complète

Si vous devez recréer le fichier `.htaccess`, voici la version complète :

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Ne pas rediriger les fichiers existants
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  
  # Route spécifique pour /admin
  RewriteRule ^admin$ /index.html [L]
  
  # Rediriger tout le reste vers index.html
  RewriteRule ^ index.html [L]
</IfModule>

Options -MultiViews
```

## ⚠️ Problèmes courants

1. **404 toujours présent**
   - Vérifiez que `.htaccess` est dans le bon dossier (même dossier que `index.html`)
   - Vérifiez que `AllowOverride All` est activé
   - Vérifiez que `mod_rewrite` est activé

2. **Erreur 500 Internal Server Error**
   - Vérifiez la syntaxe de `.htaccess`
   - Vérifiez les logs d'erreur Apache
   - Vérifiez que `mod_rewrite` est activé

3. **.htaccess ignoré**
   - Vérifiez que `AllowOverride All` est dans la configuration Apache
   - Vérifiez que vous êtes dans le bon répertoire
   - Redémarrez Apache après modification

## 🚀 Après correction

Testez :
- `https://netflixapp.webusrer.info/admin` devrait maintenant fonctionner ✅
- `https://netflixapp.webusrer.info/` devrait rediriger vers `/billing` ✅

