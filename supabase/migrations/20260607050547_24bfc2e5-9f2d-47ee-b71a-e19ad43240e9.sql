-- google_connections: server-only access (admin client / service_role)
ALTER TABLE public.google_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.google_connections FROM anon, authenticated;
GRANT ALL ON public.google_connections TO service_role;

-- login_attempts: server-only access
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.login_attempts FROM anon, authenticated;
GRANT ALL ON public.login_attempts TO service_role;

-- auth_events: drop client INSERT policy (server-side only inserts via service_role)
DROP POLICY IF EXISTS auth_events_insert_own ON public.auth_events;
REVOKE INSERT ON public.auth_events FROM anon, authenticated;
GRANT ALL ON public.auth_events TO service_role;