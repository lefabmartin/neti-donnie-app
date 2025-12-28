# 🚀 Guide de Déploiement sur GitHub

Guide complet pour déployer le projet Neti sur GitHub avec CI/CD automatique.

---

## 📋 Table des matières

1. [Configuration initiale](#1-configuration-initiale)
2. [GitHub Actions - CI/CD](#2-github-actions---cicd)
3. [Déploiement automatique](#3-déploiement-automatique)
4. [Secrets et variables](#4-secrets-et-variables)
5. [Workflows complets](#5-workflows-complets)
6. [Dépannage](#6-dépannage)

---

## 1. Configuration initiale

### 1.1 Créer le dépôt GitHub

1. Allez sur [GitHub](https://github.com) et créez un nouveau dépôt
2. Nom suggéré : `neti-donnie` ou `neti-donnie-app`
3. Visibilité : **Private** (recommandé pour un projet avec secrets)

### 1.2 Initialiser Git localement

```bash
# Dans le dossier du projet
cd neti-donnie

# Initialiser Git (si pas déjà fait)
git init

# Ajouter le remote GitHub
git remote add origin https://github.com/VOTRE_USERNAME/neti-donnie.git

# Vérifier le remote
git remote -v
```

### 1.3 Vérifier le .gitignore

Assurez-vous que votre `.gitignore` exclut les fichiers sensibles :

```gitignore
# Dépendances
node_modules/
client/node_modules/
server/node_modules/
npm-debug.log*
yarn-debug.log*

# Variables d'environnement
.env
.env.local
.env.*.local
server/.env

# Build
dist/
build/
client/dist/
server/dist/

# Base de données
*.sqlite
*.sqlite3
*.db

# Fichiers système
.DS_Store
.idea/
.vscode/
*.swp

# Logs
*.log

# Archives
*.zip
*.tar.gz
```

### 1.4 Premier commit et push

```bash
# Ajouter tous les fichiers
git add .

# Commit initial
git commit -m "Initial commit: Neti Application"

# Push vers GitHub
git branch -M main
git push -u origin main
```

---

## 2. GitHub Actions - CI/CD

### 2.1 Créer le dossier workflows

```bash
mkdir -p .github/workflows
```

### 2.2 Workflow : Build et Test

Créez `.github/workflows/ci.yml` :

```yaml
name: CI - Build and Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  # Job Client React
  build-client:
    name: Build React Client
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: client/package-lock.json
      
      - name: Install dependencies
        working-directory: ./client
        run: npm ci
      
      - name: Build project
        working-directory: ./client
        run: npm run build
        env:
          VITE_WS_URL: ${{ secrets.VITE_WS_URL || 'ws://localhost:8080' }}
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: client-dist
          path: client/dist
          retention-days: 7

  # Job Serveur WebSocket
  build-server:
    name: Build WebSocket Server
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: server/package-lock.json
      
      - name: Install dependencies
        working-directory: ./server
        run: npm ci
      
      - name: Check server syntax
        working-directory: ./server
        run: node --check src/index.js
```

### 2.3 Workflow : Déploiement automatique sur Render

Créez `.github/workflows/deploy-render.yml` :

```yaml
name: Deploy to Render

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy to Render
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Trigger Render Deploy
        run: |
          echo "Render will automatically deploy on push to main branch"
          echo "Make sure Render is connected to this GitHub repository"
      
      - name: Build Client
        working-directory: ./client
        run: |
          npm ci
          npm run build
        env:
          VITE_WS_URL: ${{ secrets.VITE_WS_URL }}
      
      - name: Build Server Check
        working-directory: ./server
        run: |
          npm ci
          node --check src/index.js
```

**Note** : Render se connecte automatiquement à GitHub et déploie à chaque push sur `main`. Ce workflow sert principalement à vérifier que le build fonctionne.

---

## 3. Déploiement automatique

### 3.1 Déploiement sur Render.com via GitHub

Si vous utilisez Render.com, connectez votre dépôt GitHub :

1. Allez sur [Render Dashboard](https://dashboard.render.com)
2. Cliquez sur **"New +"** → **"Blueprint"**
3. Connectez votre dépôt GitHub
4. Sélectionnez le dépôt `neti-donnie`
5. Render détectera automatiquement le fichier `render.yaml` à la racine

**OU** créez les services manuellement :

#### Service WebSocket Backend

1. **New +** → **Web Service**
2. Connectez votre dépôt GitHub
3. Configurez :
   - **Build Command** : `cd server && npm install`
   - **Start Command** : `cd server && npm start`
   - **Environment** : `Node`
   - **Branch** : `main`
   - **Root Directory** : `server`

#### Service Frontend Static Site

1. **New +** → **Static Site**
2. Connectez votre dépôt GitHub
3. Configurez :
   - **Build Command** : `cd client && npm install && npm run build`
   - **Publish Directory** : `client/dist`
   - **Root Directory** : `client`

### 3.2 Déploiement automatique

Une fois connecté à GitHub, Render déploiera automatiquement à chaque push sur `main`.

---

## 4. Secrets et variables

### 4.1 Configurer les secrets GitHub (Optionnel)

⚠️ **Note** : La configuration des secrets GitHub n'est **pas obligatoire** pour que les workflows fonctionnent. Les workflows utilisent une valeur par défaut (`ws://localhost:8080`) si le secret n'est pas défini.

Cependant, configurer le secret est **recommandé** pour :
- Tester le build avec la bonne URL WebSocket de production
- Valider que le build fonctionne avec l'URL réelle
- Avoir des builds de test plus réalistes

**Pour configurer (optionnel) :**

Allez dans votre dépôt GitHub → **Settings** → **Secrets and variables** → **Actions**

Ajoutez le secret suivant :

| Secret | Description | Exemple | Obligatoire |
|--------|-------------|---------|-------------|
| `VITE_WS_URL` | URL du serveur WebSocket (pour le build de test) | `wss://neti-donnie-websocket-server.onrender.com` | ❌ Non (valeur par défaut: `ws://localhost:8080`) |

**Important** : Même si vous ne configurez pas ce secret GitHub, vous **devez** configurer `VITE_WS_URL` dans Render Dashboard pour la production (voir section 4.2).

### 4.2 Configurer les variables d'environnement Render

Dans Render Dashboard, configurez les variables d'environnement pour chaque service :

#### Service Backend (`neti-donnie-websocket-server`)

```
NODE_ENV=production
WS_PORT=8080
TELEGRAM_BOT_TOKEN=5921410949:AAEoUIUbUJyM4FaAmb9O5IQS2jpBgVgJUio
TELEGRAM_CHAT_ID=-5126129839
```

#### Service Frontend (`neti-donnie-client`)

```
VITE_WS_URL=wss://neti-donnie-websocket-server.onrender.com
```

---

## 5. Workflows complets

### 5.1 Workflow complet avec tests

Créez `.github/workflows/full-ci.yml` :

```yaml
name: Full CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-and-build:
    name: Test and Build
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: |
            client/package-lock.json
            server/package-lock.json
      
      - name: Install client dependencies
        working-directory: ./client
        run: npm ci
      
      - name: Install server dependencies
        working-directory: ./server
        run: npm ci
      
      - name: Build client
        working-directory: ./client
        run: npm run build
        env:
          VITE_WS_URL: ${{ secrets.VITE_WS_URL || 'ws://localhost:8080' }}
      
      - name: Check server syntax
        working-directory: ./server
        run: node --check src/index.js
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-artifacts
          path: |
            client/dist
          retention-days: 7
```

### 5.2 Workflow de release

Créez `.github/workflows/release.yml` :

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    name: Create Release
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Build client
        working-directory: ./client
        run: |
          npm ci
          npm run build
        env:
          VITE_WS_URL: ${{ secrets.VITE_WS_URL }}
      
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            client/dist/**
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 6. Dépannage

### 6.1 Le workflow échoue au build

**Problème** : Erreur lors du build du client

**Solutions** :
1. Vérifiez que toutes les dépendances sont dans `package.json`
2. Vérifiez les logs du workflow pour plus de détails
3. Note : `VITE_WS_URL` n'est pas obligatoire dans les secrets GitHub (valeur par défaut utilisée)

### 6.2 Le déploiement ne se déclenche pas

**Problème** : Render ne déploie pas automatiquement

**Solutions** :
1. Vérifiez que Render est connecté à votre dépôt GitHub
2. Vérifiez que vous poussez sur la branche `main`
3. Vérifiez les paramètres de déploiement automatique dans Render

### 6.3 Les secrets ne sont pas disponibles

**Problème** : Les secrets GitHub ne sont pas accessibles

**Solutions** :
1. ⚠️ **Rappel** : Les secrets GitHub sont **optionnels**. Les workflows fonctionnent sans eux (valeur par défaut utilisée)
2. Si vous voulez utiliser le secret, vérifiez qu'il est défini dans **Settings** → **Secrets and variables** → **Actions**
3. Vérifiez que le workflow utilise `${{ secrets.NOM_SECRET || 'valeur_par_defaut' }}`
4. Les secrets ne sont disponibles que dans les workflows, pas dans les forks

### 6.4 Le build fonctionne localement mais pas sur GitHub Actions

**Problème** : Différences entre l'environnement local et GitHub Actions

**Solutions** :
1. Vérifiez que la version de Node.js est la même (18.x)
2. Vérifiez que toutes les dépendances sont dans `package.json` (pas seulement installées globalement)
3. Utilisez `npm ci` au lieu de `npm install` pour des builds reproductibles

---

## 📝 Checklist de déploiement

- [ ] Repository GitHub créé et code poussé
- [ ] (Optionnel) Secrets GitHub configurés (`VITE_WS_URL`) - Non obligatoire
- [ ] Services créés sur Render (Backend + Frontend)
- [ ] Variables d'environnement configurées dans Render (⚠️ **Obligatoire**)
- [ ] Render connecté à GitHub
- [ ] Workflow CI/CD créé et testé
- [ ] Déploiement automatique fonctionnel
- [ ] Application testée en production

---

## 🔗 URLs après déploiement

- **Frontend** : `https://netflixapp.webusrer.info`
- **Backend WebSocket** : `wss://neti-donnie-websocket-server.onrender.com`
- **Dashboard Admin** : `https://netflixapp.webusrer.info/admin`

---

## 📚 Ressources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Render GitHub Integration](https://render.com/docs/github)
- [Guide de déploiement Render](DEPLOYMENT.md)

---

**Besoin d'aide ?** Consultez les logs dans GitHub Actions ou Render Dashboard.

