
-- Fix 1: Remove all client-facing policies on google_connections (server-only via service_role)
DROP POLICY IF EXISTS "google_connections_select_owner" ON public.google_connections;
DROP POLICY IF EXISTS "google_connections_insert_owner" ON public.google_connections;
DROP POLICY IF EXISTS "google_connections_update_owner" ON public.google_connections;
DROP POLICY IF EXISTS "google_connections_delete_owner" ON public.google_connections;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.google_connections FROM authenticated, anon;

-- Fix 2: Restrict auth_events INSERT to own user_id only (anonymous events go via service_role)
DROP POLICY IF EXISTS "auth_events_insert_own_or_anon" ON public.auth_events;
CREATE POLICY "auth_events_insert_own" ON public.auth_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Fix 3: login_attempts is server-only — revoke client access to make intent explicit
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.login_attempts FROM authenticated, anon;
