-- ============================================================================
-- OwnPulse — Merge duplicate contacts
-- Run once on an existing project (idempotent, safe to re-run).
--
-- merge_contacts(p_primary_id uuid, p_duplicate_ids uuid[])
--   * Atomically merges the duplicate contacts INTO the primary contact.
--   * Field policy: the primary contact's non-empty values win; empty fields
--     are filled from the duplicates (first duplicate in the array wins).
--   * Lists are unioned (case-insensitive dedup, primary first).
--   * Notes are appended with a traceable "--- Fusionné depuis ... ---" marker.
--   * Tasks, sales and prospecting activities are re-attached to the primary.
--   * The duplicates are deleted; the primary contact id is returned.
--   * Ownership: only contacts owned by the caller, or unclaimed rows
--     (user_id NULL, captured by the anonymous extension), can be merged.
--     The primary becomes claimed (user_id = auth.uid()) after the merge.
--
-- Security: SECURITY DEFINER scoped to exactly this operation. Grants are
-- limited to the authenticated role; anon has no access. RLS is bypassed by
-- the definer, so ownership is enforced inside the function.
-- ============================================================================

create or replace function public.merge_contacts(p_primary_id uuid, p_duplicate_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_owner      uuid := auth.uid();
    v_primary    public.contacts%rowtype;
    v_dup        public.contacts%rowtype;
    v_dup_id     uuid;
    v_lists      text[];
    v_label      text;
begin
    if v_owner is null then
        raise exception 'Not authenticated';
    end if;

    -- Load the primary contact and check the caller may operate on it.
    select * into v_primary from public.contacts where id = p_primary_id;
    if not found then
        raise exception 'Primary contact not found';
    end if;
    if v_primary.user_id is not null and v_primary.user_id <> v_owner then
        raise exception 'Primary contact is not owned by the current user';
    end if;

    -- Start from the primary's current lists (normalized).
    v_lists := array(
        select trim(x)
        from unnest(string_to_array(coalesce(v_primary.list, ''), ',')) as x
        where trim(x) <> ''
    );

    foreach v_dup_id in array p_duplicate_ids loop
        if v_dup_id = p_primary_id then
            continue;
        end if;

        select * into v_dup from public.contacts where id = v_dup_id;
        if not found then
            raise exception 'Duplicate contact % not found', v_dup_id;
        end if;
        if v_dup.user_id is not null and v_dup.user_id <> v_owner then
            raise exception 'Duplicate contact % is not owned by the current user', v_dup_id;
        end if;

        -- Primary wins on non-empty fields; empty fields are filled from duplicates.
        v_primary.first_name               := coalesce(v_primary.first_name, v_dup.first_name);
        v_primary.last_name                := coalesce(v_primary.last_name, v_dup.last_name);
        v_primary.email                    := coalesce(v_primary.email, v_dup.email);
        v_primary.phone                    := coalesce(v_primary.phone, v_dup.phone);
        v_primary.location                 := coalesce(v_primary.location, v_dup.location);
        v_primary.website                  := coalesce(v_primary.website, v_dup.website);
        v_primary.linkedin_url             := coalesce(v_primary.linkedin_url, v_dup.linkedin_url);
        v_primary.threads_url              := coalesce(v_primary.threads_url, v_dup.threads_url);
        v_primary.instagram_url            := coalesce(v_primary.instagram_url, v_dup.instagram_url);
        v_primary.company                  := coalesce(v_primary.company, v_dup.company);
        v_primary.company_id               := coalesce(v_primary.company_id, v_dup.company_id);
        v_primary.company_role             := coalesce(v_primary.company_role, v_dup.company_role);
        v_primary.status                   := coalesce(v_primary.status, v_dup.status);
        v_primary.avatar_url               := coalesce(v_primary.avatar_url, v_dup.avatar_url);
        v_primary.acquisition_channel      := coalesce(v_primary.acquisition_channel, v_dup.acquisition_channel);
        v_primary.first_contact_date       := coalesce(v_primary.first_contact_date, v_dup.first_contact_date);
        v_primary.customer_conversion_date := coalesce(v_primary.customer_conversion_date, v_dup.customer_conversion_date);
        if v_primary.value is null or v_primary.value = 0 then
            v_primary.value := v_dup.value;
        end if;

        -- Union of lists (case-insensitive, primary first).
        v_lists := v_lists || array(
            select trim(x)
            from unnest(string_to_array(coalesce(v_dup.list, ''), ',')) as x
            where trim(x) <> ''
              and lower(trim(x)) not in (select lower(y) from unnest(v_lists) as y)
        );

        -- Append the duplicate's notes with a traceable marker.
        if v_dup.notes is not null and btrim(v_dup.notes) <> '' then
            v_label := coalesce(
                nullif(btrim(coalesce(v_dup.first_name, '') || ' ' || coalesce(v_dup.last_name, '')), ''),
                'un contact'
            );
            v_primary.notes := concat(
                nullif(btrim(coalesce(v_primary.notes, '')), ''),
                E'\n\n--- Fusionné depuis ' || v_label || ' (' || v_dup_id
                    || ', ' || to_char(coalesce(v_dup.created_at, now()), 'YYYY-MM-DD') || ') ---\n',
                btrim(v_dup.notes)
            );
        end if;

        -- Re-attach child rows before deleting the duplicate.
        update public.tasks
           set contact_id = p_primary_id
         where contact_id = v_dup_id;

        update public.sales
           set contact_id = p_primary_id
         where contact_id = v_dup_id;

        update public.contact_activities
           set contact_id = p_primary_id
         where contact_id = v_dup_id;

        delete from public.contacts where id = v_dup_id;
    end loop;

    -- Persist the merged primary (and claim it if it was unclaimed).
    update public.contacts
       set first_name               = v_primary.first_name,
           last_name                = v_primary.last_name,
           email                    = v_primary.email,
           phone                    = v_primary.phone,
           location                 = v_primary.location,
           website                  = v_primary.website,
           linkedin_url             = v_primary.linkedin_url,
           threads_url              = v_primary.threads_url,
           instagram_url            = v_primary.instagram_url,
           company                  = v_primary.company,
           company_id               = v_primary.company_id,
           company_role             = v_primary.company_role,
           status                   = v_primary.status,
           list                     = array_to_string(v_lists, ', '),
           value                    = v_primary.value,
           avatar_url               = v_primary.avatar_url,
           notes                    = v_primary.notes,
           acquisition_channel      = v_primary.acquisition_channel,
           first_contact_date       = v_primary.first_contact_date,
           customer_conversion_date = v_primary.customer_conversion_date,
           user_id                  = v_owner,
           updated_at               = now()
     where id = p_primary_id;

    return p_primary_id;
end;
$$;

revoke all on function public.merge_contacts(uuid, uuid[]) from public;
grant execute on function public.merge_contacts(uuid, uuid[]) to authenticated;

comment on function public.merge_contacts(uuid, uuid[]) is
    'Merge duplicate contacts into a primary contact (fields, lists, notes, tasks, sales, activities) and delete the duplicates.';
