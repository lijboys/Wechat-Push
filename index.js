export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    };

    // OPTIONS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 首页状态页
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(
        `<h1 style="font-family: system-ui; text-align: center; margin-top: 100px; color: #00b96b;">
          ✅ 微信测试号通知 Worker 已启动<br>
          <small style="color:#64748b">支持 POST /notify + Bark 路径模式</small>
        </h1>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // 核心通知接口
    return handleNotify(request, env, corsHeaders, url);
  }
};

// ====================== 核心处理 ======================
async function handleNotify(request, env, corsHeaders, url) {
  try {
    // 1. 鉴权（支持 X-API-Key 或路径中的 key）
    const authKey = request.headers.get('X-API-Key') ||
                   url.pathname.split('/').filter(Boolean)[0];
    if (env.AUTH_KEY && authKey !== env.AUTH_KEY) {
      return jsonResponse({ success: false, error: '鉴权失败' }, 403, corsHeaders);
    }

    // 2. 参数解析（POST JSON 优先 → 路径模式 → Query 参数）
    let title = '通知', content = '点击查看详情', clickUrl = env.DEFAULT_CLICK_URL || 'https://github.com/lijboys/movecar';
    let titleColor = '#FF0000', contentColor = '#173177';
    let openid = env.USER_OPENID;

    if (request.method === 'POST' && request.headers.get('content-type')?.includes('application/json')) {
      const body = await request.json();
      title = body.title || title;
      content = body.content || content;
      clickUrl = body.url || clickUrl;
      titleColor = body.titleColor || titleColor;
      contentColor = body.contentColor || contentColor;
      openid = body.openid || openid;
    } else {
      // Bark 路径模式：/AUTH_KEY/标题/内容
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length >= 3) {
        title = decodeURIComponent(segments[1]);
        content = decodeURIComponent(segments[2]);
      } else if (segments.length >= 2) {
        content = decodeURIComponent(segments[1]);
      }
      // Query 参数兜底
      openid = url.searchParams.get('openid') || openid;
      clickUrl = url.searchParams.get('url') || clickUrl;
      titleColor = url.searchParams.get('titleColor') || titleColor;
      contentColor = url.searchParams.get('contentColor') || contentColor;
    }

    if (!openid) {
      return jsonResponse({ success: false, error: '缺少 openid 参数' }, 400, corsHeaders);
    }

    // 3. 发送
    const accessToken = await getAccessToken(env);
    const result = await sendTemplateMessage(env, accessToken, openid, title, content, clickUrl, titleColor, contentColor);

    return jsonResponse({
      success: true,
      msgid: result.msgid,
      message: '通知发送成功，卡片点击可跳转详情页'
    }, 200, corsHeaders);

  } catch (e) {
    console.error('通知失败:', e);
    return jsonResponse({ success: false, error: e.message }, 500, corsHeaders);
  }
}

function jsonResponse(data, status = 200, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json;charset=UTF-8' },
  });
}

// ====================== KV Token 缓存 ======================
async function getAccessToken(env) {
  const cacheKey = `wechat_token_${env.APP_ID}`;
  let token = await env.WX_KV.get(cacheKey);
  if (token) return token;

  const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${env.APP_ID}&secret=${env.APP_SECRET}`;
  const resp = await fetch(tokenUrl);
  const data = await resp.json();

  if (data.errcode) throw new Error(`获取 Token 失败: ${data.errmsg}`);

  await env.WX_KV.put(cacheKey, data.access_token, { expirationTtl: 7000 });
  return data.access_token;
}

// ====================== 发送模板消息 ======================
async function sendTemplateMessage(env, token, openid, title, content, clickUrl, titleColor, contentColor) {
  const sendUrl = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${token}`;

  const payload = {
    touser: openid,
    template_id: env.TEMPLATE_ID,
    url: clickUrl,                     // ← 关键：通知卡片点击跳转
    data: {
      title: { value: title, color: titleColor },
      content: { value: content, color: contentColor }
    }
  };

  const resp = await fetch(sendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await resp.json();
  if (result.errcode !== 0) throw new Error(result.errmsg);
  return { msgid: result.msgid };
}
