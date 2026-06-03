
-- 1) Lock down SECURITY DEFINER trigger function (only auth trigger should call it)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 2) google_connections: contains live OAuth access tokens.
-- All app access goes through server functions using service_role; remove client access entirely.
DROP POLICY IF EXISTS gc_modify ON public.google_connections;
DROP POLICY IF EXISTS gc_select_owner ON public.google_connections;
REVOKE ALL ON public.google_connections FROM anon, authenticated;
-- service_role retains full access (granted by default to that role on owned objects); ensure it:
GRANT ALL ON public.google_connections TO service_role;

-- 3) company_members: prevent any role escalation via UPDATE/DELETE from clients.
-- Inserts already restricted to company owner; explicitly block client UPDATE and ensure DELETE is owner-only.
REVOKE UPDATE ON public.company_members FROM anon, authenticated;
