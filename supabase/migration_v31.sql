-- Add non-conversion reason to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS non_conversion_reason text;
