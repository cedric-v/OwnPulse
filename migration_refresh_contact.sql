-- ============================================================================
-- OwnPulse — Refresh contact from extension capture
-- Run once per project (after hardening_multi_user_rls.sql).
--
-- Purpose:
--   When the extension detects that a visited profile is already in the CRM
--   ("Already in CRM"), it can now refresh the profile data instead of doing
--   nothing. This is user-initiated (one click, one profile, human pace) —
--   no automated crawling of LinkedIn/Threads/Instagram, so it stays within
--   a manually-browsed usage pattern.
--
-- Design (mirrors capture_contact):
--   * SECURITY DEFINER RPC callable by `anon` (extension) and `authenticated`.
--   * The extension must first find the contact id via the `contact_urls`
--     view; this function only updates a row whose id was returned there.
--   * Whitelisted fields only: profile data (names fill-if-empty, company,
--     role, avatar, social URLs). Emails, phones, notes, status, list,
--     value and user_id are NEVER touched.
--   * Ownership invariant (same as merge_contacts): SECURITY DEFINER bypasses
--     RLS, so ownership is enforced inside the function — an authenticated
--     caller may only refresh rows they own; `anon` (auth.uid() NULL) may
--     only refresh unclaimed rows (user_id NULL). Returns NULL otherwise.
-- ============================================================================

create or replace function public.refresh_contact_from_capture(
  p_contact_id uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  -- Lock the row and verify ownership (owner or unclaimed).
  select id into v_id
  from public.contacts
  where id = p_contact_id
    and (user_id = auth.uid() or user_id is null)
  for update;

  if v_id is null then
    return null;
  end if;

  update public.contacts set
    -- Names: fill only when the CRM value is empty (manual edits win).
    first_name    = coalesce(nullif(first_name, ''), nullif(p_payload->>'first_name', '')),
    last_name     = coalesce(nullif(last_name, ''), nullif(p_payload->>'last_name', '')),
    -- Profile data: overwrite only when the capture provides a fresh value.
    company       = coalesce(nullif(p_payload->>'company', ''), company),
    company_role  = coalesce(nullif(p_payload->>'company_role', ''), company_role),
    avatar_url    = coalesce(nullif(p_payload->>'avatar_url', ''), avatar_url),
    linkedin_url  = coalesce(nullif(p_payload->>'linkedin_url', ''), linkedin_url),
    threads_url   = coalesce(nullif(p_payload->>'threads_url', ''), threads_url),
    instagram_url = coalesce(nullif(p_payload->>'instagram_url', ''), instagram_url),
    updated_at    = now()
  where id = v_id;

  return v_id;
end;
$$;

revoke all on function public.refresh_contact_from_capture(uuid, jsonb) from public;
grant execute on function public.refresh_contact_from_capture(uuid, jsonb) to anon, authenticated;
