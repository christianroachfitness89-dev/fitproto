-- v33: Follow Up pool — new status + follow_up_date column

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN (
    'new', 'called', 'booked', 'preq_sent', 'preq_completed',
    'consult_scheduled', 'consult_completed', 'converted', 'lost', 'follow_up'
  ));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_date date;
