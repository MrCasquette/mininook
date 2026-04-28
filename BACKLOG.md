# Backlog

## Filtres avancés

### H — Filtres riches (priorité moyenne)

Aujourd'hui : 3 toggles (paywall, dédup, lu/non-lu) + filtre catégorie via BottomNav.

**À ajouter** :
- **Date** : aujourd'hui / cette semaine / ce mois / range custom
- **Type de média** : article / podcast / vidéo (selon `entry.feed.feed_url` ou détection content)
- **Flux** : multi-select (ex: lire seulement les Tech)
- **Durée de lecture** : < 5min / 5-10 / 10+ / > 30
- **Auteur** : si `entry.author` rempli

**UX** : barre de filtres pliable, count de matches en live, persistance localStorage par défaut ?

---

## Actions globales

### J — Mark all as read (rétrogradé)

À reconsidérer une fois H livré. Sans filtre lu/non-lu visible côté UI, mark-all = perte de contexte (les articles disparaissent). À coupler avec le toggle « afficher les déjà lus » comme contre-poids visuel.

### K — Refresh manuel (rétrogradé)

Le refresh par flux existe déjà sur `/handle`. Un refresh global ne fait que re-poll côté serveur Miniflux — utilité marginale pour un client desktop.

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

## UI primitives

### Composant Tooltip custom (polish)

**Quoi** : remplacer les attributs `title="..."` natifs par un vrai composant Tooltip Vue.

**Pourquoi** : aujourd'hui chaque icône (refresh, delete, paywall, dedup, show-read, settings, etc.) repose sur l'attribut HTML `title`. Pratique mais visuellement pauvre : style imposé OS, délai d'apparition long (~700ms macOS), pas de positionnement contrôlé, pas accessible aux contrôles tactiles.

**Scope** :
- Composant `<Tooltip>` ou directive `v-tooltip` (`@floating-ui/vue` est déjà installé pour l'onboarding, on le réutilise)
- Délai court (~150ms), placement auto, portal pour pas être clip par overflow
- Migration de tous les `:title="..."` actuels vers le composant
- Garder `aria-label` pour l'accessibilité

**Quand** : à la fin du polish, juste avant la 1.0. Aucune urgence — `title` natif fait le job basique.

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

## Onboarding (itérations futures)

- Bouton « Revoir le tour » dans Settings, pour relancer le walkthrough manuellement après l'avoir terminé.
- Welcome step avant l'étape 1 (centered modal "Bienvenue sur MiniNook, on te montre le tour ?") avec opt-out direct.
- Gestion fine du retour utilisateur : si l'user déclenche les actions de plusieurs steps en même temps (ex. crée 2 catégories), ne pas avancer le tour de plusieurs steps.
- A11y : focus trap sur la tooltip, navigation clavier (Tab/Enter), ARIA roles.
- Adaptation mobile (le placement floating-ui marche, mais les targets/scrolls peuvent être ajustés).

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
- ✅ I — Add feed par URL (`/v1/discover` + AddFeedForm + multi-candidate)
- ✅ F — Catégories CRUD (page `/categories` create/rename/delete + DnD inter-buckets sur `/handle`)
- ✅ Util `sortCategories` + `displayCategoryTitle` (default pinned + i18n "Non attribué")
- ✅ Suggestions refonte : flat list + picker inline catégorie, plus d'auto-création
- ✅ Filtre lu/non-lu (toggle œil dans FeedFilters, persisté en localStorage)
- ✅ N — Search d'articles (modal ⌘K, debounce, navigation flèches)
- ✅ M — Onboarding dynamique 13 steps (walkthrough avec spotlight, auto-advance, skip)
- ✅ Extracteur LeFigaro : TV widget, "Partager via:", "À lire aussi"
- ✅ Scrollbar-none global + DnD natif (Tauri `dragDropEnabled: false`)
