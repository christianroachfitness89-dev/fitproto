-- Add consult scheduling fields to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consult_scheduled_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consult_calendar_booked boolean NOT NULL DEFAULT false;
