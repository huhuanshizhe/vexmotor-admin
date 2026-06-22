# vexmotor-admin

VexMotor 后台运营平台 + 全部前台 API + 数据库层。从单体 `vexmotor` 拆分而来，运行于 **http://localhost:5100**。

## 职责

- `/admin` — 后台 UI（Ant Design + Auth.js v5 Credentials，查 `admins` 表）
- `/api/admin/*` — 后台管理 API
- `/api/front/*` — 前台商城 REST API（CORS 对 `vexmotor-web` 开放）
- `/api/front/auth/*` — 前台 JWT 登录/注册 + OAuth（Google 等）
- PostgreSQL + Drizzle ORM

## 快速开始

```bash
pnpm install
cp .env.example .env   # 填写 DATABASE_URL、AUTH_SECRET、JWT_SECRET
pnpm db:push --force   # 或 pnpm drizzle-kit push --force
pnpm db:migrate-admins # 将 users 中 role=admin 迁入 admins 表
pnpm dev               # http://localhost:5100
```

默认开发管理员（迁移脚本写入）：

- 邮箱：`admin@lianchuan.local`
- 密码：`Admin123456`

## 认证架构

| 域 | 表 | 方式 |
|----|-----|------|
| 后台运营 | `admins` | NextAuth v5 `@/auth/admin-auth` → `/api/admin/auth/*` |
| 前台会员 | `users` + `accounts` | JWT `Authorization: Bearer`；OAuth → `/api/front/auth/oauth/*` 302 带 token 到 web |

## 环境变量

见 [`.env.example`](./.env.example)。关键项：

- `DATABASE_URL` — 仅 admin 持有
- `CORS_ALLOWED_ORIGINS` — 默认 `http://localhost:5000`
- `FRONT_CALLBACK_URL` — OAuth/JWT 回调，默认 `http://localhost:5000/auth/callback`
- `JWT_SECRET` — 前台 Bearer token 签发

## API 文档

前台契约：[`docs/openapi.front.yaml`](./docs/openapi.front.yaml)（`servers[0].url` = `http://localhost:5100`）

## API 文档（Swagger）

| 资源 | URI |
|------|-----|
| Swagger UI | http://localhost:5100/api-doc |
| OpenAPI JSON | http://localhost:5100/api/openapi.json |

基于 `next-swagger-doc` + `swagger-ui-react`；契约主体来自 `docs/openapi.front.yaml`，并合并 `src/app/api` 路由上的 `@swagger` JSDoc。

## 脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发服务器 :5100 |
| `pnpm build` | 生产构建 |
| `pnpm typecheck` | TypeScript 检查 |
| `pnpm db:push` | Drizzle schema 推送 |
| `pnpm db:seed` | 种子数据 |
| `pnpm db:migrate-admins` | admins 表迁移 |

## 与 vexmotor-web 联调

1. 启动 admin `:5100`
2. 启动 web `:5000`，`NEXT_PUBLIC_API_URL=http://localhost:5100`
3. 公开页 SSR 经 `serverFetch` 调 `/api/front/*`；浏览器经 `apiFetch` + Bearer + `X-Cart-Token`
