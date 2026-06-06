DROP POLICY IF EXISTS google_connections_select_owner ON public.google_connections;
DROP POLICY IF EXISTS google_connections_modify_owner ON public.google_connections;
REVOKE ALL ON public.google_connections FROM anon, authenticated;
GRANT ALL ON public.google_connections TO service_role;