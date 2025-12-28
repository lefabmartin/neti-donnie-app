# Configuration Serveur pour le Routage SPA

Ce projet est une Single Page Application (SPA) React qui nécessite une configuration spéciale du serveur web pour que toutes les routes (comme `/admin`) fonctionnent correctement.

## 🔧 Solutions selon le type de serveur

### 1. Apache (.htaccess)

Le fichier `.htaccess` est déjà inclus dans le build. Assurez-vous que votre serveur Apache a `AllowOverride All` activé dans la configuration :

```apache
<Directory "/path/to/dist">
    AllowOverride All
    Require all granted
</Directory>
```

### 2. Solution de contournement : admin.html

Un fichier `admin.html` est automatiquement créé lors du build. Si votre serveur ne peut pas être configuré pour rediriger les routes, vous pouvez accéder au dashboard via :

- `https://netflixapp.webusrer.info/admin.html`

**Note :** Cette solution fonctionne mais l'URL affichée sera `/admin.html` au lieu de `/admin`.

### 3. Autres serveurs

- **IIS (Windows)** : Utilisez le fichier `web.config` inclus
- **Render/Netlify** : Utilisez le fichier `_redirects` inclus
- **Vercel** : Configuration automatique, pas besoin de fichier supplémentaire

## 📝 Vérification

Après configuration, testez :
- `https://netflixapp.webusrer.info/admin` devrait afficher le Dashboard
- `https://netflixapp.webusrer.info/` devrait rediriger vers `/billing`
- Toutes les autres routes React Router devraient fonctionner

## ⚠️ Problèmes courants

1. **404 sur /admin** : Le serveur ne redirige pas les routes → Configurez le serveur selon les instructions ci-dessus
2. **Page blanche** : Vérifiez que les fichiers assets sont accessibles
3. **Erreur de routage** : Vérifiez que le fichier de configuration serveur est correctement appliqué

