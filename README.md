# 🚀 微信测试号全能推送中心 (WeChat Push Center)

基于 Cloudflare Workers 搭建的轻量级、无服务器的个人微信推送接口。利用微信官方“接口测试号”实现消息推送到个人微信，永不掉线，且完全免费。

## ✨ 核心特性

* **完全免费 & 零运维**：部署在 Cloudflare Workers 上，无需个人服务器。
* **智能缓存防封**：内置 Cloudflare KV 缓存机制，自动管理 `access_token` 的续期，避免频繁请求导致微信 API 触发频率限制。
* **安全可靠**：强制要求 `AUTH_KEY` 鉴权，防止接口被恶意扫描和滥用。
* **全能兼容模式**：一个接口，同时支持 3 种主流调用方式：
  1. **Bark 兼容模式** (路径拼接，完美适配 Movecar 等不支持复杂参数的旧项目)
  2. **URL 参数模式** (标准 GET 请求)
  3. **JSON POST 模式** (标准 Webhook，适配 Emby、Jellyfin、Radarr、Github Actions 等现代应用)

---

## 🛠️ 部署说明

### 1. 准备工作
* 拥有一个 Cloudflare 账号。
* 访问 [微信公众平台接口测试号](https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login) 扫码登录，获取你的 `appID` 和 `appsecret`。
* 在测试号后台扫描“测试号二维码”关注公众号，获取你的 `微信号(openid)`。
* 在测试号后台新增一个**模板消息**，模板内容填写如下，并获取 `模板ID`：
```text
标题：{{title.DATA}}
内容：{{content.DATA}}

```

### 2. Cloudflare 配置步骤

1. 在 Cloudflare 面板创建一个新的 Worker，并将本项目代码粘贴至编辑器中。
2. 创建一个 **KV 命名空间**（例如命名为 `wechat_cache`）。
3. 进入 Worker 的 **Settings (设置)** -> **Variables (变量)**：
* 在 **KV Namespace Bindings** 中添加绑定，变量名**必须**填写为：`WX_KV`。
* 在 **Environment Variables (环境变量)** 中添加以下必填项：



| 变量名 | 说明 | 示例 |
| --- | --- | --- |
| `APP_ID` | 微信测试号的 appID | `wx1234567890abcdef` |
| `APP_SECRET` | 微信测试号的 appsecret | `d8f...` (32位长字符) |
| `TEMPLATE_ID` | 微信测试号后台创建的模板ID | `-_ZgqufnovjDZVPzEV...` |
| `USER_OPENID` | 接收消息的微信 OpenID | `oB4...` |
| `AUTH_KEY` | **【重要】** 自定义的接口调用密码，用于防滥用 | `你的超复杂密码` |

4. 点击 **Deploy (部署)**，即可完成搭建！

---

## 📡 API 调用文档

你的基础接口地址为：`https://你的域名.workers.dev/`

本接口支持以下三种调用方式，请根据不同应用场景自由选择：

### 模式一：JSON POST (推荐，标准 Webhook)

最强大、最规范的调用方式，适合自己写脚本或支持 Webhook 的现代软件（如 Emby）。

* **请求方式**：`POST`
* **Header**：`Content-Type: application/json`
* **Body**：
```json
{
  "key": "你的AUTH_KEY",
  "title": "新剧上线通知",
  "content": "绝命毒师 第一季 已下载完成。",
  "url": "[https://emby.yourdomain.com](https://emby.yourdomain.com)" 
}

```



> *注：`url` 为可选参数，点击微信通知卡片后会跳转到该链接。未填写则默认跳转至 Github 项目页。*

### 模式二：Bark 路径模式 (适配特定软件)

通过 URL 路径拼接参数，专为不支持自定义 Headers 和 Body 的软件设计。

* **请求方式**：`GET` 或 `POST`
* **URL 格式**：`https://你的域名.workers.dev/你的AUTH_KEY/通知标题/通知内容`
* **示例**：
```text
[https://wechat-push.xxx.workers.dev/mypassword/挪车提醒/有人正在扫码呼叫你](https://wechat-push.xxx.workers.dev/mypassword/挪车提醒/有人正在扫码呼叫你)！

```



### 模式三：URL 参数模式 (简单快捷)

最简单的调用方式，直接在浏览器地址栏输入即可测试。

* **请求方式**：`GET`
* **URL 格式**：
```text
[https://你的域名.workers.dev/?key=你的AUTH_KEY&title=通知标题&content=通知内容&url=点击跳转的链接](https://你的域名.workers.dev/?key=你的AUTH_KEY&title=通知标题&content=通知内容&url=点击跳转的链接)

```



---

## 💡 常见问题排查

* **报错 `Forbidden: Wrong Key` 或 `密码错误**`：请检查请求中携带的 `key` 是否与 Cloudflare 后台环境变量 `AUTH_KEY` 一致。
* **报错 `invalid appsecret**`：`APP_SECRET` 填写错误或包含多余空格。或者你在微信后台点击了“重置”，需要重新复制最新的。
* **没有报错，但微信没收到消息**：请检查 `USER_OPENID` 是否正确，并且确保**你已经扫码关注了该测试号**。

```
