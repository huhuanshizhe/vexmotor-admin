# 项目业务规格

## 1. 文档目标

本文档是 **STEPMOTECH 外贸电商前后台（vexmotor-admin + vexmotor-web）** 的业务规格说明书，定义业务范围、角色、产品模块、核心流程、业务对象与验收标准。

- **业务真源**：产品、运营、研发对齐以本文档为准。
- **适用范围**：前台商城（`vexmotor-web`）、后台运营与 Front API（`vexmotor-admin`）、共享 PostgreSQL 数据模型。
- **不在本文档范围**：具体 API 字段、表结构字段级定义——分别见 `openapi.front.yaml` 与 `src/server/db/schema.ts`。

## 2. 项目概述

### 2.1 品牌与定位

面向海外工业品客户的 **B2B/B2C 混合型** 电商站点，主营步进电机、驱动器及相关运动组件。前台视觉与信息架构参考 StepMotech / vexmotor 工业品外贸站风格。

### 2.2 工程拆分

| 项目 | 职责 | 默认端口 |
|------|------|----------|
| **vexmotor-admin** | 后台 UI（`/admin`）、后台 API（`/api/admin/*`）、前台 REST API（`/api/front/*`）、数据库、支付 Webhook | 5100 |
| **vexmotor-web** | 前台商城 SSR/CSR 站点，通过 HTTP 调用 admin 的 Front API | 5000 |

原则：

- **单一数据模型**：数据库与业务规则只在 admin 侧维护。
- **Front API 为前台唯一业务入口**：web 不直连数据库。
- **Admin 与 Front 认证分离**：运营人员与客户使用不同身份体系。

### 2.3 核心业务能力（当前）

- 多语言目录（en / de / es）与 locale 级商品/内容翻译
- 标准购买流：浏览 → 购物车 → 结账 → Stripe / Airwallex 在线支付 → 订单履约
- 询价/RFQ 流：按商品 `purchaseMode` 切换购买或询价；报价后可转 checkout
- B2B 注册、公司资料、地址簿、优惠券、阶梯批量价、国家运费与税费估算
- 后台完整商品/分类/品牌/订单/询盘/内容/站点配置运营能力

---

## 3. 业务目标

- 支持工业品商品目录化展示、分类筛选与全站搜索。
- 支持 `buy` 与 `inquiry` 双模式商品及对应前台交互。
- 支持匿名与登录用户的购物车、结账、在线支付与订单自助查询。
- 支持 RFQ/样品/定制/批量价等销售线索 intake，并在后台跟进报价。
- 支持会员中心：资料、公司、地址、订单、报价/询盘、收藏、对比。
- 支持后台统一维护商品、价格、库存、物流、促销、内容与站点语言市场。
- 支持 SEO：多语言 URL、sitemap、结构化数据、可索引营销页与 noindex 交易页。

---

## 4. 用户角色

### 4.1 游客

- 浏览首页、分类、搜索、商品详情、博客、FAQ、支持页与公司页。
- 将 `buy` 模式商品加入购物车（匿名 cart token）。
- 提交 RFQ、样品申请、联系表单、Newsletter 订阅。
- 注册账号；访客结账并获取 guest order token 查单。

### 4.2 注册用户（Storefront Customer）

- 邮箱密码登录；Google OAuth 登录（JWT Bearer）。
- 维护个人资料、公司资料、地址簿、密码与语言偏好。
- 管理购物车、应用优惠券、结账与在线支付。
- 查看订单列表/详情；取消未付订单；提交退款申请。
- 查看报价/询盘列表与消息线程；已报价项目可发起 checkout。
- 收藏（Wishlist）、产品对比（Compare）。
- 接收注册赠送优惠券（若后台配置）。

### 4.3 后台运营人员（Admin）

- 管理商品、分类、品牌、特性定义、产品看板、阶梯价。
- 管理订单队列、发货、退款处理与订单审计。
- 管理询盘/报价、客户账户、站内消息。
- 管理优惠券与发放批次。
- 管理物流方式、国家运费、汇率与站点设置。
- 管理 FAQ/博客/Editorial 看板、CMS 页面与 UI 文案。
- 管理站点语言市场（`site_languages`）。

### 4.4 超级管理员（Super Admin）

- 拥有全部后台权限（`admins.role = super_admin`）。
- 管理系统级配置、支付 sandbox/live 诊断等。

---

## 5. 业务模式

### 5.1 标准购买模式（`purchaseMode = buy`）

- 商品详情页展示 locale 价格、库存、可配置特性、数量选择与加购。
- 支持 PLP/PDP 加购、Buy Now、购物车合并结账。
- 结账时选择/填写收货与账单地址、物流方式、支付方式（在线卡支付为主）。
- 下单后生成订单；信用卡订单进入 Stripe 或 Airwallex 支付页。
- 支付成功后订单进入待处理/履约流程；会员中心与 guest token 均可查单。

### 5.2 询价模式（`purchaseMode = inquiry`）

- 商品不可直接加购或标准 checkout。
- 前台通过 RFQ 表单、联系表单、样品/定制/批量价 intake 收集需求。
- 后台维护报价行（`quotedLines`）、有效期与销售状态。
- 客户登录后可通过 `fromQuote` 将已报价项目转为订单并支付。

### 5.3 双模式规则

| 模式 | 加购 | 标准 Checkout | 展示价格/参数/附件 |
|------|------|---------------|-------------------|
| `buy` | ✓ | ✓ | ✓ |
| `inquiry` | ✗ | ✗（除非已报价转单） | ✓ |

每个商品在后台必须明确 `purchaseMode`；仅 `status = active` 的商品对外销售或展示为可购买。

### 5.4 B2B 注册与合规

- 注册支持快速注册与完整 B2B 注册（公司信息、出口合规声明、条款确认）。
- 可选上传验证文档（OSS）。
- Admin 手工创建的客户默认为 `pending`，需审核；自助注册默认为 `active`。
- 公司资料可在会员中心与 checkout 复用。

---

## 6. 前台产品模块（vexmotor-web）

### 6.1 全局框架

- 顶部通知条、信任文案条、Logo、全站搜索、语言切换、购物车/报价/对比/收藏/账户入口。
- 主导航：Home、Products（分类树）、Blog、FAQ、About、Contact。
- Cookie 同意条、Newsletter、统一 StorefrontFrame 页壳与 SEO 元数据。

### 6.2 营销与目录

| 模块 | 路径 | 说明 |
|------|------|------|
| 首页 | `/` | Hero、分类入口、Hot/New/Featured、博客、Newsletter |
| 产品 Hub | `/products` | 目录入口、行业/资源快捷链接 |
| 分类索引 | `/categories` | 全部分类 |
| 分类 PLP | `/c/[categorySlug]` | 筛选、排序、分页、加购/询价/对比/收藏 |
| 商品 PDP | `/products/[slug]` | 图集、locale 价格、特性配置、volume tier、文档、相关推荐 |
| 搜索 | `/search` | 产品/资源/FAQ/文档统一搜索 |
| 选型器 | `/selector` | 多步电机选型向导 |
| 对比 | `/compare` | 产品对比矩阵（noindex） |
| 行业方案 | `/solutions`, `/solutions/[industry]` | 行业落地页 |

### 6.3 交易

| 模块 | 路径 | 说明 |
|------|------|------|
| 购物车 | `/cart` | 改数量、删行、优惠券、运费/税费预览 |
| 结账 | `/checkout` | Guest/登录；支持 cart、buy-now、from-quote |
| 支付 | `/checkout/pay/[orderNumber]` | Stripe Payment Element / Airwallex Drop-in |
| 确认 | `/checkout/confirmation/[orderNumber]` | 下单成功页；guest token 可查 |

### 6.4 销售线索 Intake

| 模块 | 路径 | 说明 |
|------|------|------|
| RFQ | `/quote` | 多行 SKU、附件、项目说明 |
| 样品 | `/sample` | 样品申请（inquiry） |
| 批量价 | `/volume-pricing` | 合同/批量价 intake |
| 定制 | `/custom` | 定制开发 intake |
| 联系 | `/contact` | 销售/工程联系 |
| 公开询盘 | `/inquiries/[inquiryId]` | 询盘快照（token/权限控制） |

### 6.5 会员中心

侧栏导航：Overview → Orders → Quotes → Addresses → Company → Invoices → Downloads → Settings。

| 模块 | 路径 | 数据状态 |
|------|------|----------|
| 概览 | `/account` | API + 部分展示 mock |
| 订单 | `/account/orders`, `/account/orders/[orderNumber]` | **API** |
| 报价/询盘 | `/account/quotes`, `/account/quotes/[quoteNumber]` | **API**（inquiries） |
| 地址 | `/account/addresses` | **API** |
| 公司 | `/account/company` | **API** |
| 设置 | `/account/settings` | **API**（资料、密码、locale） |
| 收藏 | `/account/wishlist` | **API**（不在侧栏，独立路由） |
| 发票 | `/account/invoices` | **UI mock**，无后端持久化 |
| 下载 | `/account/downloads` | **UI mock** |
| 清单/复购 | `/account/lists`, `/account/reorder` | **mock + catalog** |

### 6.6 认证

| 模块 | 路径 | 说明 |
|------|------|------|
| 登录 | `/login` | 邮箱密码 |
| 注册 | `/register` | B2B 注册 + 文档上传 |
| 密码重置 | `/password-reset` | 请求邮件 + token 确认 |
| OAuth 回调 | `/auth/callback` | Google 等 OAuth 回跳 |

### 6.7 内容与支持

| 模块 | 路径 | 数据来源 |
|------|------|----------|
| 博客 | `/blog`, `/blog/[slug]`, `/blog/t/[topic]` | Admin editorial API |
| FAQ | `/faq` | Admin FAQ board |
| 术语 | `/glossary` | Admin knowledge + 本地 fallback |
| 资源库 | `/resources`, `/resources/[section]` | 本地 seed + 门禁下载 |
| 应用案例 | `/applications`, `/applications/[slug]` | 本地 seed |
| 法律 | `/legal/[slug]` | 本地/CMS |
| Help Center | `/support` | 本地 hub（`/support` 可重定向 FAQ） |
| 支持子页 | `/support/shipping`, `/returns`, `/payment-methods`, `/contact`, `/after-sales` 等 | 独立页面 + commerce 配置 |
| 动态支持文 | `/support/[slug]` | 本地 seed |
| 公司 | `/company/about`, `/factory`, `/certifications`, `/careers`, `/press` 等 | 混合：本地 + Admin press |
| Legacy CMS | `/content/[legacySlug]` | Admin `cms_pages` |

### 6.8 SEO 与索引策略

- 动态 `sitemap.xml`：静态营销路由 + Admin 分类/商品（上限 1000 SKU）× 各 locale。
- `robots.txt`：disallow 账户、结账、购物车、搜索、对比、quote 等交易/工具页。
- 页面级 canonical、hreflang、JSON-LD（Organization、Product、Article、FAQ、Breadcrumb）。
- 交易与账户页默认 `noIndex`。

---

## 7. 后台产品模块（vexmotor-admin）

### 7.1 仪表盘

- `/admin`：产品/分类/品牌/客户/订单/询盘/低库存/内容/收入概览；最近订单与询盘。

### 7.2 产品管理

| 模块 | 路径 | 能力 |
|------|------|------|
| 产品 | `/admin/products` | CRUD、多 locale 翻译、变体、库存、图片、分类/品牌、特性配置、`purchaseMode` |
| 产品看板 | `/admin/products/boards` | Coverage boards 与产品分配 |
| 分类 | `/admin/categories` | 分类树、排序、locale slug/SEO |
| 品牌 | `/admin/brands` | 品牌与多语言 |
| 特性定义 | `/admin/product-features` | 全局 spec 定义及翻译 |
| 阶梯价 | `/admin/volume-pricing` | `volumePricingRules`（数量 → 折扣系数） |

### 7.3 促销

- `/admin/promotion/coupons`：优惠券类型（直减/百分比/满减/特价）、适用范围、locale 门槛、发放批次、注册赠送。

### 7.4 订单与客户

| 模块 | 路径 | 能力 |
|------|------|------|
| 待处理订单 | `/admin/orders` | 订单队列 |
| 订单详情/历史/退款 | `/admin/orders/*` | 状态更新、发货、退款处理、审计日志 |
| 活跃询盘 | `/admin/inquiries` | 报价、消息、队列 |
| 询盘历史 | `/admin/inquiries/history` | 历史记录 |
| 客户 | `/admin/customers` | 账户、地址、消息、审核、重置密码 |

### 7.5 仓储物流

- `/admin/logistics/shipping`：物流方式（多语言名称/ETA）、国家/洲运费费率、默认物流方式。

### 7.6 内容管理

| 模块 | 路径 | 能力 |
|------|------|------|
| Editorial 看板 | `/admin/editorial/boards` | 看板配置与 automation |
| 博客 | `/admin/editorial` | `contentModule=editorial` |
| FAQ | `/admin/faq` | `contentModule=faq` |
| CMS | `/admin/content` | `cms_pages`、`content_blocks` |

### 7.7 站点管理

| 模块 | 路径 | 能力 |
|------|------|------|
| 语言市场 | `/admin/languages` | `site_languages` 启停、默认语言、货币、国家 |
| UI 文案 | `/admin/ui-strings` | 前台 UI key 多语言翻译 |
| 汇率 | `/admin/site/exchange-rates` | 基准货币与汇率快照 |
| 站点配置 | `/admin/site/config` | 默认货币/国家、支付 sandbox/live 诊断 |

### 7.8 Front API（`/api/front/*`）

面向 web 的 REST API，按域包括但不限于：

- **Catalog**：home、navigation、categories、products、search、product-boards、compare、wishlist
- **Cart/Checkout**：cart、checkout/orders、payment-intent、payment/confirm、payment/status、buy-now/quote preview
- **Orders**：orders、guest orders、cancel、refund-requests、payment-gateway-status
- **Account**：profile、company、addresses、account/summary
- **Auth**：login、register、logout、change-password、password-reset、OAuth
- **Inquiries**：inquiries CRUD、messages、SSE stream、upload
- **Content**：boards/blogs/faqs、blog、press、knowledge、cms/legacy
- **Commerce/Site**：commerce、site-settings、languages、ui-strings、locale-path
- **Geo/Meta**：countries、divisions、country-continents、industries
- **Other**：newsletter、upload/registration

契约详见 `docs/openapi.front.yaml`；Swagger UI：`/api-doc`。

---

## 8. 核心业务流程

### 8.1 购物车

- 匿名用户：`X-Cart-Token` + localStorage 持久化。
- 登录用户：cart 绑定 `userId`；登录后合并匿名 cart。
- 行项目按 `productId + configurationKey + featureSelections` 去重。
- 支持 locale 价格、阶梯价预览、优惠券试算。

### 8.2 结账与下单

- Guest 必须提供 `contactEmail`；登录用户选择已保存地址。
- 选择 `shippingMethod`；运费/税费按 `commerce_settings` 与国家费率计算。
- 创建订单：`POST /api/front/checkout/orders`。
- 非信用卡支付方式不创建在线 PaymentIntent。

### 8.3 在线支付

- **Stripe**：默认信用卡路径；Payment Element（card only 配置以当前代码为准）。
- **Airwallex**：订单已有 Airwallex intent 时走 Airwallex；Webhook 确认支付成功。
- 支付成功后：`paymentStatus = paid`，订单进入履约队列。
- Guest 订单支付/查询依赖 guest order token。

### 8.4 订单生命周期

独立状态轴：

- **status**：如 unpaid、pending_processing、processing、shipped、completed、cancelled 等
- **paymentStatus**：unpaid / paid / …
- **shippingStatus**：unshipped / partial / shipped / …
- **refundStatus**：none / requested / approved / rejected / …

前台能力（由 API 计算 flags）：

- `canPay`：未付 + 信用卡订单
- `canCancel`：未付且可取消
- `canRequestRefund`：已付且未在退款流程中

后台能力：录入 `order_shipments`、处理退款、终止订单、审计 `order_action_logs`。

### 8.5 RFQ / 报价

- 创建询盘：游客或登录用户；生成 `quoteNumber`（`QT-YYMMDD-####`）。
- 消息线程 + SSE 推送；Admin 维护 `quotedLines`、`expiresAt`、`salesStatus`。
- 已报价且登录用户：checkout `?fromQuote=` 转订单。

### 8.6 优惠券

- 类型：直减、百分比、满减、特价；范围：全站/分类/品牌/商品；可配置 stackable。
- Locale 级门槛与折扣值（`coupon_locale_pricing`）。
- 发放：后台批量、注册自动赠送、用户自助领取。
- 购物车/结账应用后写入 `order_coupon_redemptions`。

### 8.7 物流与 landed cost

- 物流方式多语言展示；国家/洲级 `shippingCountryRates`。
- 支持免运门槛；Support Shipping 页与 Cart 共用 commerce 配置估算。
- 税费按国家费率估算（非最终海关结论，页面需声明）。

---

## 9. 国际化与市场

### 9.1 语言（Locale）

- 当前支持：**en**（默认，URL 无前缀）、**de**、**es**（`/de/...`、`/es/...`）。
- 解析优先级：`x-vex-locale` header > `?locale=` > 默认 en。
- 切换语言时调用 `locale-path` API 解析目标 locale 的等价 URL（含 slug 映射）。

### 9.2 翻译来源

| 层级 | 说明 |
|------|------|
| 实体翻译表 | 产品、分类、品牌、特性、物流、Editorial、UI strings 按 locale 存储 |
| UI 文案 | Admin `ui_string_translations`；web 以 en.json 为 fallback |
| 站点语言市场 | DB `site_languages` 控制启用语言、默认货币、国家集合 |

### 9.3 货币与单位

- 支持 USD、EUR、GBP；随 locale 默认（en→USD，de/es→EUR）。
- Cookie：`site_currency`、`site_unit_system`（imperial/metric）。
- 展示价格经 `exchange_rates` 转换；**前台无独立货币切换器**，随 locale/market 自动设置。
- 商品底价存于 `product_translations`（locale 级 price/stock/MOQ 等）。

---

## 10. 认证与安全

| 域 | 身份存储 | 机制 |
|----|----------|------|
| 后台 Admin | `admins` | NextAuth Credentials JWT；middleware 保护 `/admin/*` |
| 前台 Customer | `users` + `accounts` | 自签 JWT Bearer；Google OAuth |
| 访客订单/询盘 | `verification_tokens` | Guest order token / inquiry access token |

- Front API CORS 允许 `SITE_URL`（及可选 `CORS_ALLOWED_ORIGINS`）。
- 密码存储：MD5 hash（遗留格式，后续可规划升级）。
- 敏感配置（`DATABASE_URL`、支付密钥）仅存在于 admin 环境。

---

## 11. 实现状态矩阵

| 能力 | 状态 | 备注 |
|------|------|------|
| 目录 / 搜索 / PDP | ✅ 已实现 | Admin API + ISR |
| 购物车 / 结账 / 支付 | ✅ 已实现 | Stripe + Airwallex |
| 订单自助（查/取消/退款申请） | ✅ 已实现 | |
| RFQ / 样品 / 联系 intake | ✅ 已实现 | inquiries API |
| 报价转 checkout | ✅ 已实现 | fromQuote |
| 地址 / 资料 / 公司 / 设置 | ✅ 已实现 | |
| Wishlist / Compare | ✅ 已实现 | |
| 优惠券 | ✅ 已实现 | |
| 阶梯价 / 国家运费 / 汇率 | ✅ 已实现 | commerce API |
| 多语言 UI + 实体翻译 | ✅ 已实现 | en/de/es |
| Google OAuth | ✅ 已实现 | |
| 密码重置 | ✅ 已实现 | |
| 博客 / FAQ / Press / Knowledge | ✅ 已实现 | Admin content API |
| CMS 法律/静态页 | ✅ 已实现 | cms_pages + 本地 legal |
| Support 子页（shipping 等） | ✅ 已实现 | 含运费估算器 |
| 账户 Invoices / Downloads | ⚠️ 部分 | UI mock，无后端 |
| Saved Lists / Reorder | ⚠️ 部分 | mock + catalog 搜索 |
| Support 动态文章 hub | ⚠️ 部分 | 本地 seed，非 Admin CMS |
| 独立货币切换器 | ❌ 未实现 | 随 locale 默认 |
| 邮件营销自动化 | ❌ 未实现 | Newsletter 订阅已入库 |
| CMS 可视化装修 | ❌ 未实现 | 块/看板配置代替 |

---

## 12. 业务对象与状态约定

### 12.1 核心对象

| 中文 | 英文 | 主表 |
|------|------|------|
| 商品 | Product | `products` + `product_translations` |
| 分类 | Category | `categories` + `category_translations` |
| 品牌 | Brand | `brands` + `brand_translations` |
| 购物车 | Cart | `carts` + `cart_items` |
| 订单 | Order | `orders` + `order_items` |
| 询盘/报价 | Inquiry/Quote | `inquiries` + `inquiry_messages` |
| 地址 | Address | `addresses` |
| 会员 | User | `users` |
| 收藏 | Wishlist | `wishlists` |
| 优惠券 | Coupon | `coupons` + locale/scope 关联表 |
| 内容条目 | Editorial | `editorial_contents` + translations |
| 站点语言 | Site Language | `site_languages` |

### 12.2 商品标识

- **SPU**：商品主标识（`products.spu`），对外展示于 PDP/订单行。
- **Slug**：locale 级（`product_translations.slug`），用于 SEO URL。
- 变体/库存：`product_variants`、`inventory`（available/reserved）。

### 12.3 命名与 API 约定

- 前台询价/报价在 UI 上统称 Quotes，数据模型为 `inquiries`。
- `quoteNumber` 即询盘编号（`QT-*`）。
- OpenAPI 与 Front API 路径前缀：`/api/front`。

---

## 13. 验收标准

### 13.1 购买链路

- `buy` 商品可从 PLP/PDP 加购，经 checkout 创建订单并完成 Stripe/Airwallex 支付（sandbox）。
- 支付成功后会员中心与 confirmation 页可见订单；Guest 凭 token 可查。
- 未付订单可取消；已付订单可提交退款申请。

### 13.2 询价链路

- `inquiry` 商品无加购按钮，可进入 RFQ/联系 intake。
- 后台可查看询盘、回复消息、维护报价行。
- 已报价项目登录用户可通过 fromQuote checkout 转订单。

### 13.3 多语言

- en/de/es 路由前缀正确；切换语言后落在等价页面（slug 不同时走 locale-path 解析）。
- 产品/分类/导航/UI 文案随 locale 变化；无翻译时英文 fallback。

### 13.4 后台一致性

- 后台修改商品 price/stock/purchaseMode/status/locale 翻译后，前台 API 与页面展示一致（考虑 ISR 缓存延迟）。
- 优惠券、运费、阶梯价规则变更后，cart/checkout 计算结果与配置一致。

### 13.5 内容与 SEO

- sitemap 可访问且含主要营销页与 catalog URL。
- robots 屏蔽 checkout/account 等私有页。
- PDP/博客/FAQ 具备基本 JSON-LD。

---

## 14. 文档依赖关系

| 文档/代码 | 角色 |
|-----------|------|
| **`docs/spec.md`（本文）** | 业务真源 |
| `docs/technical-spec.md` | 技术架构、工程约定；模块范围与本文一致 |
| `docs/openapi.front.yaml` | Front API 契约；接口范围由本文页面与流程推导 |
| `docs/UI-DESIGN-SYSTEM.md` | 后台 UI 设计规范 |
| `src/server/db/schema.ts` | 数据模型真源；须支撑本文业务对象与状态流转 |
| `vexmotor-web` 路由与组件 | 前台页面实现；须覆盖本文第 6 节模块 |

---

## 15. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-07-04 | 全面更新：对齐 admin+web 拆分架构、当前已实现能力、双支付、i18n、RFQ 转单与实现状态矩阵 |
