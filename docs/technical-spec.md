# 技术规格说明

## 1. 文档目标

本文档定义 **vexmotor-admin + vexmotor-web** 的技术架构、工程结构、运行环境、认证方案、数据库接入方式、接口与数据契约边界。业务模块范围以 `docs/spec.md` 为准。

## 2. 技术栈

- Node.js 22.x
- pnpm 作为唯一包管理器
- Next.js 16.x 优先；若兼容性受阻，可下调到相近稳定版本，但需记录原因
- React 19.x 优先；若兼容性受阻，可下调到相近稳定版本，但需记录原因
- Ant Design 6.x 优先用于后台界面；若兼容性受阻，可下调到相近稳定版本，但需记录原因
- NextAuth.js / Auth.js 用于认证
- Neon Postgres 作为在线 PostgreSQL 数据库
- Drizzle ORM + drizzle-kit 作为数据库建模、迁移与类型安全访问方案
- OpenAPI 3.1 作为 Front API 契约规范（`docs/openapi.front.yaml`）
- Stripe + Airwallex 作为在线支付网关（信用卡 checkout）
- Aliyun OSS 作为上传对象存储（商品图、附件、注册/询盘文件等）

## 3. 总体架构

项目采用 **双 Next.js 应用 + 单一数据库** 架构：

| 应用 | 职责 |
|------|------|
| **vexmotor-admin**（:5100） | 后台 UI、`/api/admin/*`、Front API `/api/front/*`、Webhooks、Drizzle 数据访问 |
| **vexmotor-web**（:5000） | 前台商城 SSR/CSR；通过 HTTP 调用 admin Front API，不直连数据库 |

admin 侧同时承载后台管理系统与前台 REST API；web 为纯展示与交互层。

架构原则（保持不变）：

- **单一数据模型**：PostgreSQL schema 只在 admin 维护
- **业务规则不复制**：价格、库存、购物车、订单、询盘逻辑均在 admin/server
- **Front API 为前台唯一业务入口**
- **先文档后实现**：规格变更先更新 `spec.md` / OpenAPI / schema
- **鉴权分域**：后台运营身份与前台会员身份分离（见 §6）

说明：部署上为两个独立 Node 进程/构建产物，而非早期规划的「单体 Next 同时渲染前后台页面」。

## 4. 工程目录规划

### 4.1 vexmotor-admin（本文档所在仓库）

```text
/docs
  openapi.front.yaml
  spec.md
  technical-spec.md
  UI-DESIGN-SYSTEM.md
/scripts
  dev-server.mjs
  db-migrate.ts
  import-*.ts, translate-*.ts, …
/src
  /app
    /admin          # 后台 UI
    /api
      /admin        # 后台 REST
      /front        # 前台 REST（CORS）
      /webhooks     # 支付等回调
    /api-doc        # Swagger UI
  /components
  /lib
  /server
    /db
      schema.ts     # 数据模型真源
  /locales          # Admin UI 静态文案
/public
/drizzle            # SQL 迁移文件
```

说明：

- `docs/` 保存业务与技术规格、OpenAPI 契约。
- `src/app/admin` 负责后台页面（Ant Design）。
- `src/app/api/front` 为 vexmotor-web 消费的 REST API。
- `src/server` 负责服务端业务、鉴权、支付与数据库访问。

### 4.2 vexmotor-web（同级前台仓库）

```text
/src
  /app              # 前台页面路由
  /components
  /lib
    storefront-api.ts, api-client.ts, i18n*.ts, commerce-config.ts, …
  /locales
    en.json         # UI 英文 fallback；de/es 走 Admin ui-strings API
```

- 浏览器请求 `/api/front/*` 时经 `NEXT_PUBLIC_API_URL` 指向 admin。
- 服务端组件通过 `serverFetch` 调用同一 Front API（带 locale header）。

## 5. 运行环境

### 5.1 本地开发

| 应用 | 端口 | 命令 |
|------|------|------|
| vexmotor-admin | **5100** | `pnpm dev`（默认 webpack + 连库） |
| vexmotor-web | **5000** | `pnpm dev` |

- 推荐安装：`pnpm install`（两仓库各自执行）
- 推荐校验：`pnpm check`（eslint + tsc）
- 环境变量：admin 使用 `.env`（参考 `.env.example`）；web 使用 `.env.local` 配置 `NEXT_PUBLIC_API_URL=http://localhost:5100`
- 联调顺序：先启动 admin，再启动 web

说明：

- admin 的 `pnpm dev` 经 `scripts/dev-server.mjs` 启动，默认 `--db`（`DB_ENABLE_IN_DEV=true`）并固定 **webpack**（与 web 一致，避免 Windows 下 Turbopack 偶发问题）。
- 仅 admin 持有 `DATABASE_URL`；web 不连接数据库。

### 5.1.1 包管理约束

- 项目统一使用 `pnpm`，不使用 `npm install`。
- 依赖安装、锁文件和脚本执行均以 `pnpm` 为准。
- 仓库应提交 `pnpm-lock.yaml` 作为唯一锁文件。

### 5.2 核心环境变量（admin）

- `DATABASE_URL`
- `AUTH_SECRET` — 后台 NextAuth
- `JWT_SECRET` / `JWT_EXPIRES_IN` — 前台 Bearer token
- `ADMIN_URL` — 后台自身地址（NextAuth 同步 `AUTH_URL` / `NEXTAUTH_URL`）
- `SITE_URL` — 前台商城地址（CORS、邮件、支付回跳、OAuth 回调）
- `CORS_ALLOWED_ORIGINS` — 可选，多域名逗号分隔
- `STRIPE_SANDBOX_*` / `STRIPE_LIVE_*` — Stripe 密钥
- `AIRWALLEX_SANDBOX_*` / `AIRWALLEX_LIVE_*` — Airwallex 密钥
- `ALIYUN_OSS_*` — 对象存储
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — 前台 OAuth（可选）
- `TEXT_API_*` — Admin AI 翻译（OpenAI 兼容接口）
- `DB_ENABLE_IN_DEV` — 由 dev-server 注入，开发态启用真实 DB

### 5.3 数据库连接

Neon 连接串采用 PostgreSQL 兼容连接方式，首期默认使用 Node Runtime 下的 PostgreSQL 客户端接入，不使用 Edge Runtime 特有数据库访问方式。

### 5.4 推荐数据库命令

- 推送结构：`pnpm db:push`（或 `pnpm exec drizzle-kit push --force`）
- 应用 SQL 迁移：`pnpm db:migrate`
- 生成迁移文件：`pnpm db:generate`
- 可视化：`pnpm db:studio`
- 种子数据：`pnpm db:seed`

### 5.5 当前已验证的初始化路径

- 环境变量从 admin 根目录 `.env` 读取（`src/lib/env.ts` 统一加载）。
- 推荐初始化顺序：`pnpm install` → `pnpm db:push`（或 `pnpm db:migrate`）→ `pnpm db:seed`。
- 样例后台账号（seed）：`admin@lianchuan.local` / `Admin123456`。

## 6. 认证与授权

### 6.1 双域认证

| 域 | 机制 | 身份表 | 入口 |
|----|------|--------|------|
| **后台 Admin** | NextAuth / Auth.js Credentials JWT | `admins` | `/admin/login` → `/api/admin/auth/*` |
| **前台 Storefront** | 自签 JWT Bearer | `users` + `accounts` | `/api/front/auth/login`、`/register` |
| **前台 OAuth** | Google 等 → `accounts` 关联 → 签发 Front JWT | `users` + `accounts` | `/api/front/auth/oauth/*` → web `/auth/callback` |

- 后台 middleware 保护 `/admin/*`（login 除外）。
- 前台 API 在路由内校验 `Authorization: Bearer`；公开读接口（catalog、home 等）免鉴权。
- 访客订单/询盘：`verification_tokens` + `X-Guest-Order-Token` / query `guestToken`。

### 6.2 密码兼容要求

用户要求本地账号密码按以下规则处理：

- 注册时：接收明文密码，将明文转换为 MD5，再写入数据库
- 登录时：将用户输入的明文密码转换为 MD5，与数据库中的 MD5 值对比

说明：

- 该规则是项目兼容性要求，不代表安全最佳实践
- 未来若要升级加密方案，需要设计平滑迁移机制

### 6.3 会话策略

- 后台：NextAuth session/JWT，仅 `/admin` 与 `/api/admin/*` 使用。
- 前台：无服务端 session；web 将 JWT 存 localStorage，请求带 Bearer；购物车匿名 token 用 `X-Cart-Token`。
- 接口分层：**公开** Front 读接口、**会员** Front 写/账户接口、**后台** Admin API、**Webhook** 支付回调。

## 7. 前台 API 设计原则

- 契约真源：`docs/openapi.front.yaml`；运行时合并 `/api-doc`（Swagger UI）与路由 JSDoc。
- REST 风格；列表接口支持分页、排序、筛选。
- 统一错误体：`code` + `message` + 可选 `details`。
- **Locale**：`x-vex-locale` header 优先，其次 `?locale=`，默认 `en`；影响翻译表读取与展示货币。
- **CORS**：Front API 对 `SITE_URL` / `CORS_ALLOWED_ORIGINS` 开放；web 浏览器直连 admin。
- **Cart**：匿名 `X-Cart-Token`；登录后 cart 绑定 `userId`。
- 支付相关：`/checkout/payment-intent`、`/payment/confirm`、`/payment/status`；Webhook 在 admin `/api/webhooks/*`。

## 8. 数据建模原则

- **真源**：`src/server/db/schema.ts`（Drizzle ORM）。
- 结构变更：`pnpm db:generate` / `pnpm db:push` / `pnpm db:migrate`；与 `spec.md`、OpenAPI 保持对齐。
- **主表 + 翻译表**：可本地化实体（产品、分类、品牌、特性、物流方式、Editorial、UI strings）采用 `*_translations` 表，按 `locale` 存 slug、文案、SEO、locale 级价格/库存等。
- **JSON 配置列**：`commerce_settings`（阶梯价、国家运费）、`site_settings`、`editorial_settings`、`product_settings` 等存运营可配规则，避免频繁 DDL。
- **商品主表瘦身**：`products` 存 SPU、购买模式、状态、配置规则；展示名/价格/slug 在 `product_translations`。
- 开发回退：部分读路径在 DB 未就绪时可走 seed / 内存 fallback（以代码为准，生产必须连库）。

## 9. 关键业务实体

按域分组（完整定义见 `schema.ts`）：

**身份与认证**：`admins`、`users`、`accounts`、`sessions`、`verification_tokens`、`customer_messages`

**站点与 i18n**：`site_languages`、`ui_strings`、`ui_string_translations`、`exchange_rate_settings`、`exchange_rates`

**目录与商品**：`categories` + `category_translations`、`brands` + `brand_translations`、`products` + `product_translations`、`product_variants`、`inventory`、`product_images`、`attachments`、`feature_definitions` + translations、`product_feature_*`、`product_categories`、`product_relations`、`product_board_assignments`、`product_settings`

**商务与订单**：`commerce_settings`、`site_settings`、`shipping_methods` + translations、`coupons` + locale/scope 关联、`carts`、`cart_items`、`addresses`、`orders`、`order_items`、`order_shipments`、`order_coupon_redemptions`、`order_refund_requests`、`order_action_logs`

**询盘**：`inquiries`、`inquiry_messages`

**内容**：`editorial_contents` + translations、`editorial_settings`、`cms_pages`、`content_blocks`、`newsletter_subscribers`

**其他**：`geo_divisions`、`wishlists`、`compare_items`

## 10. 商品模式建模

商品需要支持两种前台行为：

- `buy`
- `inquiry`

技术要求：

- 商品表需要有明确字段表达购买模式
- 前台详情页据此决定显示加购还是询价入口
- API 和数据库命名统一优先使用 `purchaseMode`
- 若落库使用蛇形命名，则数据库字段可用 `purchase_mode`

## 11. 多语言策略

- **当前 locale**：`en`（默认，URL 无前缀）、`de`、`es`（`/de`、`/es` 前缀）；代码常量见 `lib/i18n.ts`，运营可配 `site_languages`。
- **实体翻译**：产品/分类/品牌/特性/物流/Editorial 存翻译表；API 按请求 locale 读取，fallback 链一般为请求 locale → `en`。
- **UI 文案**：Admin `ui_string_translations` + web `GET /api/front/ui-strings`；web 本地 `en.json` 为 fallback。
- **跨语言路由**：`GET /api/front/locale-path` 解析 slug 映射；web middleware 写 `site_locale` cookie 与 `x-vex-locale`。
- **货币**：locale 绑定默认货币（`site_languages` / cookie `site_currency`）；价格展示经 `exchange_rates` 转换。
- **Admin AI 翻译**：`/api/admin/ai/translate*` 批量填充翻译表（OpenAI 兼容 LLM）。

## 12. 上传与静态资源策略

- 上传走 **Aliyun OSS**（`ALIYUN_OSS_*`）；数据库存 URL 与元数据，不存二进制。
- 前台上传场景：注册验证文档、询盘附件等（`/api/front/upload/*`）。
- 商品图片/附件：Admin 维护，Front API 返回 CDN/OSS URL。
- web `public/` 存放品牌静态资源；Next `images.remotePatterns` 允许 OSS/Unsplash 等域名。

## 13. 后台实现原则

- UI：Ant Design 6 + 自研 design tokens（见 `UI-DESIGN-SYSTEM.md`）。
- 信息架构：商品 → 订单/询盘 → 促销/物流 → 内容 → 站点配置。
- 列表页服务端分页；表单字段与 schema / API 命名一致。
- 富文本：TinyMCE（blog/FAQ/CMS 等）。
- 内容看板：Editorial `contentModule` 区分 `editorial` / `faq`；与 `cms_pages` 静态页并存。

## 14. 可观测性与错误处理

- API 返回明确 `code` / `message`；Front 与 Admin 统一错误模型。
- 关键业务日志：登录、下单、支付 Webhook、询盘、后台商品/订单操作。
- 支付：`site_settings.paymentSandboxMode` 切换 sandbox/live；Admin 站点配置页可查看网关诊断。
- 邮件：当前 mock 模式（日志输出），未绑定外部 ESP。

## 15. 安全边界

- 后台接口必须鉴权
- 会员接口必须鉴权
- 公开接口仅暴露商品、分类、首页聚合等必要读取能力
- 输入验证以后续 schema 与运行时校验器为准
- 敏感信息不进入前台响应体

## 16. 文档与代码同步

规格文档与代码均已落地；后续变更按以下顺序对齐：

1. `docs/spec.md` — 业务变更
2. `src/server/db/schema.ts` — 数据模型
3. `docs/openapi.front.yaml` — Front API 契约
4. `docs/technical-spec.md` — 架构/策略变更（本文）
5. vexmotor-web — 页面与 `storefront-api` 调用

Swagger：`http://localhost:5100/api-doc`；OpenAPI JSON：`/api/openapi.json`。

## 17. 参考基线

前台信息架构与视觉组织参考：

- StepMotech
- vexmotor.com

重点参考能力：

- 首页模块编排
- 分类页筛选与商品列表
- 商品详情页图集、规格、价格、附件、询价切换
- 工业品外贸站的内容组织方式

---

## 18. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-07-04 | 对齐双项目架构、双域认证、翻译表建模、支付/OSS/locale 策略与当前 dev 端口 |
