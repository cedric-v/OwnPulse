# 🔐 OwnPulse — Plan d'implémentation : capture **authentifiée** par l'extension

> **Statut : À FAIRE — document de conception, rien n'est implémenté.**
> Remplace l'item 6 de `SECURITY.md` (« Flux authentifié pour l'extension »).
> Écrit le 02/11/2026 · écriture technique avant implémentation.

---

## 1. Pourquoi ce chantier

Aujourd'hui, l'extension écrit dans Supabase avec la **clé publishable seule** :

```text
content.js ──Bearer <clé publishable>──▶ /rest/v1/rpc/capture_contact
                                         └─▶ /rest/v1/contact_urls   (dédupe)
                                         └─▶ /rest/v1/rpc/refresh_contact_from_capture
```

Conséquences :

| Problème | Impact |
|---|---|
| `capture_contact` insère **toujours** une ligne `user_id = NULL` (« non réclamée ») | tout contact capturé peut être **réclamé par n'importe quel utilisateur authentifié** (comportement voulu à l'origine, cf. `SECURITY.md` §4) |
| La clé publishable est publique par design | n'importe qui peut polluer le CRM ( spam de lignes) |
| La dédupe lit `contact_urls` **en global** | les URLs de prospection des autres comptes sont lisibles par la clé anon |
| `refresh_contact_from_capture` est exécutable en `anon` | la Refresh force une bifurcation « connecté / non connecté » côté extension |

**Objectif :** toute capture passe par un **JWT utilisateur**. Le contact est créé **directement rattaché à son propriétaire** (`user_id = auth.uid()`), et le concept de « contact non réclamé » disparaît pour les nouvelles captures. L'anon ne conserve plus **aucun droit d'écriture**.

---

## 2. Invariants à préserver (extraits de `AGENTS.md`)

Ces règles ne doivent pas êtrecassées par le chantier :

1. **Pas d'accès direct en `anon`** sur `contacts` (SELECT / INSERT / UPDATE). Seuls `contact_urls` (dédupe) et les RPC whitelistées sont exposés.
2. **`GRANT SELECT ON contact_urls TO anon` explicite** — c'est le signal d'activité du keep-alive Cloudflare (cf. §6, décision D2).
3. **`refresh_contact_from_capture`** : uniquement les champs profil (noms si vides, société, rôle, avatar, URLs sociales). **Jamais** email, téléphone, notes, statut, liste, valeur, `user_id`.
4. **Ownership dans la fonction** : les RPC sont `SECURITY DEFINER` → le RLS est court-circuité, l'invariant « propriétaire *ou* non réclamée » doit être vérifié **dans le corps de la fonction**.
5. **Aucune clé `service_role`** dans le repo, le navigateur ou l'extension.
6. **Aucune table/œuvre nouvelle sans `GRANT` explicite** (règle Supabase depuis le 30/10/2026).

---

## 3. Flux cible

```text
1. Clic sur le bouton flottant (page profil)
2. content.js → background.js : getAccessToken()
3.        ┌─ session absente → message « Connexion requise » + ouverture du popup
   ┌─ session présente ─────▶ JWT (refresh_token renewé si expiré, marge 30 s)
4. content.js ──apikey: <clé publishable> + Authorization: Bearer <JWT>──▶ Supabase
   ├─ GET  /rest/v1/my_contact_urls      (dédupe scopée à l'utilisateur)
   ├─ POST /rest/v1/rpc/capture_contact_owned   (création, user_id = auth.uid())
   └─ POST /rest/v1/rpc/refresh_contact_from_capture (si déjà connu)
5. Retour UI : « ✔ Enregistré dans le CRM » (créé) ou « ⇄ Profil mis à jour »
```

Le popup (`extension/popup.html` / `popup.js`) et le `background.js` (session dans `chrome.storage.local`, refresh token déjà implémenté) **sont déjà opérationnels** : le chantier concerne surtout le SQL + l'en-tête `Authorization` du chemin de **capture**.

---

## 4. Étape 1 — SQL (nouvelle migration)

Fichier proposé : `migration_authenticated_capture.sql` (**à créer au moment de l'implémentation**, pas de fichier .sql vide dans le repo aujourd'hui).

### 4.1 Nouvelle RPC de capture rattachée au propriétaire

```sql
create or replace function public.capture_contact_owned(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
  v_linkedin   text := nullif(p_payload->>'linkedin_url', '');
  v_threads    text := nullif(p_payload->>'threads_url', '');
  v_instagram  text := nullif(p_payload->>'instagram_url', '');
begin
  -- 1) Capture authentifiée obligatoire : plus de capture "anonyme".
  if v_uid is null then
    raise exception 'capture_contact_owned requires an authenticated user'
      using errcode = '42501';
  end if;

  -- 2) Dédupe + réclamation : une URL déjà connue est rattachée à l'appelant
  --    au lieu d'être dupliquée (rtrim gère la variante avec/sans slash final).
  select id into v_id
  from public.contacts
  where (v_linkedin  is not null and rtrim(linkedin_url, '/')  = rtrim(v_linkedin,  '/'))
     or (v_threads   is not null and rtrim(threads_url,  '/')  = rtrim(v_threads,   '/'))
     or (v_instagram is not null and rtrim(instagram_url,'/')  = rtrim(v_instagram, '/'))
  limit 1;

  if v_id is not null then
    -- Le contact appartient-il déjà à quelqu'un d'autre ? -> refus explicite.
    -- (sinon on déclencherait une "réclamation" involontaire hors perimetre)
    if exists (select 1 from public.contacts where id = v_id and user_id is distinct from v_uid) then
      return null;   -- NULL = "déjà connu d'un autre compte", rien n'est écrit
    end if;

    update public.contacts
       set user_id = v_uid,
           updated_at = now()
     where id = v_id;
    return v_id;
  end if;

  -- 3) Création : contact directement rattaché au propriétaire.
  insert into public.contacts (
    user_id, first_name, last_name, email, linkedin_url, threads_url, instagram_url,
    company, company_role, status, list, value, phone, location, website,
    avatar_url, notes
  )
  values (
    v_uid,
    p_payload->>'first_name', p_payload->>'last_name', p_payload->>'email',
    v_linkedin, v_threads, v_instagram,
    p_payload->>'company', p_payload->>'company_role', p_payload->>'status',
    p_payload->>'list', (nullif(p_payload->>'value', ''))::numeric, p_payload->>'phone',
    p_payload->>'location', p_payload->>'website', p_payload->>'avatar_url',
    p_payload->>'notes'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.capture_contact_owned(jsonb) from public;
grant execute on function public.capture_contact_owned(jsonb) to authenticated;
```

Points d'attention :

- `search_path = public` + `set search_path` : obligatoire sur une `SECURITY DEFINER`.
- L'ownership est **dans la fonction** (invariant 4) : une URL connue d'un autre compte → `NULL`, **aucune écriture**.
- `value` : cast numérique protégé par `nullif(..., '')` (même garde que l'existant).
- La liste blanche de colonnes reste identique à `capture_contact` (pas d'écriture `status`/`list`/`value` par la Refresh).

### 4.2 Retrait des droits d'écriture `anon`

```sql
revoke execute on function public.capture_contact(jsonb) from anon;
revoke execute on function public.refresh_contact_from_capture(uuid, jsonb) from anon;

-- `capture_contact` reste utilisable par `authenticated` (compat ascendante),
-- mais elle insère toujours user_id = NULL : à supprimer une fois la migration
-- de l'extension déployée (cf. §8 Rollback).
grant execute on function public.capture_contact(jsonb) to authenticated;
```

### 4.3 Vue de dédupe scopée à l'utilisateur

Point technique **important** : une vue PostgREST sans `security_invoker` s'exécute avec les droits du propriétaire de la vue → **le RLS de `contacts` n'est pas appliqué**. La vue `contact_urls` actuelle est donc lisible en global, y compris par `anon`.

```sql
create or replace view public.my_contact_urls
with (security_invoker = true) as
select id, linkedin_url, threads_url, instagram_url
from public.contacts;

revoke all on public.my_contact_urls from public;
grant select on public.my_contact_urls to authenticated;
```

→ L'extension interroge `my_contact_urls` avec le JWT : la dédupe ne voit que les contacts du caller.

### 4.4 Lignes orphelines (`user_id IS NULL`)

Deux options, à trancher (voir **D3**) :

- **(a) Backfill** vers un compte de référence (premier `auth.users`) :
  ```sql
  update public.contacts set user_id = (select id from auth.users order by created_at limit 1)
  where user_id is null;
  ```
- **(b) Stat quo** : les lignes restent « réclamables » par le dashboard (policy `owner_or_unclaimed_*`), mais plus par l'extension.

---

## 5. Étape 2 — Extension

### 5.1 `extension/content.js`

| Zone actuelle | Modification |
|---|---|
| `saveToSupabase()` → `GET /rest/v1/contact_urls` | passer en `GET /rest/v1/my_contact_urls` + `Authorization: Bearer <JWT>` |
| `saveToSupabase()` → `POST /rpc/capture_contact` | passer en `POST /rpc/capture_contact_owned`, **JWT obligatoire** |
| `saveToSupabase()` → `POST /rpc/refresh_contact_from_capture` | inchangé, mais **JWT obligatoire** (plus de repli sur la clé publishable) |
| Bloc « token absent » (aujourd'hui limité au refresh) | remonté **avant toute écriture** : `status: 'needs_login'` + `chrome.runtime.sendMessage({type:'openPopup'})` (message déjà implémenté dans `background.js`) |
| Gestion d'erreur HTTP | `401`/`403` → tenter **un** refresh via `getAccessToken()` puis rejouer la requête ; sinon message « session expirée, reconnectez-vous » |

Point de vigilance : `content.js` utilise aujourd'hui `SUPABASE_KEY` (clé publishable) comme `Bearer` en repli. Ce repli **doit disparaître** pour les trois appels ci-dessus, sinon le chantier n'apporte rien.

### 5.2 `extension/background.js`

**Aucun changement structurel requis** : `getAccessToken()` (refresh automatique, marge 30 s), `login`/`logout`/`getSessionInfo`/`openPopup` existent déjà. Éventuel ajustement : exposer un `getAccessToken` qui **échoue explicitement** quand le refresh échoue (aujourd'hui il renvoie `{loggedIn:false, error}` — le content script doit traiter ce cas comme « connexion requise »).

### 5.3 `extension/popup.js` / `popup.html`

- Afficher l'e-mail connecté + l'expiration du token (« session valide X min »).
- Message clair quand la capture est refusée : « Connectez-vous dans l'extension pour enregistrer ce contact ».

### 5.4 `extension/manifest.json`

Vérifier que `host_permissions` couvre bien `https://<projet>.supabase.co/rest/v1/*` pour l'envoi du JWT (aujourd'hui les URL sociales suffisent pour le scraping, mais les appels REST doivent être autorisés).

---

## 6. Étape 3 — Keep-alive Cloudflare (décision D2)

`keepalive-worker/src/index.js` ping `/rest/v1/${KEEPALIVE_TABLE}?select=id&limit=1` avec la clé anon, `KEEPALIVE_TABLE = "contact_urls"` (variable d'env dans `keepalive-worker/wrangler.toml`).

| Option | Effet |
|---|---|
| **A — recommandée** | Créer une vue minimale `keepalive_ping` (colonne `id` seule, **sans URL**) granting `SELECT` à `anon` ; faire pointer le worker dessus ; **retirer** le `GRANT SELECT ON contact_urls TO anon` et remplacer `contact_urls` par une vue `security_invoker` scopée au propriétaire. → plus aucune fuite d'URL en anon, le keep-alive garde son signal Postgres. |
| **B — minimale** | Garder `contact_urls` global et lisible par `anon` (dédupe mondiale + ping). → zéro changement SQL côté keep-alive, mais la fuite d'URL inter-comptes persiste. |

Dans les deux cas : `AGENTS.md` (« Extension Rules »), `README.md` §5 et §7 doivent être mis à jour pour refléter le nouveau `GRANT`.

---

## 7. Décisions à trancher avant de coder

| # | Question | Recommandation |
|---|---|---|
| **D1** | La dédupe reste-t-elle **mondiale** (URL connue d'un autre compte ⇒ refus) ou devient-elle **par utilisateur** (chaque compte a sa propre fiche) ? | **Par utilisateur** (cohérent multi-utilisateur). La version mondiale bloque l'utilisateur B sur un contact de A (cf. code §4.1). |
| **D2** | Comment exposer le ping du keep-alive ? | **Option A** (vue `keepalive_ping` minimale, `contact_urls` scopée). |
| **D3** | Que faire des lignes orphelines `user_id IS NULL` ? | **Backfill** vers le compte propriétaire initial (option a), puis restreindre les policies. |
| **D4** | Comportement de l'extension quand l'utilisateur n'est pas connecté ? | **Blocage explicite** (« connexion requise ») plutôt qu'une capture anonyme dégradée. |
| **D5** | Supprimer complètement `capture_contact` (RPC) ? | Oui, **après** déploiement de l'extension (voir §8). |

---

## 8. Ordre d'exécution & rollback

1. **SQL additif** (`capture_contact_owned`, `my_contact_urls`) — l'extension actuelle **continue de fonctionner** (les deux flux coexistent).
2. **Extension** : bascule sur `capture_contact_owned` + `my_contact_urls`, JWT obligatoire.
3. **Validation e2e** (checklist §9).
4. **Durcissement** : `revoke … from anon` sur `capture_contact` / `refresh_contact_from_capture`, drop de `capture_contact`, backfill des orphelines, restriction des policies `owner_or_unclaimed_*`.
5. **Docs** : `README.md` (§3, §5, §7), `SECURITY.md` (item 6 ✅), `AGENTS.md` (règles extension), liste des migrations du README.

**Rollback** : conserver `migration_rollback_auth_capture.sql` qui (a) recrée le `GRANT execute … to anon` sur `capture_contact`, (b) recrée la vue `contact_urls` globale. Tant que l'étape 4 n'est pas passée, le rollback est un simple redéploiement de l'ancienne extension.

---

## 9. Checklist de vérification

### 9.1 SQL / curl

```bash
K=TA_CLE_PUBLISHABLE; U=https://qleflestlmwvgicyebey.supabase.co

# 1) Anon : capture refusée (attendu 401/403)
curl -s -o /dev/null -w "%{code}\n" -X POST "$U/rest/v1/rpc/capture_contact" \
  -H "apikey: $K" -H "Authorization: Bearer $K" -H "Content-Type: application/json" \
  -d '{"p_payload":{"first_name":"Anon"}}'

# 2) Anon : lecture de la vue scopée refusée ou vide
curl -s -o /dev/null -w "%{code}\n" "$U/rest/v1/my_contact_urls?select=id&limit=1" \
  -H "apikey: $K" -H "Authorization: Bearer $K"

# 3) JWT utilisateur : capture OK -> 200 + id
curl -s -X POST "$U/rest/v1/rpc/capture_contact_owned" \
  -H "apikey: $K" -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"p_payload":{"first_name":"Test","linkedin_url":"https://linkedin.com/in/test"}}'

# 4) Keep-alive : toujours 200
curl -s -o /dev/null -w "%{code}\n" "$U/rest/v1/contact_urls?select=id&limit=1" \
  -H "apikey: $K" -H "Authorization: Bearer $K"
```

### 9.2 Contrôles SQL (dans l'éditeur Supabase)

```sql
-- Pas de doublon ni d'orphelin après double capture
select count(*) from contacts where user_id is null;
select id, user_id, linkedin_url from contacts where linkedin_url like '%test%';

-- Un contact connu d'un autre compte n'est pas réécrit par capture_contact_owned
-- (la fonction renvoie NULL, aucune ligne modifiée)
```

### 9.3 E2E extension

- [ ] Popup : login OK → e-mail affiché → capture « ✔ Enregistré dans le CRM » → la fiche apparaît **chez le bon propriétaire**.
- [ ] Sans login : « Connexion requise » → aucune ligne créée.
- [ ] Re-capture de la même URL : **pas de doublon**, pas de nouvelle ligne.
- [ ] Refresh d'un contact claimed : profil mis à jour, **email/téléphone/notes/statut/liste/valeur inchangés**.
- [ ] Token expiré → refresh automatique, ou message « session expirée ».
- [ ] Keep-alive : `curl https://ownpulse-supabase-keepalive.<sub>.workers.dev/ping` → `OK`.

---

## 10. Documentation à mettre à jour le jour J

| Fichier | Section | Modification |
|---|---|---|
| `README.md` | §3 Extension Installation | l'extension doit être connectée pour capturer (plus de capture anonyme) |
| `README.md` | §5 Security & Privacy | nouveau RPC `capture_contact_owned`, vue `my_contact_urls`, Grants |
| `README.md` | §7 Keep-Alive | nouvelle vue de ping si option A |
| `README.md` | §1 Database Setup | ajouter `migration_authenticated_capture.sql` à la liste ordonnée des migrations |
| `SECURITY.md` | item 6 « Reste à faire » | passer en ✅ + lien vers ce document |
| `AGENTS.md` | « Extension Rules » | invariants mis à jour (anon sans droits d'écriture, dédupe par utilisateur) |
| `SECURITY.md` | rappels / pièges | vérifier les commandes de contrôle (401 attendu sur `contacts`) |

---

## 11. Risques

| Risque | Impact | Parade |
|---|---|---|
| Régression sur la capture (extension inutilisable) | élevé | déploiement SQL additif d'abord, extension ensuite, rollback en 2 étapes |
| Fuite d'URL inter-comptes pendant la transition | moyen | option A (§6) + vérifier `my_contact_urls` en `anon` (401/0 ligne) |
| Perte de la dédupe globale existante (contacts déjà capturés) | moyen | la dédupe par URL se fait **dans** `capture_contact_owned` (§4.1), pas seulement via la vue |
| Keep-alive cassé → pause du projet Supabase après 7 j | élevé | ne pas retirer le `GRANT` anon avant d'avoir vérifié le ping (`/ping` → OK) |
| Lignes orphelines Mixed-ownership | moyen | backfill contrôlé + `select count(*) … where user_id is null` = 0 |
