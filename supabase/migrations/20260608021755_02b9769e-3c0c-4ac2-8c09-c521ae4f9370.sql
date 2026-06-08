-- Enable RLS on realtime.messages and add authorization policy
-- Only authenticated users may subscribe, and only to topics scoped to their own user id.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read own-scoped topics" ON realtime.messages;
CREATE POLICY "Authenticated users can read own-scoped topics"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    realtime.topic() LIKE ('bgg:' || auth.uid()::text || ':%')
  );
