DROP POLICY IF EXISTS google_connections_select_member ON public.google_connections;

CREATE POLICY google_connections_select_owner
ON public.google_connections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = google_connections.company_id
      AND c.owner_id = auth.uid()
  )
);