-- ============================================================================
-- OwnPulse — Normalize social profile URLs in existing contacts
-- Run once per project.
--
-- Why: the extension normalizes profile URLs (strips query/hash, adds a
-- single trailing slash) before dedup, but contacts captured before that
-- normalization was introduced may store URLs without the trailing slash
-- or with tracking params. The extension dedup queries `contact_urls` with
-- exact equality, so those old rows were not matched and new captures
-- created duplicates instead of refreshing the existing contact.
--
-- This migration rewrites `linkedin_url`, `threads_url` and `instagram_url`
-- with the same normalization the extension applies:
--   * strip query string and fragment (`?...` / `#...`)
--   * collapse trailing slashes to exactly one
-- ============================================================================

create or replace function public.normalize_profile_url(p_url text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(
      regexp_replace(p_url, '[?#]+.*$', ''),
      '/+$', '/'
    ),
    ''
  );
$$;

update public.contacts
set
  linkedin_url  = public.normalize_profile_url(linkedin_url),
  threads_url   = public.normalize_profile_url(threads_url),
  instagram_url = public.normalize_profile_url(instagram_url)
where (linkedin_url  is not null and linkedin_url  <> public.normalize_profile_url(linkedin_url))
   or (threads_url   is not null and threads_url   <> public.normalize_profile_url(threads_url))
   or (instagram_url is not null and instagram_url <> public.normalize_profile_url(instagram_url));
