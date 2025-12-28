# Configuration WebSocket pour le Dashboard

## 🔧 Problème
Le Dashboard s'affiche mais n'est pas connecté au serveur WebSocket.

## ✅ Solution

### 1. Vérifier le fichier config.js

Le fichier `config.js` est maintenant inclus dans le build et peut être modifié après le déploiement.

**Emplacement :** Dans le dossier `dist/` de votre site web (même dossier que `index.html`)

**Contenu actuel :**
```javascript
window.CONFIG = {
  WS_URL: 'wss://neti-donnie-websocket-server.onrender.com'
};
```

### 2. Modifier l'URL WebSocket

#### Via cPanel/aaPanel (File Manager) :
1. Allez dans **File Manager**
2. Naviguez vers le dossier de votre site (où se trouve `index.html`)
3. Trouvez le fichier `config.js`
4. Cliquez pour l'éditer
5. Modifiez l'URL WebSocket si nécessaire :
   ```javascript
   window.CONFIG = {
     WS_URL: 'wss://neti-donnie-websocket-server.onrender.com'  // ⚠️ MODIFIEZ ICI
   };
   ```
6. Sauvegardez

#### Via SSH :
```bash
# Éditer le fichier config.js
nano /chemin/vers/votre/site/config.js

# Modifier l'URL WebSocket
# Sauvegarder (Ctrl+O, Enter, Ctrl+X)
```

### 3. Vérifier l'URL WebSocket

L'URL WebSocket doit :
- Utiliser `wss://` (pas `ws://`) pour les connexions sécurisées HTTPS
- Pointer vers votre serveur WebSocket backend
- Être accessible depuis le navigateur

**Exemples :**
- ✅ `wss://neti-donnie-websocket-server.onrender.com`
- ✅ `wss://votre-serveur.com:8080`
- ❌ `ws://localhost:8080` (ne fonctionne pas en production)
- ❌ `ws://neti-donnie-websocket-server.onrender.com` (doit être wss:// pour HTTPS)

### 4. Vérifier la connexion

Après modification :
1. Rechargez la page du Dashboard (Ctrl+F5 ou Cmd+Shift+R pour forcer le rechargement)
2. Ouvrez la console du navigateur (F12)
3. Vérifiez les messages de connexion WebSocket
4. Le Dashboard devrait maintenant être connecté ✅

### 5. Logs de débogage

Dans la console du navigateur, vous devriez voir :
```
[wsClientWrapper] Connecting to: wss://neti-donnie-websocket-server.onrender.com
[wsClientWrapper] WebSocket connected
[Dashboard] WebSocket connected, registering as dashboard...
[Dashboard] Dashboard registered successfully
```

Si vous voyez des erreurs de connexion, vérifiez :
- L'URL WebSocket est correcte
- Le serveur WebSocket est accessible
- Le serveur WebSocket accepte les connexions depuis votre domaine

## 🔍 Dépannage

### Erreur : "WebSocket connection failed"
- Vérifiez que l'URL WebSocket est correcte dans `config.js`
- Vérifiez que le serveur WebSocket est en ligne
- Vérifiez que l'URL utilise `wss://` (pas `ws://`) pour HTTPS

### Erreur : "CORS" ou "Origin not allowed"
- Vérifiez que le serveur WebSocket accepte les connexions depuis votre domaine
- Vérifiez la configuration CORS du serveur WebSocket

### Le Dashboard reste "Non connecté"
- Vérifiez la console du navigateur pour les erreurs
- Vérifiez que `config.js` est bien chargé (dans l'onglet Network)
- Vérifiez que l'URL WebSocket est accessible

## 📝 Note importante

Le fichier `config.js` est chargé **avant** que React ne démarre, donc les modifications sont prises en compte immédiatement après rechargement de la page. Pas besoin de rebuilder l'application !

