# 🔒 OwnPulse — État de sécurité & restes à faire

*Document vivant — mis à jour le 03/08/2026.*

## ✅ Déjà fait et vérifié

| Domaine | État | Preuve |
|---|---|---|
| Dépendances | `npm audit` → **0 vulnérabilité** | lint + build verts sur `main` |
| Bot de dépendances | **Renovate seul actif** ; Dependabot désactivé (PR fermée, *Automated security fixes* off) | dashboard/package.json overrides + `renovate.json` |
| Exposition anon (contacts, settings, sales…) | **Fermée** — anon bloqué (HTTP 401), seul `contact_urls` (200) et RPC `capture_contact` restent | vérifié en direct |
| Inscription publique | **Désactivée** (`disable_signup: true`) | vérifié en direct |
| Multi-utilisateur | `user_id` sur toutes les tables, RLS par propriétaire (`auth.uid()`), contacts « claim-on-edit » | `hardening_multi_user_rls.sql` appliqué |
| En-têtes HTTP | CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, `X-Powered-By` off | `dashboard/next.config.ts` |
| Bootstrap | `schema.sql` + migrations durcis (nouveaux projets) | commit `80e465a` |
| Extension | dédup via `contact_urls`, capture via `capture_contact`, logs PII retirés | `extension/content.js` |

## ⏳ Reste à faire (une autre fois)

### 1. Créer `dashboard/.env.local` (prérequis dashboard local)
Le dashboard ne tourne pas localement sans lui (build échoue).
```bash
cd dashboard
cp .env.local.example .env.local
# puis remplir avec les valeurs : Supabase > Project Settings > API
```

### 2. Redéployer le worker keep-alive (ping → `contact_urls`)
Le code poussé ping la vue `contact_urls` (grant anon), mais le worker **déployé** ping encore `contacts` → il reçoit 401 et survit grâce au fallback health. À redéployer pour un ping 200 propre :
```bash
cd keepalive-worker
npx wrangler login
echo "https://qleflestlmwvgicyebey.supabase.co" | npx wrangler secret put SUPABASE_URL
echo "TA_CLE_ANON" | npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler deploy
# vérif : curl "https://ownpulse-supabase-keepalive.<subdomain>.workers.dev/ping" → OK
```

### 3. Rotation de la clé anon (hygiène)
La clé est publishable (publique par design), mais la rotater invalide tout usage externe :
1. Dashboard → Project Settings → API → créer une nouvelle clé publishable
2. Mettre à jour **avant** de révoquer l'ancienne : `extension/content.js` (ligne 3), `dashboard/.env.local`, secret worker (ci-dessus)
3. Tester (extension : « ✔ Saved to CRM » ; worker : `/ping` → OK)
4. Révoquer l'ancienne clé dans le dashboard
5. Commit `content.js`

### 4. Test multi-utilisateur
1. Dashboard Supabase → Authentication → Users → **Add user** (2ᵉ compte)
2. Fenêtre privée → `/login` avec le 2ᵉ compte → les pages doivent être **vides**
3. Capturer un contact via l'extension → visible par le 2ᵉ compte → l'éditer = le **réclamer** → il disparaît du compte propriétaire
4. Retour propriétaire : ses données sont intactes

> ⚠️ Comportement voulu : un contact capturé (non réclamé) peut être réclamé par n'importe quel utilisateur authentifié.

### 5. Activer MFA/2FA
1. Dashboard Supabase → Authentication → activer **Multi-factor Auth** (TOTP)
2. Compte → Mon profil → **Enroll** avec une app d'authentification
3. Optionnel : forcer MFA pour tous les comptes (Authentication → Settings)

### 6. (Futur) Flux authentifié pour l'extension
Aujourd'hui la capture anon passe par `capture_contact` (whitelistée, non réclamée). Une évolution plus propre : l'extension s'authentifie (JWT) et appelle une RPC qui lie le contact au propriétaire (`user_id = auth.uid()`) — supprimerait le concept de « réclamation ».

## 🚨 Rappels / pièges

- **Ne jamais ré-exécuter `supabase/schema.sql` ou les migrations sur le projet existant** — scripts d'initialisation uniquement (une ré-exécution rouvrirait les grants anon). Pour un projet existant : `hardening_security_rls.sql` puis `hardening_multi_user_rls.sql` (idempotents).
- **Jamais de clé `service_role`** dans le repo, le navigateur ou l'extension — uniquement les clés publishable.
- **Toute nouvelle table** : `GRANT` explicite + RLS + policy par propriétaire (voir `schema.sql`).
- Vérifications rapides de l'état verrouillé :
  ```bash
  K=TA_CLE_ANON; U=https://qleflestlmwvgicyebey.supabase.co
  curl -s -o /dev/null -w "%{http_code}\n" "$U/rest/v1/contacts?select=id&limit=1" -H "apikey: $K" -H "Authorization: Bearer $K"   # 401 attendu
  curl -s -o /dev/null -w "%{http_code}\n" "$U/rest/v1/contact_urls?select=id&limit=1" -H "apikey: $K" -H "Authorization: Bearer $K"   # 200 attendu
  ```
