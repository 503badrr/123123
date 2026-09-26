-- Contact form submissions
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  email TEXT NOT NULL CHECK (char_length(email) BETWEEN 3 AND 120),
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 120),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 4000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_ip_hash_created ON public.contact_messages(ip_hash, created_at DESC);

-- Table privileges. INSERTs are ONLY allowed via service_role (submitContactMessage server function)
-- so that rate limiting and normalization cannot be bypassed by direct SDK calls.
GRANT SELECT, UPDATE, DELETE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;

-- RLS predicates run under the querying role, and EXECUTE on has_role(uuid, app_role)
-- is revoked from authenticated in an earlier migration. Rather than re-granting it
-- (which would let any signed-in user probe arbitrary UUIDs' roles), expose a wrapper
-- that only ever checks the caller's own role.
CREATE OR REPLACE FUNCTION public.has_current_role(_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), _role);
$$;

REVOKE EXECUTE ON FUNCTION public.has_current_role(public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_current_role(public.app_role) TO authenticated, service_role;

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- No public INSERT policy on purpose: only service_role (via submitContactMessage) writes rows.

-- Only owners and staff can read submissions
DROP POLICY IF EXISTS "contact_messages_read_staff" ON public.contact_messages;
CREATE POLICY "contact_messages_read_staff"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (public.has_current_role('owner') OR public.has_current_role('staff'));

-- Only owners can update / delete
DROP POLICY IF EXISTS "contact_messages_update_owner" ON public.contact_messages;
CREATE POLICY "contact_messages_update_owner"
  ON public.contact_messages FOR UPDATE
  TO authenticated
  USING (public.has_current_role('owner'))
  WITH CHECK (public.has_current_role('owner'));

DROP POLICY IF EXISTS "contact_messages_delete_owner" ON public.contact_messages;
CREATE POLICY "contact_messages_delete_owner"
  ON public.contact_messages FOR DELETE
  TO authenticated
  USING (public.has_current_role('owner'));
