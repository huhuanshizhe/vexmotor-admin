# VexMotor Content Migration

This project now includes a reproducible extractor for legacy content migration from the old site.

## What it exports

- Product URLs discovered from sitemap and their SEO/meta data
- Category URLs and SEO/meta data
- Article URLs and page-level metadata + text excerpt
- Home banner image candidates
- Footer text + link inventory
- Static page metadata (home/content/about/contact style pages)

Output files are written to `migration/vexmotor/` by default:

- `manifest.json`
- `urls.json`
- `products.json`
- `categories.json`
- `articles.json`
- `pages.json`
- `banner.json`
- `footer.json`

## Run full snapshot

```bash
corepack pnpm migrate:vexmotor
```

## Run sampled snapshot first (recommended)

```bash
corepack pnpm migrate:vexmotor -- --maxProducts 30 --maxCategories 20 --maxArticles 20 --maxPages 10
```

## Useful options

- `--origin https://www.vexmotor.com`
- `--sitemap https://www.stepmotech.com/1_index_sitemap.xml`
- `--outDir d:/vexmotor/migration/vexmotor-full`
- `--concurrency 4`
- `--timeoutMs 20000`
- `--maxProducts 0` (0 means no limit)
- `--maxCategories 0`
- `--maxArticles 0`
- `--maxPages 0`

## Next step in migration

This snapshot is the source-of-truth input for the second-stage importer:

1. Map old categories/products into current DB schema.
2. Import editorial/blog into `editorial_content_entries`.
3. Map footer and banners into `content_blocks` and storefront shell config.
4. Run slug conflict and SEO collision checks.

## Import into database

After snapshot generation and review:

```bash
corepack pnpm db:import:vexmotor migration/vexmotor
```

Notes:

- This import is idempotent on key entities (`slug`, or `(contentType, slug, locale)`).
- Legacy blog-like pages are imported into `editorial_content_entries` as `blog` entries.
- Footer and banner payloads are imported into `content_blocks` using `footer.legacy-import` and `home.legacy-import` placements.
