export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ============================================================
    // 1. 参数解析（POST JSON 优先级最高）
    // ============================================================
    let requestKey, title = '通知', content = '点击查看详情', clickUrl, titleColor = '#FF0000', contentColor = '#173177';

    // 优先处理 POST JSON（最高优先级）
    if (request.method === 'POST' && request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await request.json();
        requestKey = body.key;
        title = body.title || title;
        content = body.content || content;
        clickUrl = body.url || 'https://github.com/lijboys/movecar';
        titleColor = body.titleColor || titleColor;
        contentColor = body.contentColor || contentColor;
      } catch (e) {
        return jsonResponse({ success: false, error: 'JSON 解析失败' }, 400);
      }
    } else {
      // Bark 路径模式 / Query 参数模式
      const pathSegments = url.pathname.split('/').filter(Boolean);
      if (pathSegments.length >= 2) {
        requestKey = pathSegments[0];
        try {
          if (pathSegments.length >= 3) {
            title = decodeURIComponent(pathSegments[1]);
            content = decodeURIComponent(pathSegments[2]);
          } else {
            content = decodeURIComponent(pathSegments[1]);
          }
        } catch (e) {
          return jsonResponse({ success: false, error: 'URL 编码错误' }, 400);
        }
      } else {
        requestKey = url.searchParams.get('key');
        title = url.searchParams.get('title') || title;
        content = url.searchParams.get('content') || content;
        clickUrl = url.searchParams.get('url') || 'https://github.com/lijboys/movecar';
        titleColor = url.searchParams.get('titleColor') || titleColor;
        contentColor = url.searchParams.get('contentColor') || contentColor;
      }
    }

    // title 长度限制（微信要求）
    if (title.length > 64) {
      title = title.slice(0, 61) + '...';
    }

    // ============================================================
    // 2. 安全验证
    // ============================================================
    if (!env.AUTH_KEY) {
      return jsonResponse({ success: false, error: '未配置 AUTH_KEY' }, 500);
    }
    if (requestKey !== env.AUTH_KEY) {
      return jsonResponse({ success: false, error: '密码错误或未提供' }, 403);
    }

    // ============================================================
    // 3. 发送逻辑
    // ============================================================
    const openid = url.searchParams.get('openid') || env.USER_OPENID;

    console.log(`[推送] title: ${title} | openid: ${openid} | url: ${clickUrl}`);

    try {
      const accessToken = await getAccessToken(env);
      const result = await sendTemplateMessage(env, accessToken, openid, title, content, clickUrl, titleColor, contentColor);
      
      return jsonResponse({ success: true, msgid: result.msgid });
    } catch (e) {
      console.error('[推送失败]', e);
      return jsonResponse({ success: false, error: e.message }, 500);
    }
  },
};

// 统一 JSON 响应辅助函数
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json;charset=UTF-8' },
  });
}

// --- 获取 Token（带 KV 缓存 + appid 后缀）---
async function getAccessToken(env) {
  const cacheKey = `wechat_token_${env.APP_ID}`;
  let token = await env.WX_KV.get(cacheKey);
  if (token) return token;

  const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${env.APP_ID}&secret=${env.APP_SECRET}`;
  const resp = await fetch(tokenUrl);
  const data = await resp.json();

  if (data.errcode) {
    throw new Error(`获取Token失败: ${data.errmsg}`);
  }

  await env.WX_KV.put(cacheKey, data.access_token, { expirationTtl: 7000 });
  return data.access_token;
}

// --- 发送模板消息 ---
async function sendTemplateMessage(env, token, openid, title, content, clickUrl, titleColor, contentColor) {
  const sendUrl = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${token}`;
  
  const payload = {
    touser: openid,
    template_id: env.TEMPLATE_ID,
    url: clickUrl,
    data: {
      title: { value: title, color: titleColor },
      content: { value: content, color: contentColor }
    }
  };

  const resp = await fetch(sendUrl, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  const result = await resp.json();
  if (result.errcode !== 0) {
    throw new Error(`发送失败: ${result.errmsg}`);
  }
  return { msgid: result.msgid };
}
