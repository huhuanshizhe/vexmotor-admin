CREATE TABLE IF NOT EXISTS "editorial_content_boards" (
  "content_id" uuid NOT NULL REFERENCES "editorial_contents"("id") ON DELETE cascade,
  "board_key" varchar(100) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "editorial_content_boards_pk" PRIMARY KEY("content_id", "board_key")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "editorial_content_boards_board_key_idx" ON "editorial_content_boards" ("board_key");
--> statement-breakpoint
INSERT INTO "editorial_content_boards" ("content_id", "board_key")
SELECT "id", "board_key" FROM "editorial_contents"
WHERE trim("board_key") <> ''
ON CONFLICT DO NOTHING;
