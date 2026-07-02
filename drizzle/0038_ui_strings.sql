CREATE TABLE IF NOT EXISTS "ui_strings" (
  "key" varchar(200) PRIMARY KEY NOT NULL,
  "default_text" text NOT NULL,
  "group" varchar(64) NOT NULL,
  "context" text,
  "status" varchar(16) NOT NULL DEFAULT 'active',
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ui_string_translations" (
  "key" varchar(200) NOT NULL,
  "locale" varchar(16) NOT NULL,
  "value" text NOT NULL,
  "source" varchar(16) NOT NULL DEFAULT 'manual',
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "ui_string_translations_key_fkey" FOREIGN KEY ("key") REFERENCES "ui_strings"("key") ON DELETE CASCADE,
  CONSTRAINT "ui_string_translations_pkey" PRIMARY KEY ("key", "locale")
);

CREATE INDEX IF NOT EXISTS "ui_strings_group_idx" ON "ui_strings" ("group");
CREATE INDEX IF NOT EXISTS "ui_strings_status_idx" ON "ui_strings" ("status");
CREATE INDEX IF NOT EXISTS "ui_string_translations_locale_idx" ON "ui_string_translations" ("locale");
