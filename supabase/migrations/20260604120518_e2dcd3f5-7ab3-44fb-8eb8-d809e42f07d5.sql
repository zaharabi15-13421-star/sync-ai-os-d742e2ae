
CREATE POLICY google_connections_select_member ON public.google_connections
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.company_members m WHERE m.company_id = google_connections.company_id AND m.user_id = auth.uid()));

CREATE POLICY google_connections_insert_owner ON public.google_connections
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = google_connections.company_id AND c.owner_id = auth.uid()));

CREATE POLICY google_connections_update_owner ON public.google_connections
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = google_connections.company_id AND c.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = google_connections.company_id AND c.owner_id = auth.uid()));

CREATE POLICY google_connections_delete_owner ON public.google_connections
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = google_connections.company_id AND c.owner_id = auth.uid()));
