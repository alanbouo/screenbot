# Screenshot Bot - Outil de Capture d'Écran de Site Web

Un script Node.js utilisant Playwright pour automatiser la prise de captures d'écran de sites web. Parfait pour l'analyse UI/UX et le développement web.

## 🚀 Fonctionnalités

- **Navigation automatique** : Capture la page d'accueil et découvre automatiquement les pages clés (À propos, Contact, Produits)
- **Capture intelligente** : Prise de captures d'écran pleine page avec détection intelligente des pages importantes
- **Configuration flexible** : Arguments en ligne de commande pour personnaliser l'exécution
- **Gestion d'erreurs** : Continue le processus même si certaines pages échouent
- **Compatibilité multiple** : Fonctionne avec différents sites web

## 📋 Prérequis

- Node.js (version 14 ou supérieure)
- npm ou yarn

## 🛠️ Installation

### Installation des dépendances du projet

```bash
# Initialiser le projet npm et installer Playwright
npm init -y && npm install playwright

# Installer les navigateurs Playwright
npx playwright install chromium
```

### Fichiers créés
- `package.json` - Configuration du projet Node.js
- `screenshot-bot.js` - Script principal
- `node_modules/` - Dépendances installées

## 📖 Utilisation

### Commandes de base

```bash
# Utilisation basique avec mode Discovery intelligent (5 pages max)
node screenshot-bot.js https://monsite.com
# → Crée : ./screenshots/capture_2025-09-04_09-03-50/

# Mode Crawler complet - explore TOUTES les pages du site
node screenshot-bot.js https://monsite.com --crawl --pages 20
# → Capture toutes les pages trouvées jusqu'à 20 pages

# Avec répertoire de sortie personnalisé (ignore les timestamps automatiques)
node screenshot-bot.js https://monsite.com --output ./mes-captures

# Mode debug avec navigateur visible pour le développement
node screenshot-bot.js https://monsite.com --debug --pages 3
# → Navigateur visible pour le débogage

# Limiter le nombre de pages à capturer (avec répertoire automatique)
node screenshot-bot.js https://monsite.com --pages 3

# Combinaison des options avec répertoire personnalisé
node screenshot-bot.js https://monsite.com --output ./captures --pages 10
```

### Arguments disponibles

| Argument | Description | Obligatoire | Défaut | Comportement |
|----------|-------------|-------------|--------|--------------|
| `<url>` | URL du site web à analyser | Oui | - | - |
| `--crawl` | Mode crawler complet : explore TOUTES les pages du site | Non | false | Active le web crawler |
| `--output <répertoire>` | Dossier pour sauvegarder les captures | Non | `./screenshots` | Désactive les timestamps si spécifié |
| `--pages <nombre>` | Nombre de pages à capturer | Non | `5` | Limite du nombre de captures |
| `--debug` | Mode debug : navigateur visible | Non | false | Navigation visible pour debugging |
| `--headless` | Mode headless : navigateur caché | Non | true | Navigation en arrière-plan |

### Comportement des répertoires automatiques

Le script crée automatiquement des répertoires timestampés à chaque exécution :

```text
./screenshots/
├── capture_2025-09-04_09-03-50/  ← Exécution 1
│   ├── homepage.png
│   ├── about.png
│   └── contact.png
└── capture_2025-09-04_12-15-30/  ← Exécution 2
    ├── homepage.png
    ├── services.png
    └── products.png
```

**Avantages :**
- ✅ Chaque exécution a son propre dossier
- ✅ Historique préservé automatiquement
- ✅ Timestamp pour différencier les captures
- ✅ Pas de risque d'écrasement accidentel

**Format du timestamp :** `capture_AAAA-MM-JJ_HH-MM-SS`

### Modes de fonctionnement

#### 🎯 Mode Discovery Intelligent (par défaut)
- Capture la page d'accueil puis cherche les pages importantes (À propos, Contact, Produits)
- Analyse automatique des liens pour trouver les pages les plus pertinentes
- Idéal pour des analyses rapides et ciblées
- Mode efficace pour la plupart des utilisations

#### 🕷️ Mode Crawler Complet (`--crawl`)
- Explore récursivement TOUTES les pages trouvées sur le site
- Suit tous les liens internes comme un véritable spider/robot
- Idéal pour une couverture complète du site
- Peut générer beaucoup de trafic et prendre du temps

**Exemples d'utilisation :**

```bash
# Mode Discovery - rapide et intelligent (recommandé) - 5 pages max
node screenshot-bot.js https://monsite.com --pages 8

# Mode Crawler - complet mais plus long - jusqu'à 20 pages
node screenshot-bot.js https://monsite.com --crawl --pages 20

# Pour petits sites - reste efficace
node screenshot-bot.js https://landing-page.com --pages 3
```

#### 💡 Quand utiliser chaque mode :

- **Mode Discovery** : Analyse UX d'un site, documentation, tests visuels
- **Mode Crawler** : Indexation complète, sécurité, génération de contenu IA

### Exemples pratiques

```bash
# Analyse d'un portfolio (mode Discovery)
node screenshot-bot.js https://john-doe.dev --pages 8

# Capture d'un e-commerce (mode Crawler pour toutes les pages)
node screenshot-bot.js https://boutique.fr --crawl --pages 25

# Session de debugging (navigateur visible)
node screenshot-bot.js https://mon-site.fr --debug --pages 3

# Génération de données IA (mode Crawler personnalisé)
node screenshot-bot.js https://blog.fr --crawl --pages 15 --output ./ai-data
```

## 📁 Structure des fichiers générés

```
mes-captures/
├── homepage.png          # Page d'accueil
├── about.png            # Page "À propos"
├── contact.png          # Page de contact
├── produits.png         # Page produits (si trouvée)
└── page-4.png          # Pages supplémentaires
```

## ⚙️ Comment ça fonctionne

1. **Initialisation** :
   - Lance un navigateur Chromium (en mode visuel pour le debugging)
   - Crée le répertoire de sortie si nécessaire

2. **Navigation intelligente** :
   - Accède à la page d'accueil avec gestion d'erreur améliorée
   - Si timeout dépassé : essaie avec une condition d'attente plus simple et timeout étendu
   - Permet de gérer les sites lents ou ceux qui se chargent de manière atypique

3. **Découverte automatique** :
   - Analyse les liens de la page
   - Identifie les pages clés (À propos, Contact, Produits)
   - Vise les liens internes uniquement

4. **Capture robuste** :
   - Navigue vers chaque page découverte avec la même gestion d'erreur
   - Attend le chargement complet avec `networkidle`
   - Prend une capture d'écran pleine page
   - Génère des noms de fichiers descriptifs

5. **Finalisation** :
   - Ferme proprement le navigateur
   - Affiche un résumé de l'exécution

## 🎯 Cas d'usage recommandés

### Pour les développeurs :
- Tests visuels lors de refactorisation CSS
- Comparaison de design avant/après
- Documentation d'interfaces utilisateur

### Pour les UX designers :
- Analyse rapide de sites concurrents
- Capture systématique pour audit UX
- Documentation de bonnes pratiques

### Pour les outils AI :
- Envoi automatique à des outils comme Super Grok pour analyse
- Génération de données pour intelligence artificielle
- Automatisation de rapports de qualité

## 🔧 Configuration et optimisations

### Mode headless
Pour la production, changez cette ligne dans `screenshot-bot.js` :
```javascript
// Pour le debugging (actuel)
browser = await chromium.launch({ headless: false });

// Pour la production
browser = await chromium.launch({ headless: true });
```

### Viewport personnalisé
Modifiez la résolution dans le script :
```javascript
await page.setViewportSize({ width: 1280, height: 1024 });
```

### Timeouts personnalisables
```javascript
// Timeout de navigation (actuellement 30 secondes)
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

// Timeout de capture (actuellement 30 secondes)
await page.screenshot({ path: filepath, fullPage: true, timeout: 30000 });
```

## 🚨 Gestion des erreurs

### Erreurs communes :

1. **Navigateur non trouvé** :
   ```
   Error: chromium is not supported
   ```
   **Solution** : `npx playwright install chromium`

2. **Timeout dépassé** :
   ```
   Error: Navigation timeout of 30000ms exceeded
   ```
   **Solution** : Augmenter le timeout ou vérifier la connectivité

3. **Permissions d'écriture** :
   ```
   Error: EACCES: permission denied
   ```
   **Solution** : Changer les permissions du dossier ou utiliser `--output` avec un chemin accessible

### Comportement en cas d'erreur :
- **Récupération automatique** : Le script essaie automatiquement des stratégies alternatives (timeout étendu, condition d'attente simplifiée)
- Le script continue avec les autres pages si une échoue
- Les erreurs sont clairement affichées dans la console avec des suggestions
- Le navigateur se ferme toujours proprement

### Gestion intelligente des timeouts :
Le script détecte automatiquement les problèmes de chargement et adapte sa stratégie :
1. **Premier essai** : Condition `networkidle` avec timeout de 30 secondes
2. **Récupération** : Condition `domcontentloaded` avec timeout étendu (45-60 secondes)
3. **Échec** : Arrêt propre avec message d'erreur clair

## 📊 Sortie console

Exemple de sortie réussie :
```
Starting screenshot automation...
URL: https://example.com
Output directory: screenshots/capture_2025-09-04_09-03-50
Pages to capture: 5
Launching browser...
Navigating to homepage...
Taking screenshot: homepage.png
✓ Screenshot saved: screenshots/capture_2025-09-04_09-03-50/homepage.png
Found 3 key pages to capture (limited to 4)
Navigating to: https://example.com/about
Taking screenshot: about.png
✓ Screenshot saved: screenshots/capture_2025-09-04_09-03-50/about.png
✅ Completed! Captured 2 pages.
Screenshots saved to: /Users/boubou/project/screenshots/capture_2025-09-04_09-03-50
Closing browser...
```

## 🔄 Intégration avec AI

Le script peut être intégré facilement avec des outils AI :

```bash
# Envoi automatique des captures vers un outil AI
node screenshot-bot.js https://monsite.com --output ./captures &&
./envoyer-vers-ai ./captures/*.png
```

## 📝 Notes importantes

- Le script respecte les robots.txt par défaut
- Il ne génère pas de trafic excessif (delai entre les captures)
- Les captures sont en pleine résolution
- Compatible avec les sites modernes (React, Vue, Angular...)

---

**Créé avec ❤️ pour l'automatisation de l'analyse web**
