# StarVen Personal Website

StarVen 的桌面端个人品牌网站。项目基于 Next.js、Vinext 和 Cloudflare Workers，包含公开主页、留言接口、D1 数据库、R2 图片存储和所有者后台。

## 本地运行

Windows 用户可双击 `启动本地网站.cmd`，或执行：

```bash
npm ci
npm run dev
```

浏览器访问 `http://localhost:5173`。

## Cloudflare Workers Builds

Cloudflare 从 GitHub 导入时使用：

- 生产分支：`main`
- 构建命令：`npm run build`
- 部署命令：`npm run deploy:cloudflare`
- 根目录：`/`

构建变量：

- `CLOUDFLARE_D1_DATABASE_ID`：`starven-db` 的 D1 UUID
- `CLOUDFLARE_D1_DATABASE_NAME=starven-db`
- `CLOUDFLARE_DEPLOYMENT=1`
- `CLOUDFLARE_R2_BUCKET_NAME=starven-media`（启用 R2 后添加；未添加时仅关闭后台图片上传）

运行时密钥只在 Cloudflare 控制台设置，不提交到 GitHub：

- `ADMIN_USER_ID`：Cloudflare Access 允许登录的所有者邮箱
- `ADMIN_CONTACT_EMAIL`：后台联系邮箱
- `RATE_LIMIT_SALT`：随机长字符串

后台路径 `/admin*` 和 `/api/admin/*` 必须由 Cloudflare Access 保护，仅允许所有者邮箱。公开站点和 `/api/inquiries` 保持公开。
