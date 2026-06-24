ALTER TABLE "site_languages" ADD COLUMN IF NOT EXISTS "currency_code" varchar(3) DEFAULT 'USD' NOT NULL;
--> statement-breakpoint
UPDATE "site_languages" SET "currency_code" = 'USD' WHERE "code" = 'en';
--> statement-breakpoint
UPDATE "site_languages" SET "currency_code" = 'EUR' WHERE "code" = 'de';
--> statement-breakpoint
UPDATE "site_languages" SET "currency_code" = 'EUR' WHERE "code" = 'es';
--> statement-breakpoint
UPDATE "site_languages" SET "currency_code" = 'CNY' WHERE "code" = 'zh-CN';
--> statement-breakpoint
UPDATE "site_languages" SET "currency_code" = 'TWD' WHERE "code" = 'zh-TW';
--> statement-breakpoint
UPDATE "site_languages" SET "currency_code" = 'BRL' WHERE "code" = 'pt-BR';
--> statement-breakpoint
UPDATE "site_languages" SET "currency_code" = 'JPY' WHERE "code" = 'ja';
--> statement-breakpoint
UPDATE "site_languages" SET "currency_code" = 'KRW' WHERE "code" = 'ko';
--> statement-breakpoint
UPDATE "site_languages" SET "currency_code" = 'GBP' WHERE "code" IN ('en-GB', 'cy', 'ga');
