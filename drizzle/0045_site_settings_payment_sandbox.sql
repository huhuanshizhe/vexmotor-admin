ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS payment_sandbox_mode boolean NOT NULL DEFAULT true;
