# 技术规格说明

## 1. 文档目标

本文档定义项目技术架构、工程结构、运行环境、认证方案、数据库接入方式、接口与数据契约边界，并为后续实现提供统一技术基线。

## 2. 技术栈

- Node.js 22.x
- pnpm 作为唯一包管理器
- Next.js 16.x 优先；若兼容性受阻，可下调到相近稳定版本，但需记录原因
- React 19.x 优先；若兼容性受阻，可下调到相近稳定版本，但需记录原因
- Ant Design 6.x 优先用于后台界面；若兼容性受阻，可下调到相近稳定版本，但需记录原因
- NextAuth.js / Auth.js 用于认证
- Neon Postgres 作为在线 PostgreSQL 数据库
- Drizzle ORM + drizzle-kit 作为数据库建模、迁移与类型安全访问方案
- OpenAPI 3.1 作为接口契约规范
- JSON Schema 2020-12 作为数据结构契约规范

## 3. 总体架构

项目采用单体 Next SSR 应用，同时承载：

- 前台商城网站
- 后台管理系统
- 前后台共享 API 层
- 认证与会话层
- 数据访问层

架构原则：

- 单一数据模型
- 单一认证体系
- 单一部署单元
- 先文档后实现
- 前后台共享业务规则，不复制逻辑

## 4. 工程目录规划

```text
/docs
  /database
  openapi.front.yaml
  spec.md
  technical-spec.md
/src
  /app
    /(storefront)
    /(admin)
    /api
  /components
  /features
  /lib
  /server
    /db
  /types
  /styles
/public
```

说明：

- `docs/` 保存全部规格文档。
- `src/app/(storefront)` 负责前台页面。
- `src/app/(admin)` 负责后台页面。
- `src/app/api` 负责 API 路由。
- `src/features` 按业务域组织逻辑。
- `src/server` 负责服务端业务、仓储、鉴权和数据库访问。
- `src/server/db` 负责 Drizzle schema、连接、查询与种子数据回退逻辑。

## 5. 运行环境

### 5.1 本地开发

- 开发端口固定为 `4000`
- 推荐安装命令：`pnpm install`
- 推荐开发命令：`pnpm dev`
- 显式连库开发命令：`pnpm dev:db`
- 显式使用 Turbopack：`pnpm dev:turbo`
- 显式使用 Turbopack 且连库：`pnpm dev:turbo:db`
- 推荐校验命令：`pnpm check`
- 本地环境变量放在 `.env.local`

说明：

- `pnpm dev` 默认使用 webpack，并关闭开发态数据库连接，直接走现有 seed / memory fallback，保证本地页面响应稳定。
- 只有在明确需要验证真实数据库读写时，才使用 `pnpm dev:db`，其内部会设置 `DB_ENABLE_IN_DEV=true`。
- `pnpm dev:turbo` 与 `pnpm dev:turbo:db` 只作为显式调试入口保留，不作为默认本地开发模式。

### 5.1.1 包管理约束

- 项目统一使用 `pnpm`，不使用 `npm install`。
- 依赖安装、锁文件和脚本执行均以 `pnpm` 为准。
- 仓库应提交 `pnpm-lock.yaml` 作为唯一锁文件。

### 5.2 核心环境变量

- `DATABASE_URL`
- `DB_ENABLE_IN_DEV`
- `AUTH_SECRET`
- `AUTH_URL`
- `NEXT_PUBLIC_SITE_URL`
- `APP_ENV`

### 5.3 数据库连接

Neon 连接串采用 PostgreSQL 兼容连接方式，首期默认使用 Node Runtime 下的 PostgreSQL 客户端接入，不使用 Edge Runtime 特有数据库访问方式。

### 5.4 推荐数据库命令

- 安装依赖：`pnpm install`
- 生成迁移：`pnpm db:generate`
- 推送数据库结构：`pnpm exec drizzle-kit push --force`
- 初始化样例数据：`pnpm db:seed`
- 本地结构检查：`pnpm check`

### 5.5 当前已验证的初始化路径

- 环境变量统一从 `.env.local` 读取，数据库命令与运行时代码保持同一加载路径。
- 当前 Neon 数据库初始化顺序：`pnpm install` -> `pnpm exec drizzle-kit push --force` -> `pnpm db:seed`。
- 当前样例后台账号：`admin@lianchuan.local / Admin123456`。

## 6. 认证与授权

### 6.1 认证方案

- 使用 NextAuth / Auth.js
- 首期启用 Credentials Provider
- 登录主体为邮箱 + 密码
- 第三方登录 Provider 作为扩展位保留，不在首期启用

### 6.2 密码兼容要求

用户要求本地账号密码按以下规则处理：

- 注册时：接收明文密码，将明文转换为 MD5，再写入数据库
- 登录时：将用户输入的明文密码转换为 MD5，与数据库中的 MD5 值对比

说明：

- 该规则是项目兼容性要求，不代表安全最佳实践
- 未来若要升级加密方案，需要设计平滑迁移机制

### 6.3 会话策略

- 登录后采用基于 NextAuth 的会话管理
- 后台页面与会员中心页面都需要鉴权
- 接口层区分公开接口、会员接口、后台接口

## 7. 前台 API 设计原则

- API 契约统一记录在 `docs/openapi.front.yaml`
- 首期前台 API 采用 REST 风格
- 列表接口统一支持分页、排序、筛选
- 响应体结构统一：数据体 + 分页信息 + 错误信息模型
- 鉴权接口和业务接口采用统一错误码风格

## 8. 数据建模原则

- 数据结构文档按表拆分保存到 `docs/database/*.schema.json`
- 每个 schema 文件描述一个逻辑表
- JSON Schema 用于描述：字段、类型、必填、默认值、枚举、状态说明
- 跨表关系、索引、唯一键组合等补充写入 schema 的 `description` 或本文档相关章节
- 实际代码实现以 Drizzle ORM schema 为准，并与 `docs/database/*.schema.json` 保持一致
- 当数据库未初始化或无种子数据时，前台允许使用受控的只读样例数据回退，以保证页面和 API 骨架可运行

## 9. 关键业务实体

- users
- accounts
- sessions
- verification_tokens
- categories
- brands
- products
- product_images
- product_variants
- inventory
- attachments
- product_features
- carts
- cart_items
- addresses
- orders
- order_items
- inquiries
- wishlists

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

- 首期 UI 默认英语
- 数据模型从一开始支持多语言扩展
- 商品名称、摘要、详情、SEO 字段、分类名称与描述应预留多语言结构
- 首期后台可以先以英语为主，数据结构仍允许后续扩展更多语言

## 12. 上传与静态资源策略

- 首期图片与附件上传接口先抽象，不与最终对象存储强绑定
- 商品图片与附件不直接存储二进制到数据库
- 数据库只保存文件元数据与 URL / path

## 13. 后台实现原则

- 后台使用 Ant Design
- 信息架构以商品管理为优先
- 列表页优先服务端分页
- 创建/编辑采用页面式表单或抽屉式表单，具体实现以后续 UI 原型为准
- 后台表单字段命名尽可能与 API / schema 保持一致

## 14. 可观测性与错误处理

- API 应返回明确错误码与错误消息
- 服务端记录关键业务日志：登录、下单、询价、后台商品编辑
- 首期先保留日志接口与抽象，不强绑特定 SaaS

## 15. 安全边界

- 后台接口必须鉴权
- 会员接口必须鉴权
- 公开接口仅暴露商品、分类、首页聚合等必要读取能力
- 输入验证以后续 schema 与运行时校验器为准
- 敏感信息不进入前台响应体

## 16. 文档产物与优先级

第一阶段只产出规格文档，不写业务代码：

1. `docs/spec.md`
2. `docs/technical-spec.md`
3. `docs/openapi.front.yaml`
4. `docs/database/*.schema.json`

只有当以上文档完成并对齐后，才进入代码实现。

## 17. 参考基线

前台信息架构与视觉组织参考：

- StepMotech
- vexmotor.com

重点参考能力：

- 首页模块编排
- 分类页筛选与商品列表
- 商品详情页图集、规格、价格、附件、询价切换
- 工业品外贸站的内容组织方式
