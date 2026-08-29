# 智能展会导览（观众端）

独立的 Next.js 观展页面，支持手机和电脑。应用无需平台账号；兴趣、行程、打卡和当前位置只保存在当前浏览器的 localStorage，不上传用户身份或位置。

主要页面包括首页兴趣推荐、展位库与详情、AI 助手、示意地图、人流展示和本机记录。AI 只由服务端使用 `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL` 调用 OpenAI 兼容接口，密钥不会进入浏览器包。

展位和地图数据入口为 `src/lib/expo/DATA_SOURCE.ts`。地图和人流功能只能使用经过场馆确认的数据；当前未验证内容必须保持示意或样例标识，不能当作实时现场事实发布。

本地运行：

```bash
bun install --frozen-lockfile
bun run dev
bun run lint
bun run build
```
