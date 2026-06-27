ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_documents" jsonb DEFAULT '[]'::jsonb NOT NULL;
