-- OwnPulse — prospecting activity history
-- Run once on an existing project after the core contacts/tasks tables exist.
-- This records each outreach action without duplicating contacts.notes,
-- contacts.first_contact_date, contacts.acquisition_channel, or tasks.

CREATE TABLE IF NOT EXISTS public.contact_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
    channel TEXT NOT NULL CHECK (channel IN ('LinkedIn', 'Email', 'Phone', 'WhatsApp', 'Instagram', 'Threads', 'Other')),
    outcome TEXT NOT NULL CHECK (outcome IN ('Message sent', 'Conversation started', 'No response', 'Follow-up needed', 'Meeting booked', 'Not interested', 'Wrong contact', 'Other')),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_activities TO authenticated, service_role;
REVOKE ALL ON public.contact_activities FROM anon, public;

ALTER TABLE public.contact_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_full_access" ON public.contact_activities;
CREATE POLICY "owner_full_access" ON public.contact_activities
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_contact_activities_contact_id
    ON public.contact_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_activities_user_created_at
    ON public.contact_activities(user_id, created_at DESC);
