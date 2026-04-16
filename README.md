**✅ 已按你的要求全部优化完成！**

- `README.md` 已更新：**所有配置变量部分** 全部改成**清晰的 Markdown 表格**（包含「参数名」「描述」「是否必填」「示例/默认值」「备注」）。
- 表格分两类：**非敏感变量（Variables）** 和 **密钥（Secrets）**，一目了然。
- 其他文件（`wrangler.toml`、`deploy.yml`、`_worker.js`）**无需再改**，已完全兼容 `_worker.js` + Pages/Worker 双部署。

---

### **直接复制下面全部内容，替换你的 `README.md`**：

```markdown
# 微信测试号通知 Cloudflare Worker（终极融合版）

[![自动部署](https://github.com/lijboys/Wechat-Push/actions/workflows/deploy.yml/badge.svg)](https://github.com/lijboys/Wechat-Push/actions/workflows/deploy.yml)

**最干净、最灵活的微信测试号通知项目**
支持三种调用方式 + 卡片点击跳转自定义详情页 + KV 持久化缓存 + **同时支持 Worker 和 Pages 部署**。

---

## ✨ 核心功能

- 三种调用方式：POST JSON（推荐） + Bark 路径 + Query 参数
- 通知卡片点击自动跳转自定义详情页（传入 `url` 即可）
- KV 持久化 Token 缓存
- 支持自定义颜色、CORS、首页状态页
- 零依赖、免费额度充足

---

## 📁 项目结构（已改为 _worker.js）

```
Wechat-Push/
├── .github/workflows/deploy.yml     # GitHub Actions 全自动部署（Worker）
├── wrangler.toml                    # 配置（Actions 专用）
├── package.json
├── README.md
└── _worker.js                       # 核心代码（已重命名，支持 Pages）
```

---

## 📋 配置参数说明（必看）

### 非敏感变量（Variables / [vars]）

| 参数名            | 描述                          | 是否必填 | 示例/默认值                              | 备注 |
|-------------------|-------------------------------|----------|------------------------------------------|------|
| `TEMPLATE_ID`     | 微信模板消息 ID               | **必填** | `kL9vX8mPqR2tY7uW3xZ`                   | 必须在微信测试号后台创建模板 |
| `USER_OPENID`     | 默认接收通知的用户 openid     | 可选     | `oabcdef1234567890`                      | 留空时必须在调用时传入 openid |
| `DEFAULT_CLICK_URL` | 默认详情页跳转地址          | 可选     | `https://github.com/lijboys/Wechat-Push` | 卡片右下角「点击查看详情」跳转地址 |

### 密钥（Secrets）

| 参数名         | 描述                   | 是否必填 | 示例值                     | 备注 |
|----------------|------------------------|----------|----------------------------|------|
| `AUTH_KEY`     | 接口调用密码           | **必填** | `myStrongPassword123!`     | 强烈建议设置，防止他人滥用 |
| `APP_ID`       | 微信测试号 AppID       | **必填** | `wx1234567890abcdef`       | 从微信测试号后台获取 |
| `APP_SECRET`   | 微信测试号 AppSecret   | **必填** | `a1b2c3d4e5f6g7h8i9j0k1l2` | 从微信测试号后台获取 |

**KV Namespace**：名称固定为 `wechat-push`，Variable name 为 `WX_KV`（Action 或网页版均需绑定）。

---

## 🚀 部署方式（二选一）

### 方式一：GitHub Actions 全自动部署（推荐，无需终端）
1. 在 GitHub **Settings → Secrets and variables → Actions** 添加上方表格中的 5 个 Secrets。
2. 直接 `git push` 或在网页编辑保存。

Action 会自动完成 KV 创建、绑定、密钥设置、Worker 部署。
部署地址：`https://wechat-push.你的子域名.workers.dev`

---

### 方式二：Cloudflare 网页版部署（纯网页操作，最简单）

**选项 A：纯 Worker 部署（推荐新手）**
1. 登录 [Cloudflare 仪表盘](https://dash.cloudflare.com) → **Workers & Pages** → **Create Worker**
2. 名称填 `wechat-push` → 点击 **Deploy**
3. 点击 **Quick Edit** → 粘贴 `_worker.js` 全部代码 → **Save and deploy**
4. 切换到 **Settings** 标签页：
   - **KV Namespace Bindings** → 添加 `WX_KV` 并绑定 `wechat-push`
   - **Variables** → 按上方表格添加 `TEMPLATE_ID`、`USER_OPENID`、`DEFAULT_CLICK_URL`
   - **Secrets** → 按上方表格添加 `AUTH_KEY`、`APP_ID`、`APP_SECRET`
5. **Save** → **Deploy**

**选项 B：Cloudflare Pages 部署（支持以后加静态页面）**
1. **Workers & Pages** → **Pages** → **Connect to Git** → 选择仓库
2. Framework preset 选 **None**，Build command 和 Build output directory 留空
3. Pages 会**自动识别 `_worker.js`** 作为 Worker
4. 部署完成后在 **Settings** 中按上方表格配置 Variables、Secrets、KV 绑定
部署地址：`https://wechat-push.你的子域名.pages.dev`

---

## 🔗 调用方式（两种部署方式完全一致）

Worker/Pages 地址示例：
```
https://wechat-push.你的子域名.workers.dev
```

**1. POST JSON（推荐）**
```js
fetch('https://wechat-push.你的子域名.workers.dev/notify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-API-Key': '你的AUTH_KEY' },
  body: JSON.stringify({
    openid: '用户openid',
    title: '订单已发货',
    content: '您的订单 #123456 已发货',
    url: 'https://your-project.com/detail/123',   // 点击卡片跳转
    titleColor: '#FF0000',
    contentColor: '#173177'
  })
})
```

**2. Bark 路径模式**
```
/你的AUTH_KEY/订单已发货/您的订单已发货?url=https://your-project.com/detail/123
```

**3. Query 参数模式**
```
/notify?key=你的AUTH_KEY&openid=xxx&title=标题&content=内容&url=跳转地址
```

---

## 微信测试号配置提醒
1. 打开 [微信公众平台测试账号](https://mp.weixin.qq.com/debug/cgi-bin/sandboxinfo)
2. 获取 AppID、AppSecret
3. 创建模板消息（字段建议：`title`、`content`）
4. 把模板 ID 填入 `TEMPLATE_ID`

---

**项目已完全就绪**
`_worker.js` 同时支持 Worker 和 Pages 部署，配置全部表格化，一看就懂。
需要增加速率限制、批量发送或其他功能，随时告诉我，我立刻帮你加上！🚀
```
