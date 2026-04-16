export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(`<h1 style="font-family: system-ui; text-align: center; margin-top: 100px; color: #00b96b;">✅ 微信测试号通知 Worker 已启动<br><small>支持速率限制 + KV 自动绑定</small></h1>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    return handleNotify(request, env, corsHeaders, url);
  }
};

async function handleNotify(request, env, corsHeaders, url) {
  try {
    // 鉴权
    const authKey = request.headers.get('X-API-Key') || url.pathname.split('/').filter(Boolean)[0];
    if (env.AUTH_KEY && authKey !== env.AUTH_KEY) {
      return jsonResponse({ success: false, error: '鉴权失败' }, 403, corsHeaders);
    }

    // ====================== 新增：速率限制（每分钟每个 openid 最多 5 次） ======================
    const body = request.method === 'POST' && request.headers.get('content-type')?.includes('application/json')
      ? await request.json().catch(() => ({}))
      : {};
    const openid = body.openid || url.searchParams.get('openid') || env.USER_OPENID;
    if (openid && !(await checkRateLimit(env, openid))) {
      return jsonResponse({ success: false, error: '请求过于频繁，请稍后再试（限流：5次/分钟）' }, 429, corsHeaders);
    }

    // 参数解析（保持原有三种方式）
    let title = '通知', content = '点击查看详情', clickUrl = env.DEFAULT_CLICK_URL || 'https://github.com/lijboys/movecar';
    let titleColor = '#FF0000', contentColor = '#173177';

    if (request.method === 'POST' && request.headers.get('content-type')?.includes('application/json')) {
      title = body.title || title;
      content = body.content || content;
      clickUrl = body.url || clickUrl;
      titleColor = body.titleColor || titleColor;
      contentColor = body.contentColor || contentColor;
    } else {
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length >= 3) { title = decodeURIComponent(segments[1]); content = decodeURIComponent(segments[2]); }
      else if (segments.length >= 2) { content = decodeURIComponent(segments[1]); }
      clickUrl = url.searchParams.get('url') || clickUrl;
      titleColor = url.searchParams.get('titleColor') || titleColor;
      contentColor = url.searchParams.get('contentColor') || contentColor;
    }

    if (!openid) return jsonResponse({ success: false, error: '缺少 openid' }, 400, corsHeaders);

    const accessToken = await getAccessToken(env);
    const result = await sendTemplateMessage(env, accessToken, openid, title, content, clickUrl, titleColor, contentColor);

    return jsonResponse({ success: true, msgid: result.msgid, message: '通知发送成功，卡片点击可跳转详情页' }, 200, corsHeaders);
  } catch (e) {
    console.error('通知失败:', e);
    return jsonResponse({ success: false, error: e.message }, 500, corsHeaders);
  }
}

// ====================== 速率限制（使用 KV） ======================
async function checkRateLimit(env, openid) {
  const key = `rate:${openid}`;
  const now = Math.floor(Date.now() / 1000);
  const window = 60; // 60秒窗口
  const limit = 5;   // 每分钟最多5次

  const current = await env.WX_KV.get(key, { type: 'json' }) || { count: 0, reset: now + window };

  if (now > current.reset) {
    current.count = 1;
    current.reset = now + window;
  } else {
    current.count++;
  }

  if (current.count > limit) return false;

  await env.WX_KV.put(key, JSON.stringify(current), { expirationTtl: window + 10 });
  return true;
}

function jsonResponse(data, status = 200, corsHeaders) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json;charset=UTF-8' } });
}

// 下面 getAccessToken 和 sendTemplateMessage 保持你原来的代码（无需改动）
async function getAccessToken(env) { /* ... 原有代码 ... */ }
async function sendTemplateMessage(env, token, openid, title, content, clickUrl, titleColor, contentColor) { /* ... 原有代码 ... */ }
