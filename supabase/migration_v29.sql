-- ─── Leads (prospect pipeline) ────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  email          text,
  phone          text,
  source         text,                        -- e.g. 'instagram', 'referral', 'website'
  status         text        NOT NULL DEFAULT 'new'
                             CHECK (status IN ('new','preq_sent','preq_completed','consult_scheduled','consult_completed','converted','lost')),
  notes          text,
  assigned_coach_id uuid     REFERENCES profiles(id) ON DELETE SET NULL,
  converted_client_id uuid   REFERENCES clients(id)  ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members manage leads"
  ON leads FOR ALL
  USING  (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

-- ─── Questionnaire templates ───────────────────────────────────
-- Stores the question list for PreQ and Consult (questions added later)
CREATE TABLE IF NOT EXISTS questionnaire_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('preq', 'consult')),
  title      text NOT NULL,
  questions  jsonb NOT NULL DEFAULT '[]',     -- [{id, text, type, required}]
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, type)
);

ALTER TABLE questionnaire_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members manage questionnaire templates"
  ON questionnaire_templates FOR ALL
  USING  (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

-- ─── Questionnaire responses ───────────────────────────────────
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('preq', 'consult')),
  answers     jsonb NOT NULL DEFAULT '{}',    -- {question_id: answer}
  submitted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members view questionnaire responses"
  ON questionnaire_responses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM leads l WHERE l.id = lead_id AND l.org_id = get_user_org_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads l WHERE l.id = lead_id AND l.org_id = get_user_org_id()
    )
  );

-- ─── Auto-update updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS questionnaire_templates_updated_at ON questionnaire_templates;
CREATE TRIGGER questionnaire_templates_updated_at
  BEFORE UPDATE ON questionnaire_templates
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
