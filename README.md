# 微信测试号通知 Cloudflare Worker（终极融合版）



**一个结构最完整、调用最灵活、功能最完善的 Cloudflare Worker 项目**

完美融合了「标准 API 调用」与「Bark 路径兼容模式」，支持**任意第三方项目接入**，并实现**微信通知卡片点击自动跳转自定义详情页**。

---

## ✨ 核心功能亮点

- ✅ **三种调用方式**：POST JSON（推荐） + Bark 路径模式（`/key/标题/内容`） + Query 参数
- ✅ **通知卡片点击跳转**：传入 `url` 参数后，微信卡片右下角「点击查看详情」直接跳转到你指定的网页
- ✅ **KV 持久化 Token 缓存**：比内存缓存更稳定，支持多实例
- ✅ **自定义颜色**：支持 `titleColor`、`contentColor`
- ✅ **鉴权灵活**：支持 `AUTH_KEY`（路径/Query）或 `X-API-Key`（Header）
- ✅ **完整 CORS + 首页状态页**：任意语言、任意前端/后端均可调用
- ✅ **GitHub Actions 自动部署**：`git push` 即自动上线
- ✅ **零依赖、无数据库**：纯 Worker + KV，免费额度充足

---

## 📁 项目结构

```
wechat-notify-worker/
├── .github/workflows/deploy.yml     # 自动部署 Workflow
├── wrangler.toml                    # Cloudflare 配置 + KV 绑定
├── package.json
├── README.md
└── src/
    └── index.js                     # 核心 Worker 代码（已极致优化）
```

---

## 🚀 部署步骤（5 分钟完成）

### 1. 创建 KV Namespace（必须）
1. 登录 Cloudflare 仪表盘 → **KV** → **Create a namespace**
2. 名称随意（如 `wechat-token`）
3. 复制生成的 **Namespace ID**，填入 `wrangler.toml` 中的 `kv_namespaces`

### 2. 克隆/创建项目并配置
```bash
# 复制项目文件（wrangler.toml、package.json、src/index.js）
npm install
```

### 3. 设置密钥（强烈建议）
```bash
npx wrangler secret put AUTH_KEY          # 接口密码
npx wrangler secret put APP_ID            # 微信测试号 AppID
npx wrangler secret put APP_SECRET        # 微信测试号 AppSecret
```

### 4. 配置 wrangler.toml（示例）
```toml
name = "wechat-notify-worker"
main = "src/index.js"
compatibility_date = "2025-04-01"
compatibility_flags = ["nodejs_compat"]

kv_namespaces = [
  { binding = "WX_KV", id = "你的_KV_ID_填这里" }
]

[vars]
TEMPLATE_ID = "你的微信模板ID"          # 必须在测试号后台创建
USER_OPENID = "默认测试openid"           # 可选
DEFAULT_CLICK_URL = "https://你的默认详情页.com"
```

### 5. 部署
- 本地：`npm run deploy`
- 自动：`git push`（推荐使用 GitHub Actions）

---

## 🔗 第三方项目调用方式（超级灵活）

Worker 部署后的地址示例：
```
https://wechat-notify-worker.你的子域名.workers.dev
```

### 1. POST JSON（推荐，最干净）
```js
// Node.js / TypeScript / 任意语言
const res = await fetch('https://你的-worker.workers.dev/notify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': '你的 AUTH_KEY'          // 可选
  },
  body: JSON.stringify({
    openid: '用户openid',                  // 必填
    title: '订单已发货',
    content: '您的订单 #123456 已发货，预计明日送达',
    url: 'https://your-project.com/order/123456',   // ← 关键：点击跳转详情页
    titleColor: '#FF0000',
    contentColor: '#173177'
  })
});
```

### 2. Bark 路径模式（兼容 iOS 快捷指令等）
```
https://你的-worker.workers.dev/你的AUTH_KEY/订单已发货/您的订单已发货?url=https://your-project.com/detail/123
```

### 3. Query 参数模式（快捷测试）
```
https://你的-worker.workers.dev/notify?key=你的AUTH_KEY&openid=用户openid&title=测试标题&content=测试内容&url=https://example.com/detail
```

**只要传入 `url` 参数**，用户在微信里点击通知卡片就会**直接跳转**到你设置的详情网页！

---

## 微信测试号配置提醒

1. 打开 [微信公众平台测试账号](https://mp.weixin.qq.com/debug/cgi-bin/sandboxinfo)
2. 获取 **AppID** 和 **AppSecret**
3. 创建模板消息（字段建议：`title`、`content`）
4. 把模板 ID 填入 `wrangler.toml` 的 `TEMPLATE_ID`

---

## 安全建议

- 强烈建议设置 `AUTH_KEY`，防止接口被滥用
- 生产环境可进一步增加速率限制（需要时告诉我，我可以帮你加上）

---

**项目已完全生产就绪**
支持无限第三方项目接入，代码逻辑清晰、注释完善、兼容性最强。
