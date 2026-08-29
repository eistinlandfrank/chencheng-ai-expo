# Expo Service AI

Expo Service AI 是面向观众、参展商与场馆运营人员的响应式展会服务 MVP。它包含观众 PWA、展商工作台、场馆运营台、D1 数据迁移、预约与匿名聚合分析等能力。

当前场馆地图处于复核状态。路线、距离、时间和无障碍导航只有在权威数据、现场检查及双人审核全部通过后才会开放；仓库中的场馆数据不得直接视为已发布的现场事实。

## 本地开发

需要 Node.js 22.13.0 或更高版本和 npm。

```bash
npm ci
cp .env.example .dev.vars
npm run dev
```

常用检查：

```bash
npm run check
npm run build
```

## 运行时配置

- `ANALYTICS_SESSION_SECRET`：至少 32 个字符的随机服务端密钥，用于签名匿名分析会话。
- `DB`：由 `.openai/hosting.json` 声明的 D1 绑定。
- `FILES`：由 `.openai/hosting.json` 声明的 R2 绑定。

真实密钥只通过部署平台配置，不能写入源码、`.env.example`、浏览器存储或 Git 历史。

## 身份与管理员初始化

受保护页面依赖 Sites 边缘注入并验证的 `oai-authenticated-*` 身份头。若部署到其他平台，必须由可信边缘剥离外部同名请求头并重新注入已验证身份；不能直接信任来自公网客户端的这些头。

仓库不提供 URL token 或公开网页形式的管理员初始化入口。首次部署应由授权运维人员在 D1 中预配一条 `venue_admin` 记录，然后通过运营台邀请后续管理员。示例仅用于说明字段，实际用户 ID 必须来自当前 Site 的可信身份上下文：

```sql
INSERT INTO app_memberships (
  id, tenant_id, event_id, user_id, email_snapshot, display_name,
  role, organization_id, place_id, created_at
) VALUES (
  'membership-<uuid>',
  'tenant-thousand-hackathon',
  'event-thousand-hackathon-2026',
  '<trusted-site-user-id>',
  '<admin-email>',
  '<display-name>',
  'venue_admin',
  NULL,
  NULL,
  '<iso-8601-time>'
);
```

## 发布边界

该项目通过 OpenAI Sites 运行，站点配置位于 `.openai/hosting.json`。场馆尺寸、入口/出口、服务点和节点坐标属于具体活动的草稿运营数据；将仓库设为公开前，应先获得数据所有方授权或替换为合成演示数据。

当前仓库没有附带开源许可证。除非仓库所有者另行添加许可证，否则默认保留全部权利。
