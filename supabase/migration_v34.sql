-- v34: PT Session Logs — workout records + accountability tasks

CREATE TABLE IF NOT EXISTS session_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  session_date    date        NOT NULL DEFAULT CURRENT_DATE,
  session_time    time,
  workout_type    text,
  client_weight_kg numeric(5,2),
  session_notes   text,
  status          text        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open', 'completed')),
  tasks           jsonb       NOT NULL DEFAULT '[]',
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members manage session logs"
  ON session_logs FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  );
