<?php
// ============================================================
// 1. 核心配置区域 (请务必修改为你的真实微信测试号参数)
// ============================================================
$AUTH_KEY = '你的专属密码'; // 替代 Bark 的 DeviceKey
$APP_ID = '你的微信APP_ID';
$APP_SECRET = '你的微信APP_SECRET';
$TEMPLATE_ID = '你的模板ID';
$USER_OPENID = '你的默认接收者OPENID';

// 默认点击跳转链接
$defaultClickUrl = 'https://github.com/lijboys/movecar';

// ============================================================
// 2. 核心参数解析：三合一全能引擎
// ============================================================
$requestKey = '';
$title = '通知';
$content = '无内容';
$clickUrl = $defaultClickUrl;

// 【模式 1：Bark 兼容模式】(利用 PATH_INFO 路径拼接)
// 适配无法传复杂 JSON 的旧项目，例如：/api.php/密码/标题/内容
$pathInfo = $_SERVER['PATH_INFO'] ?? '';
if (!empty($pathInfo)) {
    // 把路径按 "/" 拆分成数组，并过滤掉空值
    $segments = array_values(array_filter(explode('/', $pathInfo)));
    if (count($segments) >= 1) {
        $requestKey = $segments[0];
        if (count($segments) >= 3) {
            $title = urldecode($segments[1]);
            $content = urldecode($segments[2]);
        } elseif (count($segments) == 2) {
            $content = urldecode($segments[1]);
        }
    }
}

// 【模式 2：URL 参数模式】(标准 GET 请求)
// 如果没命中 Bark 模式，自动回退到这里
if (empty($requestKey) && isset($_GET['key'])) {
    $requestKey = $_GET['key'];
    $title = $_GET['title'] ?? $title;
    $content = $_GET['content'] ?? $content;
    $clickUrl = $_GET['url'] ?? $clickUrl;
}

// 【模式 3：JSON POST 模式】(最高优先级，自动覆盖)
// 完美适配 Emby, Github Actions 等现代 Webhook
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (strpos($contentType, 'application/json') !== false) {
        $jsonStr = file_get_contents('php://input');
        $jsonObj = json_decode($jsonStr, true);
        if ($jsonObj) {
            $requestKey = $jsonObj['key'] ?? $requestKey;
            $title = $jsonObj['title'] ?? $title;
            $content = $jsonObj['content'] ?? $content;
            $clickUrl = $jsonObj['url'] ?? $clickUrl;
        }
    }
}

// ============================================================
// 3. 安全验证
// ============================================================
if (empty($AUTH_KEY)) {
    http_response_code(500);
    die(json_encode(['error' => '服务器未配置 AUTH_KEY']));
}
if ($requestKey !== $AUTH_KEY) {
    http_response_code(403);
    die(json_encode(['error' => 'Forbidden: 密码错误或未提供']));
}

$openid = $_GET['openid'] ?? $USER_OPENID;

// ============================================================
// 4. 获取 Token (使用本地文件缓存，防超限)
// ==========================================
function getAccessToken() {
    global $APP_ID, $APP_SECRET;
    $cacheFile = __DIR__ . '/wechat_token_cache.json';
    
    // 如果缓存文件存在且没过期，直接读本地文件（比 KV 还要快）
    if (file_exists($cacheFile)) {
        $cache = json_decode(file_get_contents($cacheFile), true);
        if ($cache && isset($cache['expire_time']) && $cache['expire_time'] > time()) {
            return $cache['access_token'];
        }
    }

    // 重新请求微信获取 Token
    $url = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={$APP_ID}&secret={$APP_SECRET}";
    $resp = file_get_contents($url);
    $data = json_decode($resp, true);

    if (isset($data['errcode']) && $data['errcode'] !== 0) {
        http_response_code(500);
        die(json_encode(['error' => "获取Token失败: {$data['errmsg']}"]));
    }

    // 写入本地缓存，设置提前 200 秒过期保平安
    $cacheData = [
        'access_token' => $data['access_token'],
        'expire_time' => time() + 7000 
    ];
    file_put_contents($cacheFile, json_encode($cacheData));
    
    return $data['access_token'];
}

// ============================================================
// 5. 拼装弹药，向微信开火
// ============================================================
$token = getAccessToken();
$sendUrl = "https://api.weixin.qq.com/cgi-bin/message/template/send?access_token={$token}";

$payload = [
    'touser' => $openid,
    'template_id' => $TEMPLATE_ID,
    'url' => $clickUrl,
    'data' => [
        'title' => ['value' => $title, 'color' => '#FF0000'],
        'content' => ['value' => $content, 'color' => '#173177']
    ]
];

// PHP 原生的 POST 请求发送方法
$options = [
    'http' => [
        'header'  => "Content-type: application/json\r\n",
        'method'  => 'POST',
        'content' => json_encode($payload)
    ]
];
$context  = stream_context_create($options);
$result = @file_get_contents($sendUrl, false, $context);

if ($result === false) {
    http_response_code(500);
    die(json_encode(['error' => '向微信服务器发送请求失败']));
}

header('Content-Type: application/json;charset=UTF-8');
echo $result;
?>
