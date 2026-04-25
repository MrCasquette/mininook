# Backlog

## UX — Onboarding & First-run

### Onboarding dynamique pas-à-pas (priorité haute)

**Quoi** : remplacer la modal onboarding 5-slides actuelle (qui apparaît avant que l'user ait des flux et donc parle dans le vide) par un **walkthrough guidé** qui accompagne l'user dans ses premières actions.

**Idée** :
- Bulles/highlights successifs : "1) ajoute ton premier flux ici → 2) clique sur un article → 3) tu peux le bookmarker, écarter, ouvrir l'original → 4) la barre de catégories filtre → 5) les filtres haut droite cachent les paywalls / dédupent"
- L'user **fait** chaque action, l'app valide visuellement avant de passer à l'étape suivante
- **Bouton Skip obligatoire** (certains préfèrent naviguer à vue)
- État persisté en localStorage (`mininook_onboarded`)

**Quand déclencher** : au premier mount si `mininook_onboarded !== 'true'` ET feeds.length > 0 (sinon on saute à `/register`).

---

## Catégories — Gestion complète

### F — CRUD catégories (priorité haute)

**Manque** : aujourd'hui les catégories viennent du serveur Miniflux et ne peuvent ni être créées, ni renommées, ni supprimées, ni réordonnées depuis MiniNook. Pourtant toute la nav du bas en dépend.

**Scope** :
- **Créer** une catégorie depuis l'UI
- **Renommer** une catégorie existante
- **Supprimer** (avec confirmation, gérer les flux orphelins)
- **Déplacer** un flux d'une catégorie à une autre
- **Réordonner** (drag-and-drop ?)

**Où** : page `Mes flux` ou nouvelle page `Catégories`. Probablement `Mes flux` enrichie.

---

## Flux — Ingestion

### I — Ajout manuel d'un flux par URL (priorité haute)

**Manque** : la page `Suggestions` n'expose qu'une liste curated. Pour ajouter un blog perso, un podcast, un flux non listé → l'user doit passer par l'UI Miniflux web. Trou structurel.

**Scope** :
- Champ URL dans `Mes flux` (ou nouveau bouton "Ajouter")
- Choix de la catégorie (existante ou création à la volée — couplage avec F)
- Validation : POST `/v1/feeds`, gestion d'erreur explicite (URL invalide, déjà abonné, feed inaccessible)
- Bonus : auto-discover du flux RSS depuis une URL HTML (parser `<link rel="alternate" type="application/rss+xml">`)

---

## Actions globales

### J — Mark all as read

- Par catégorie active (depuis la BottomNav, long-press ou menu contextuel)
- Global ("tout marquer lu")
- Endpoint Miniflux : `PUT /v1/users/:user_id/mark-all-as-read` (ou par catégorie via `/v1/categories/:id/mark-all-as-read`)

### K — Refresh manuel

- Bouton refresh dans la TopNav ou sur `Mes flux` per-feed (déjà existant) + global
- Endpoint Miniflux : `PUT /v1/feeds/refresh`
- Indicateur de progression (les fetches Miniflux sont async côté serveur)

---

## Filtres avancés

### H — Filtres riches (priorité moyenne)

Aujourd'hui : 2 toggles (paywall, dédup) + filtre catégorie via BottomNav.

**À ajouter** :
- **Date** : aujourd'hui / cette semaine / ce mois / range custom
- **Type de média** : article / podcast / vidéo (selon `entry.feed.feed_url` ou détection content)
- **Flux** : multi-select (ex: lire seulement les Tech)
- **Durée de lecture** : < 5min / 5-10 / 10+ / > 30
- **Auteur** : si `entry.author` rempli
- **Lu / non-lu** : toggle

**UX** : barre de filtres pliable, count de matches en live, persistance localStorage par défaut ?

---

## Recherche

### N — Search d'articles

**Quoi** : recherche full-text dans les articles (titre, contenu, feed, auteur).

**Backend** : Miniflux expose `GET /v1/entries?search=...`.

**UX** : icône loupe dans TopNav → input plein écran ou modale, résultats live, debouncé.

---

## Apparence article

### O — Mode lecture personnalisable (luxe)

- Police (sans-serif / serif / monospace)
- Taille (S/M/L/XL)
- Largeur de colonne max
- Mode "reader pure" plein écran
- Mode jour/sombre/sépia

Persistance localStorage. Pas prioritaire.

---

## Iconographie

### E — Icône paywall multilingue

**Problème** : aujourd'hui badge "Réservé aux abonnés" + pictogramme cadenas. L'icône monétaire (€/$) ne marche pas en multilingue.

**Pistes** :
- Cadenas seul (déjà universel pour "subscribers only")
- Étoile / badge "Pro"
- Billet barré (mais $/€ = pas multilingue)
- Glyphe abstrait custom

À tester visuellement avant trancher. Voir aussi le toggle filtre dans `FeedFilters.vue` qui utilise les icônes `SubscriptionIcon*`.

---

## Auth

### Logout shortcut TopNav (nice-to-have)

Bouton de déconnexion accessible directement depuis TopNav (en plus de Settings). Dropdown menu avec avatar/initial du user ? Question ouverte.

---

## Persistance

### Enrich cache persistant (`tauri-plugin-store`)

**Quoi** : persister `entry_meta` (image, paywall, truncatedPercent, readingTime, resolved) sur disque via `tauri-plugin-store` — KV JSON local, sémantique Redis-like.

**Pourquoi** : aujourd'hui chaque cold start re-fetch le HTML et re-extract les métas → lent, coûteux, hammer les sites externes. Avec un cache persistant, les cards s'hydratent instantanément au reload.

**Pas SQLite** : pas de query relationnelle nécessaire (lookup par `entry_id` uniquement). On migrera vers SQLite seulement si analytics / offline browse riches arrivent.

**À ne PAS persister** : entries, feeds, catégories, lu/non-lu, bookmarks, dismissed — Miniflux est SSOT, dupliquer crée des conflits de sync.

**Détails techniques** :
- Une seule clé `entry_meta` (Record<entryId, EntryMeta>) ou un fichier par entrée selon volume
- TTL optionnel (~30j) pour invalider images cassées
- Activer **uniquement en prod** (sinon masque les perfs cold path en dev)

**Quand** : pas avant d'avoir validé les perfs cold path en dev.

---

## Done — historique

- ✅ Auth dual-mode (API key / Basic), LoginScreen glassmorphism
- ✅ Bouton "Générer sur Miniflux" → ouvre `/keys` dans le browser système
- ✅ i18n vue-i18n auto-discovered (fr/en) + selector dans Settings
- ✅ Page Settings + section Compte + bouton logout 2-step
- ✅ TopNav active state (underline + couleur)
- ✅ Logo MiniNook = entry point feed (suppression du lien "Liste" redondant)
- ✅ Renommages : Découvrir → Suggestions, Lire plus tard → Ma liste, Indésirables → Écartés
- ✅ Initial commit + push GitHub public sous CeCILL v2.1
