-- ============================================================================
-- OwnPulse — Convert legacy LinkedIn slugs into full profile URLs
-- Run once per project, AFTER fix_normalize_contact_urls.sql (it reuses
-- normalize_profile_url()).
--
-- Why: contacts captured by an older version of the extension (or imported)
-- store a bare LinkedIn handle in `linkedin_url` (e.g. "boris-pellissier-
-- 221a33213") instead of a full profile URL. The extension dedup queries
-- `contact_urls` with exact equality against "https://www.linkedin.com/in/
-- <handle>/", so none of these rows can ever match and every re-visit of
-- the profile creates a duplicate contact.
--
-- Fix: prefix the bare slugs with the standard LinkedIn profile base and
-- normalize (single trailing slash). Only bare slugs are rewritten — values
-- that already look like URLs are left untouched.
--
-- Note: if a stored slug does not match the profile's CURRENT vanity URL
-- (LinkedIn vanities can change), the row will still not dedup; correct the
-- field manually on the contact page (it is editable) and merge the
-- duplicate created in the meantime.
-- ============================================================================

update public.contacts
set linkedin_url = public.normalize_profile_url('https://www.linkedin.com/in/' || btrim(linkedin_url))
where linkedin_url is not null
  and linkedin_url not like 'http%'
  and linkedin_url not like '%/%';
