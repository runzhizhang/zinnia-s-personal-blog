# Personal Blog

个人博客全栈项目，包含前端、后端、数据库、对象存储与异步备份能力。

## 技术栈

- Next.js 14 (`apps/web`)
- Node.js + Express (`apps/api`)
- PostgreSQL + Prisma (`packages/db`)
- Redis + BullMQ（异步导出/备份）
- MinIO（媒体对象存储）

## 快速开始

1. 复制环境变量：
   - `cp .env.example .env`（Windows 可手动复制）
2. 安装依赖：
   - `npm install`
3. 启动基础依赖：
   - `docker compose -f infra/docker-compose.yml up postgres redis minio -d`
4. 初始化数据库：
   - `npm run prisma:generate -w @personal-blog/db`
   - `npm run prisma:migrate -w @personal-blog/db -- --name init`
5. 启动应用：
   - `npm run dev`

## 核心接口

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET/POST/PATCH/DELETE /api/posts`
- `GET /api/posts/search`
- `GET /api/tags`
- `GET /api/stats`
- `GET /api/stats/heatmap`
- `POST /api/media/presign`
- `POST /api/media/callback`
- `POST /api/export`
- `GET /api/interactions/posts/:postId`
- `POST /api/interactions/posts/:postId/comments`
- `POST /api/interactions/posts/:postId/reactions`
- `DELETE /api/interactions/:id`
- `GET /rss.xml`

## 测试

- API 冒烟测试：`npm run test -w api`
- E2E（Playwright）：`npm run test:e2e`

## 数据库迁移补充

- 本次升级包含反应幂等唯一键字段：`Interaction.reactionKey`。
- 更新后请执行：
  - `npm run prisma:generate -w @personal-blog/db`
  - `npm run prisma:migrate -w @personal-blog/db -- --name reaction-key-unique`
- 若是已有数据，可参考 `packages/db/prisma/reaction-unique.sql` 中的 backfill 示例。

## 目录

- `apps/web`: 前端页面（时间线、发布、搜索、归档、设置）
- `apps/api`: API、鉴权、导出与备份任务
- `packages/db`: Prisma Schema 与数据库客户端
- `packages/shared`: DTO 与输入校验
- `infra`: Docker Compose 等运维配置
