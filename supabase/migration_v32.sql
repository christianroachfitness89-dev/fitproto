-- Extend status constraint to include new pipeline stages
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN (
    'new', 'called', 'booked',
    'preq_sent', 'preq_completed',
    'consult_scheduled', 'consult_completed',
    'converted', 'lost'
  ));

-- Store per-lead call log entries
ALTER TABLE leads ADD COLUMN IF NOT EXISTS call_logs jsonb NOT NULL DEFAULT '[]';
