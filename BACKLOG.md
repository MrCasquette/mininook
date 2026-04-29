# Backlog

## Apparence article

### O — Mode lecture personnalisable (luxe)

- Police (sans-serif / serif / monospace)
- Taille (S/M/L/XL)
- Largeur de colonne max
- Mode "reader pure" plein écran
- Mode jour/sombre/sépia

Persistance localStorage. Pas prioritaire.

---

## Onboarding (itérations futures)

- Welcome step avant l'étape 1 (centered modal "Bienvenue sur MiniNook, on te montre le tour ?") avec opt-out direct.
- Gestion fine du retour utilisateur : si l'user déclenche les actions de plusieurs steps en même temps (ex. crée 2 catégories), ne pas avancer le tour de plusieurs steps.
- A11y : focus trap sur la tooltip, navigation clavier (Tab/Enter), ARIA roles.
- Adaptation mobile (le placement floating-ui marche, mais les targets/scrolls peuvent être ajustés).

---

## Filtres avancés (extensions futures)

Date + flux server-side livrés en v1. Reste à explorer si l'usage le justifie :
- **Type de média** : article / podcast / vidéo (heuristique URL ou content sniff)
- **Auteur** : si `entry.author` rempli, dropdown
- **Multi-flux** : actuellement single-feed, multi requiert N+1 fetches ou client-side pagination, complexe
- **Range de dates custom** (en plus du today/week/month)
- **Durée de lecture** : à reconsidérer une fois l'enrich cache persistant en place (sans cache, `entry.reading_time` reste à 1-2 min pour la quasi-totalité des excerpts RSS et le bucket "<5" capture tout)

---

## Actions globales (rétrogradées)

### J — Mark all as read

Actuellement le filtre lu/non-lu existe (toggle œil). On peut envisager un mark-all par catégorie active depuis BottomNav (long-press / menu) pour les users avec gros backlog. Pas prioritaire.

### K — Refresh manuel

Le refresh par flux existe sur `/handle`. Un refresh global = re-poll côté serveur Miniflux. Utilité marginale pour un client desktop.

---

## Persistance

### Enrich cache persistant (`tauri-plugin-store`)

**Quoi** : persister `entry_meta` (image, paywall, truncatedPercent, readingTime, resolved) sur disque via `tauri-plugin-store` — KV JSON local, sémantique Redis-like.

**Pourquoi** : aujourd'hui chaque cold start re-fetch le HTML et re-extract les métas → lent, coûteux, hammer les sites externes. Avec un cache persistant, les cards s'hydratent instantanément au reload, et le filtre durée de lecture devient utilisable.

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
- ✅ TopNav refactor : brand + UserMenu (avatar dropdown) + search ⌘K, plus de liens nav inline
- ✅ Logo MiniNook (SVG inline + LogoIcon component) + favicon + app icons (Apple template 824/1024 squircle)
- ✅ Cargo.toml renamed to mininook + lib mininook_lib + métadonnées propres
- ✅ Renommages : Découvrir → Suggestions, Lire plus tard → Ma liste, Indésirables → Écartés
- ✅ Initial commit + push GitHub public sous CeCILL v2.1
- ✅ I — Add feed par URL (`/v1/discover` + AddFeedForm + multi-candidate)
- ✅ F — Catégories CRUD (page `/categories` create/rename/delete + DnD inter-buckets sur `/handle`)
- ✅ Util `sortCategories` + `displayCategoryTitle` (default pinned + i18n "Non attribué")
- ✅ Suggestions refonte : flat list + picker inline catégorie, plus d'auto-création
- ✅ Filtre lu/non-lu (toggle œil dans FeedFilters, persisté en localStorage)
- ✅ N — Search d'articles (modal ⌘K, debounce, navigation flèches)
- ✅ M — Onboarding dynamique 13 steps (walkthrough avec spotlight, auto-advance, skip)
- ✅ Onboarding : skipAll explicite + "Revoir le tour" dans Settings
- ✅ Extracteur LeFigaro : TV widget, "Partager via:", "À lire aussi"
- ✅ Scrollbar-none global + DnD natif (Tauri `dragDropEnabled: false`)
- ✅ v-tooltip directive : remplace tous les `:title=` natifs (placement floating-ui-style, viewport-aware, a11y)
- ✅ E — Icône paywall : cadenas + € (jaune visible / rouge barré filtré), composant `<PaywallIcon>` réutilisé
- ✅ H — Filtres riches v1 : date (server-side `?after=`) + flux (server-side `/v1/feeds/:id/entries`) avec dropdown scopé à la catégorie active et auto-clear
- ✅ Counters BottomNav : N+1 server-side fetch debouncé (date + read + category), reflète la vraie vérité filtrée (caveat dedup/paywall = client-only, drift accepté)
- ✅ Logout shortcut : intégré dans le UserMenu dropdown
