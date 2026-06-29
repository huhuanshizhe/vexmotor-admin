CREATE TABLE IF NOT EXISTS "exchange_rate_settings" (
  "id" varchar(32) PRIMARY KEY DEFAULT 'default',
  "base_currency_code" varchar(3) NOT NULL DEFAULT 'USD',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "exchange_rates" (
  "currency_code" varchar(3) PRIMARY KEY,
  "rate_to_base" numeric(18, 8) NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
