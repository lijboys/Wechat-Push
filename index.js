export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ============================================================
    // 1. 核心参数解析：全面兼容 Bark模式、URL参数模式、JSON POST模式
    // ============================================================
    let requestKey, title, content, clickUrl;
    
    // 步骤 A：先尝试从 URL 路径解析 (Bark 模式)
    const pathSegments = url.pathname.split('/').filter(s => s);
    if (pathSegments.length >= 2) {
      requestKey = pathSegments[0];
      if (pathSegments.length >= 3) {
        title = decodeURIComponent(pathSegments[1]);
        content = decodeURIComponent(pathSegments[2]);
      } else {
        title = '通知';
        content = decodeURIComponent(pathSegments[1]);
      }
    } else {
      // 步骤 B：没命中 Bark，回退到普通 URL 参数解析 (?key=...)
      requestKey = url.searchParams.get('key');
      title = url.searchParams.get('title') || '通知';
      content = url.searchParams.get('content') || '无内容';
    }

    // 默认的跳转链接（如果没传的话）
    clickUrl = url.searchParams.get('url') || 'https://github.com/lijboys/movecar';

    // 步骤 C：如果是 POST 请求且带了 JSON，直接覆盖前面的所有参数 (最高优先级)
    if (request.method === 'POST' && request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await request.json();
        // 如果 JSON 里有对应字段，就用 JSON 里的，否则保留之前解析出来的
        requestKey = body.key || requestKey;
        title = body.title || title;
        content = body.content || content;
        clickUrl = body.url || clickUrl; // 支持在 JSON 里自定义点击通知后的跳转链接
      } catch (e) {
        console.error('JSON解析失败，退回URL参数模式', e);
      }
    }

    // ============================================================
    // 2. 安全验证
    // ============================================================
    if (!env.AUTH_KEY) {
      return new Response('Error: 未在设置中配置 AUTH_KEY', { status: 500 });
    }
    if (requestKey !== env.AUTH_KEY) {
      return new Response('Forbidden: 密码错误或未提供', { status: 403 });
    }

    // ============================================================
    // 3. 发送逻辑 (微信测试号)
    // ============================================================
    const openid = url.searchParams.get('openid') || env.USER_OPENID;

    try {
      let accessToken = await getAccessToken(env);
      const result = await sendTemplateMessage(env, accessToken, openid, title, content, clickUrl);
      
      return new Response(JSON.stringify(result), {
        headers: { 'content-type': 'application/json;charset=UTF-8' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  },
};

// --- 辅助函数：获取 Token (带 KV 缓存) ---
async function getAccessToken(env) {
  const cacheKey = 'wechat_test_account_token_v1';
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

// --- 辅助函数：发送模板消息 ---
async function sendTemplateMessage(env, token, openid, title, content, clickUrl) {
  const sendUrl = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${token}`;
  
  const payload = {
    touser: openid,
    template_id: env.TEMPLATE_ID,
    url: clickUrl,
    data: {
      title: { value: title, color: '#FF0000' }, 
      content: { value: content, color: '#173177' } 
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
  return { success: true, msgid: result.msgid };
}
