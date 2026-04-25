# Backlog

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
