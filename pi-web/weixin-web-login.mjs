import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const BOT_TYPE = "3";
const BASE_URL = "https://ilinkai.weixin.qq.com";
const PORT = Number(process.env.WEIXIN_QR_PORT || 9876);
const HOST = process.env.WEIXIN_QR_HOST || "0.0.0.0";
const TIMEOUT_MS = Number(process.env.WEIXIN_LOGIN_TIMEOUT_MS || 480000);
const STATE_DIR = process.env.PI_CODING_AGENT_DIR
  ? path.join(process.env.PI_CODING_AGENT_DIR, "weixin")
  : path.join(os.homedir(), ".pi", "agent", "weixin");

async function getJson(url, timeoutMs = 30000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 200)}`);
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function saveAccount(accountId, data) {
  const accountsDir = path.join(STATE_DIR, "accounts");
  ensureDir(accountsDir);
  const filePath = path.join(accountsDir, `${accountId}.json`);
  let existing = {};
  if (fs.existsSync(filePath)) {
    existing = JSON.parse(fs.readFileSync(filePath, "utf8"));
  }
  const merged = { ...existing, ...data, savedAt: new Date().toISOString() };
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), "utf8");
  fs.chmodSync(filePath, 0o600);

  const indexPath = path.join(STATE_DIR, "accounts.json");
  let ids = [];
  if (fs.existsSync(indexPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8"));
      if (Array.isArray(parsed)) ids = parsed;
    } catch {}
  }
  if (!ids.includes(accountId)) ids.push(accountId);
  ensureDir(STATE_DIR);
  fs.writeFileSync(indexPath, JSON.stringify(ids, null, 2), "utf8");
  fs.writeFileSync(path.join(STATE_DIR, "config.json"), JSON.stringify({ lastAccountId: accountId }, null, 2), "utf8");
}

function renderPage(qrUrl, status) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Pi Weixin Login</title>
<style>body{font-family:sans-serif;max-width:720px;margin:40px auto;padding:0 16px}img{max-width:320px;border:1px solid #ddd;border-radius:8px}.status{margin-top:16px;padding:12px;background:#f5f5f5;border-radius:8px}</style></head>
<body><h1>微信扫码登录 pi-weixinbot</h1><p>请用微信扫描下方二维码，并在手机上确认登录。</p>
<p><img src="${qrUrl}" alt="Weixin QR"></p><p><a href="${qrUrl}" target="_blank">二维码打不开？点此链接</a></p>
<div class="status">状态：${status}</div></body></html>`;
}

async function getQr() {
  const data = await getJson(`${BASE_URL}/ilink/bot/get_bot_qrcode?bot_type=${encodeURIComponent(BOT_TYPE)}`);
  if (!data.qrcode || !data.qrcode_img_content) {
    throw new Error(`获取二维码失败: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return { qrcode: data.qrcode, qrcodeUrl: data.qrcode_img_content };
}

async function getStatus(qrcode, baseUrl = BASE_URL) {
  return getJson(`${baseUrl}/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`, 35000);
}

async function main() {
  let { qrcode, qrcodeUrl } = await getQr();
  let statusText = "等待扫码...";
  let currentBase = BASE_URL;
  let scanned = false;
  let refreshCount = 1;
  const deadline = Date.now() + TIMEOUT_MS;

  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderPage(qrcodeUrl, statusText));
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, HOST, resolve);
  });

  const hostShown = HOST === "0.0.0.0" ? "127.0.0.1" : HOST;
  console.log(`\n打开浏览器访问: http://${hostShown}:${PORT}/`);
  console.log(`局域网访问: http://192.168.0.108:${PORT}/`);
  console.log(`二维码链接: ${qrcodeUrl}\n`);

  while (Date.now() < deadline) {
    const st = await getStatus(qrcode, currentBase);
    switch (st.status) {
      case "wait":
        statusText = "等待扫码...";
        break;
      case "scaned":
        if (!scanned) {
          scanned = true;
          statusText = "已扫码，请在微信里确认登录";
          console.log("已扫码，请在手机上确认...");
        }
        break;
      case "scaned_but_redirect":
        if (st.redirect_host) {
          currentBase = `https://${st.redirect_host}`;
          statusText = `重定向到 ${st.redirect_host}...`;
        }
        break;
      case "expired":
        refreshCount += 1;
        if (refreshCount > 5) throw new Error("二维码多次过期，请重试");
        ({ qrcode, qrcodeUrl } = await getQr());
        scanned = false;
        statusText = `二维码已刷新 (${refreshCount}/5)，请重新扫码`;
        console.log(statusText);
        break;
      case "confirmed":
        if (!st.ilink_bot_id || !st.bot_token) {
          throw new Error("登录成功但缺少 token/bot id");
        }
        saveAccount(st.ilink_bot_id, {
          token: st.bot_token,
          baseUrl: st.baseurl || BASE_URL,
          userId: st.ilink_user_id,
        });
        statusText = "登录成功！可以回到 pi-web 执行 /weixin-login 或让 agent 使用微信。";
        console.log(`\n登录成功: account=${st.ilink_bot_id}`);
        server.close();
        process.exit(0);
        break;
      default:
        statusText = `未知状态: ${st.status}`;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  server.close();
  throw new Error("登录超时，请重试");
}

main().catch((err) => {
  console.error("登录失败:", err.message || err);
  process.exit(1);
});
