/**
 * GF-kzt（显示名 kzt）—— QQ 官方机器人「网页控制台」插件
 *
 * 这里只保留三件事：
 *   1. 把入站消息写进 log/gf/ 日志（控制台的数据源）
 *   2. 读写控制台用到的数据：昵称记录、会话置顶
 *   3. 注册后台路由与 React 页面；外加 Sharp 运行时依赖的检测 / 安装
 *
 * 不响应任何聊天指令，也不再有任何游戏 / 签到 / 运势 / 音乐功能。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { pathToFileURL as pathToFileURL$1 } from 'node:url';

function 清理文本(v) {
  return String(v ?? "").trim();
}
/**
 * 取出纯文本，但**保留换行**——消息的多行排版全靠它，压成一行就没法渲染了。
 * 只压缩空格 / 制表符，`\n` 原样留下。
 */
function 提取纯文本(content) {
  return String(content ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/<qqbot-at-user[^>]*>/gi, " ")
    .replace(/<qqbot-at-everyone[^>]*>/gi, " ")
    .replace(/<@!?[A-Za-z0-9_]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function 取用户Id(event) {
  const author = event.author;
  return String(
    event.user_openid || event.group_member_openid || author?.user_openid || author?.member_openid || author?.union_openid || author?.id || ""
  ).trim() || "unknown";
}
function resolvePluginDataFile$2(ctx, rel) {
  const pluginDir = String(ctx.pluginPath || "").trim();
  return path.resolve(pluginDir, "data", rel);
}
function resolveUserDataFile$2(ctx, rel) {
  const dataDir = String(ctx.dataPath || "").trim();
  if (!dataDir) return resolvePluginDataFile$2(ctx, rel);
  return path.resolve(dataDir, rel);
}

// ===== 图床：入站图片转存，让控制台里的图片不随官方链接过期 =====
const CDN58_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.95 Safari/537.36";
function ok(source, url) {
  return { code: 0, msg: "success", data: { url, source } };
}
function fail(msg) {
  return { code: -1, msg };
}
function guid() {
  const hex = crypto.randomBytes(16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(12, 15)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
function randomAlphaNum(len) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function cdn58Encrypt(data) {
  let str = Buffer.from(data, "utf8").toString("base64");
  const equalCount = (str.match(/=/g) || []).length;
  str = str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "") + String(equalCount);
  const half = Math.floor(str.length / 2);
  return str.slice(half) + str.slice(0, half);
}
function mimeByExt(ext) {
  const map = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    bmp: "image/bmp",
    webp: "image/webp"
  };
  return map[ext.toLowerCase()] || "application/octet-stream";
}
async function resolveUploadPayload(input) {
  if (input.buffer && input.buffer.length > 0) {
    const filename = input.filename || `upload_${Date.now()}.jpg`;
    return { buffer: input.buffer, filename };
  }
  if (input.filepath) {
    const abs = path.isAbsolute(input.filepath) ? input.filepath : path.resolve(input.filepath);
    if (!fs.existsSync(abs)) throw new Error("文件不存在");
    const buffer = fs.readFileSync(abs);
    const filename = input.filename || path.basename(abs);
    return { buffer, filename };
  }
  if (input.url) {
    const res = await fetch(input.url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": CDN58_UA,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
      }
    });
    if (!res.ok) throw new Error(`下载图片失败 HTTP ${res.status}`);
    const ab = await res.arrayBuffer();
    const buffer = Buffer.from(ab);
    let filename = input.filename || "upload.jpg";
    try {
      const u = new URL(input.url);
      const base = path.basename(u.pathname);
      if (base && base.includes(".")) filename = base;
    } catch {
    }
    const ct = String(res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const byCt = {
      "image/png": "png",
      "image/gif": "gif",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/webp": "webp",
      "image/bmp": "bmp"
    };
    const ext = byCt[ct];
    if (ext) {
      filename = `${String(filename).replace(/\.[^.]+$/, "") || "upload"}.${ext}`;
    }
    return { buffer, filename };
  }
  throw new Error("缺少图片内容（buffer / filepath / url）");
}
async function uploadCdn58(buffer, filename) {
  const ext = path.extname(filename).replace(/^\./, "").toLowerCase();
  if (!["jpg", "jpeg", "png", "gif", "bmp"].includes(ext)) {
    throw new Error("58同城不支持该格式");
  }
  const userId = `58Anonymous${guid()}`;
  const userInfo = {
    user_id: userId,
    source: "14",
    im_token: userId,
    client_version: "1.0",
    client_type: "pcweb",
    os_type: "Chrome",
    os_version: "122.0.6261.95",
    appid: "10140-mcs@jitmouQrcHs",
    extend_flag: "0",
    unread_index: "1",
    sdk_version: "6432",
    device_id: userId,
    xxzl_smartid: "",
    id58: "CkwAd2e0U3tBNxbRAzQ2Ag=="
  };
  const params = cdn58Encrypt(new URLSearchParams(userInfo).toString());
  const postBody = cdn58Encrypt(
    JSON.stringify({
      sender_id: userId,
      sender_source: 14,
      to_id: "10002",
      to_source: 100,
      file_suffixs: [ext]
    })
  );
  const getUrl = `https://im.58.com/msg/get_pic_upload_url?params=${encodeURIComponent(params)}&version=j1.0`;
  const getRes = await fetch(getUrl, {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      Origin: "https://ai.58.com",
      Referer: "https://ai.58.com/pc/",
      "User-Agent": CDN58_UA
    },
    body: postBody
  });
  const getText = await getRes.text();
  const getJson = JSON.parse(getText);
  if (getJson?.error_code !== 0 || !getJson?.data?.upload_info?.[0]?.url) {
    throw new Error(getJson?.error_msg || "58同城获取上传地址失败");
  }
  const putUrl = String(getJson.data.upload_info[0].url);
  const putRes = await fetch(putUrl, {
    method: "PUT",
    signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": mimeByExt(ext) },
    body: new Uint8Array(buffer)
  });
  if (!putRes.ok) throw new Error(`58同城上传失败 HTTP ${putRes.status}`);
  const marker = "/nowater/im/";
  const idx = putUrl.indexOf(marker);
  if (idx < 0) throw new Error("58同城上传地址解析失败");
  const tail = putUrl.slice(idx + marker.length).split("?")[0];
  return `https://pic${Math.floor(Math.random() * 8) + 1}.58cdn.com.cn/nowater/im/${tail}`;
}
async function uploadPngcm(buffer, filename) {
  const form = new FormData();
  form.append("name", filename);
  form.append("uuid", `o_${randomAlphaNum(27)}`);
  form.append("sign", String(Math.floor(Date.now() / 1e3)));
  form.append("file", new Blob([new Uint8Array(buffer)]), filename);
  const res = await fetch("https://img.wnflb2023.com/application/upload.php", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    body: form,
    headers: { Referer: "https://img.wnflb2023.com/" }
  });
  const arr = await res.json();
  if (arr?.code === 200 && arr?.url) return String(arr.url);
  throw new Error(arr?.message || "fuliba 上传失败");
}
async function uploadImgdd(buffer, filename) {
  const form = new FormData();
  form.append("image", new Blob([new Uint8Array(buffer)]), filename);
  const res = await fetch("https://imgdd.com/upload", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    body: form,
    headers: { Referer: "https://imgdd.com/" }
  });
  const arr = await res.json();
  if (arr?.url) return String(arr.url);
  throw new Error(arr?.message || "IMGDD 上传失败");
}
async function upload(input) {
  let buffer;
  let filename;
  try {
    ({ buffer, filename } = await resolveUploadPayload(input));
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
  if (buffer.length > 10 * 1024 * 1024) {
    return fail("文件最大10M");
  }
  const chain = [
    { source: "cdn58", fn: () => uploadCdn58(buffer, filename) },
    { source: "pngcm", fn: () => uploadPngcm(buffer, filename) },
    { source: "imgdd", fn: () => uploadImgdd(buffer, filename) }
  ];
  const errors = [];
  for (const item of chain) {
    try {
      const url = await item.fn();
      return ok(item.source, url);
    } catch (e) {
      errors.push(`${item.source}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return fail(errors.join(" | ") || "全部图床上传失败");
}

// ===== Sharp 运行时依赖：检测 / 安装 / 进度，供控制台「系统设置」使用 =====
const SHARP_RUNTIME_DEPS_DIR = "runtime-deps";
let sharpModule = null;
let searchPaths = [];
let sharpInstallPromise = null;
let activeNpmInstallChild = null;
const activeNpmInstallTimers = {
  tick: null,
  timer: null
};
const sharpInstallState = {
  phase: "idle",
  detail: "",
  error: "",
  startedAt: 0,
  percent: 0,
  logPath: ""
};
function resolveSharpRuntimeDepsDir(dataDir) {
  return path.join(path.resolve(String(dataDir || "").trim()), SHARP_RUNTIME_DEPS_DIR);
}
function resolveSharpInstallDir(paths) {
  const dataDir = String(paths.dataDir || "").trim();
  if (dataDir) return resolveSharpRuntimeDepsDir(dataDir);
  return path.resolve(String(paths.pluginDir || "").trim());
}
function configureSharpRuntimePaths(paths) {
  const dataDir = String(paths.dataDir || "").trim();
  const pluginDir = String(paths.pluginDir || "").trim();
  const next = [];
  if (dataDir) next.push(resolveSharpRuntimeDepsDir(dataDir));
  if (pluginDir) next.push(path.resolve(pluginDir));
  searchPaths = next;
}
function fileExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}
function sharpEntryCandidates(baseDir) {
  const root = path.join(baseDir, "node_modules", "sharp");
  return [path.join(root, "lib", "index.js"), path.join(root, "lib", "sharp.js")];
}
async function importSharpFromDir(baseDir) {
  for (const entry of sharpEntryCandidates(baseDir)) {
    if (!fileExists(entry)) continue;
    try {
      const mod = await import(pathToFileURL$1(entry).href);
      const factory = mod.default ?? mod;
      if (typeof factory === "function") return factory;
    } catch {
    }
  }
  return null;
}
function resetSharpModuleCache() {
  sharpModule = null;
}
async function loadSharp() {
  if (sharpModule) return sharpModule;
  for (const dir of searchPaths) {
    const loaded = await importSharpFromDir(dir);
    if (loaded) {
      sharpModule = loaded;
      return loaded;
    }
  }
  const mod = await import('sharp');
  sharpModule = mod.default ?? mod;
  return sharpModule;
}
async function probeSharpAvailable(timeoutMs = 8e3) {
  try {
    return await Promise.race([
      (async () => {
        const sharp = await loadSharp();
        await sharp({
          create: { width: 2, height: 2, channels: 3, background: "#000" }
        }).png().toBuffer();
        return true;
      })(),
      new Promise((resolve) => {
        setTimeout(() => resolve(false), timeoutMs);
      })
    ]);
  } catch {
    return false;
  }
}
function isSharpPackagePresentAt(baseDir) {
  const dir = String(baseDir || "").trim();
  if (!dir) return false;
  return fileExists(path.join(dir, "node_modules", "sharp", "package.json"));
}
function isSharpPackagePresent(paths) {
  for (const dir of [resolveSharpInstallDir(paths), ...searchPaths]) {
    if (dir && isSharpPackagePresentAt(dir)) return true;
  }
  const pluginDir = String(paths.pluginDir || "").trim();
  if (pluginDir && isSharpPackagePresentAt(pluginDir)) return true;
  return false;
}
function ensureSharpRuntimePackage(paths, logger) {
  const installDir = resolveSharpInstallDir(paths);
  fs.mkdirSync(installDir, { recursive: true });
  const pkgPath = path.join(installDir, "package.json");
  if (fileExists(pkgPath)) return installDir;
  const pluginPkgPath = path.join(String(paths.pluginDir || "").trim(), "package.json");
  let sharpRange = "^0.34.3";
  try {
    if (fileExists(pluginPkgPath)) {
      const pluginPkg = JSON.parse(fs.readFileSync(pluginPkgPath, "utf-8"));
      if (pluginPkg?.dependencies?.sharp) sharpRange = pluginPkg.dependencies.sharp;
    }
  } catch (e) {
    logger?.warn?.("[依赖] 读取插件 package.json 失败，使用默认 sharp 版本", e);
  }
  const runtimePkg = {
    name: "gf-mk-sharp-runtime-deps",
    private: true,
    type: "module",
    dependencies: {
      sharp: sharpRange
    }
  };
  fs.writeFileSync(pkgPath, JSON.stringify(runtimePkg, null, 2), "utf-8");
  logger?.info?.(`[依赖] 已写入 ${pkgPath}`);
  return installDir;
}
function detectLinuxLibc() {
  if (process.platform !== "linux") return "";
  if (fileExists("/lib/ld-musl-x86_64.so.1") || fileExists("/lib/ld-musl-aarch64.so.1") || fileExists("/lib/ld-musl-armhf.so.1")) {
    return "musl";
  }
  return "glibc";
}
function buildPlatformLabel() {
  const libc = detectLinuxLibc();
  const base = `${os.platform()}-${os.arch()}`;
  return libc ? `${base} (${libc})` : base;
}
function buildManualInstallHint(installDir, paths) {
  const dir = path.resolve(String(installDir || "").trim() || ".");
  const platform = buildPlatformLabel();
  const dataHint = paths.dataDir ? `（咔咔珂请装到 data 目录下的 ${SHARP_RUNTIME_DEPS_DIR}，勿在 plugins 目录 npm install）` : "";
  return [
    `平台: ${platform} · Node ${process.version}${dataHint}`,
    "SSH 手动安装：",
    `cd "${dir}"`,
    "rm -rf node_modules/sharp node_modules/@img",
    "npm config set registry https://registry.npmmirror.com   # 国内建议",
    "npm install --omit=dev --no-audit --no-fund",
    `日志: ${path.join(dir, "sharp-install.log")}`
  ].join("\n");
}
function isSharpInstallRunning() {
  return sharpInstallPromise != null || sharpInstallState.phase === "running";
}
async function probeSharpSafe(timeoutMs = 8e3) {
  if (isSharpInstallRunning()) return false;
  return probeSharpAvailable(timeoutMs);
}
function clearNpmInstallTimers() {
  if (activeNpmInstallTimers.tick) {
    clearInterval(activeNpmInstallTimers.tick);
    activeNpmInstallTimers.tick = null;
  }
  if (activeNpmInstallTimers.timer) {
    clearTimeout(activeNpmInstallTimers.timer);
    activeNpmInstallTimers.timer = null;
  }
}
function killNpmInstallChild(logger) {
  const child = activeNpmInstallChild;
  if (!child) return;
  activeNpmInstallChild = null;
  try {
    if (process.platform === "win32" && child.pid) {
      spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        shell: true,
        stdio: "ignore"
      });
    } else {
      child.kill("SIGKILL");
    }
  } catch (e) {
    logger?.warn?.("[依赖] 终止 npm install 进程失败:", e);
  }
}
function cancelSharpDependencyInstall(logger) {
  clearNpmInstallTimers();
  killNpmInstallChild(logger);
  sharpInstallPromise = null;
  sharpInstallState.phase = "idle";
  sharpInstallState.detail = "";
  sharpInstallState.error = "";
  sharpInstallState.percent = 0;
  sharpInstallState.startedAt = 0;
  sharpInstallState.logPath = "";
  resetSharpModuleCache();
  logger?.info?.("[依赖] Sharp 安装任务已取消（插件停用）");
}
function setInstallProgress(phase, detail, percent, error = "") {
  sharpInstallState.phase = phase;
  sharpInstallState.detail = detail;
  sharpInstallState.percent = Math.max(0, Math.min(100, percent));
  sharpInstallState.error = error;
  if (phase === "running" && !sharpInstallState.startedAt) {
    sharpInstallState.startedAt = Date.now();
  }
}
function findNpmCliJs() {
  const nodeDir = path.dirname(process.execPath);
  const guesses = [
    path.join(nodeDir, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(nodeDir, "..", "libexec", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(nodeDir, "node_modules", "npm", "bin", "npm-cli.js")
  ];
  for (const g of guesses) {
    if (fileExists(g)) return g;
  }
  return null;
}
function resolveNpmSpawn(installArgs) {
  const baseOptions = {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      npm_config_fund: "false",
      npm_config_audit: "false",
      npm_config_fetch_timeout: "600000",
      npm_config_progress: "true"
    }
  };
  if (process.platform === "win32") {
    return {
      command: "npm.cmd",
      args: installArgs,
      options: { ...baseOptions, shell: true }
    };
  }
  const npmCli = findNpmCliJs();
  if (npmCli) {
    return {
      command: process.execPath,
      args: [npmCli, ...installArgs],
      options: baseOptions
    };
  }
  const localNpm = path.join(path.dirname(process.execPath), "npm");
  if (fileExists(localNpm)) {
    return { command: localNpm, args: installArgs, options: baseOptions };
  }
  return { command: "npm", args: installArgs, options: baseOptions };
}
function appendInstallLog(logPath, chunk) {
  if (!logPath || !chunk) return;
  try {
    fs.appendFileSync(logPath, chunk, "utf-8");
  } catch {
  }
}
function cleanBrokenSharpArtifacts(installDir, logger) {
  const nm = path.join(path.resolve(installDir), "node_modules");
  for (const name of ["sharp", "@img"]) {
    const target = path.join(nm, name);
    if (!fileExists(target)) continue;
    try {
      fs.rmSync(target, { recursive: true, force: true });
      logger?.info?.(`[依赖] 已清理: ${target}`);
    } catch (e) {
      logger?.warn?.(`[依赖] 清理 ${target} 失败:`, e);
    }
  }
}
function runNpmInstall(installDir, timeoutMs, logger, onProgress) {
  return new Promise((resolve) => {
    const cwd = path.resolve(installDir);
    const pkgPath = path.join(cwd, "package.json");
    if (!fileExists(pkgPath)) {
      resolve({ ok: false, message: "package.json 不存在" });
      return;
    }
    const logPath = path.join(cwd, "sharp-install.log");
    sharpInstallState.logPath = logPath;
    try {
      fs.writeFileSync(
        logPath,
        `[${(/* @__PURE__ */ new Date()).toISOString()}] Sharp install · ${buildPlatformLabel()} · cwd=${cwd}
`,
        "utf-8"
      );
    } catch {
    }
    const installArgs = ["install", "--omit=dev", "--no-audit", "--no-fund", "--loglevel=warn"];
    const spawnSpec = resolveNpmSpawn(installArgs);
    onProgress?.("正在执行 npm install…", 15);
    logger?.info?.(
      `[依赖] 正在 ${cwd} 执行 npm install（${spawnSpec.command} ${spawnSpec.args.join(" ")}）…`
    );
    const child = spawn(spawnSpec.command, spawnSpec.args, { ...spawnSpec.options, cwd });
    activeNpmInstallChild = child;
    let stderr = "";
    let stdout = "";
    const started = Date.now();
    clearNpmInstallTimers();
    activeNpmInstallTimers.tick = setInterval(() => {
      const elapsed = Date.now() - started;
      onProgress?.(
        "正在下载 Sharp 原生包（装到 data/runtime-deps，避免插件热重载）…",
        Math.min(88, 15 + Math.floor(elapsed / 4e3))
      );
    }, 2e3);
    activeNpmInstallTimers.timer = setTimeout(() => {
      clearNpmInstallTimers();
      killNpmInstallChild(logger);
      appendInstallLog(logPath, `
[timeout] exceeded ${timeoutMs}ms
`);
      resolve({
        ok: false,
        message: "npm install 超时，请 SSH 手动安装（见 sharp-install.log）"
      });
    }, timeoutMs);
    const finish = (result) => {
      clearNpmInstallTimers();
      if (activeNpmInstallChild === child) activeNpmInstallChild = null;
      appendInstallLog(logPath, `
[result] ${result.ok ? "ok" : "fail"}: ${result.message}
`);
      if (result.ok) {
        logger?.info?.("[依赖] npm install 完成");
      } else {
        logger?.warn?.(`[依赖] npm install 失败: ${result.message}`);
      }
      resolve(result);
    };
    child.stdout?.on("data", (chunk) => {
      const text = String(chunk || "");
      stdout += text;
      appendInstallLog(logPath, text);
    });
    child.stderr?.on("data", (chunk) => {
      const text = String(chunk || "");
      stderr += text;
      appendInstallLog(logPath, text);
    });
    child.on("error", (err) => {
      const msg = err?.message || String(err);
      finish({
        ok: false,
        message: msg.includes("ENOENT") ? `${msg}（未找到 npm，请 SSH 手动安装）` : msg
      });
    });
    child.on("close", (code) => {
      if (code === 0) {
        onProgress?.("依赖下载完成，正在验证 Sharp…", 92);
        finish({ ok: true, message: "ok" });
        return;
      }
      const tail = (stderr || stdout).trim().split(/\r?\n/).slice(-8).join(" ");
      finish({ ok: false, message: tail || `npm install 退出码 ${code ?? "unknown"}` });
    });
  });
}
async function installSharpOnce(paths, logger) {
  setInstallProgress("running", "准备安装…", 5);
  resetSharpModuleCache();
  const installDir = ensureSharpRuntimePackage(paths, logger);
  if (!installDir || !fileExists(path.join(installDir, "package.json"))) {
    setInstallProgress("failed", "无法创建 runtime-deps", 0, "无法创建安装目录");
    return false;
  }
  setInstallProgress("running", "清理旧 Sharp 原生包…", 10);
  cleanBrokenSharpArtifacts(installDir, logger);
  const result = await runNpmInstall(installDir, 6e5, logger, (detail, percent) => {
    setInstallProgress("running", detail, percent);
  });
  resetSharpModuleCache();
  if (!result.ok) {
    setInstallProgress(
      "failed",
      result.message,
      0,
      `${result.message}
${buildManualInstallHint(installDir, paths)}`
    );
    return false;
  }
  setInstallProgress("running", "验证 Sharp 模块…", 95);
  if (await probeSharpAvailable(15e3)) {
    setInstallProgress("success", "Sharp 已安装并可用", 100);
    logger?.info?.(`[依赖] Sharp 已就绪: ${installDir}`);
    return true;
  }
  const msg = [
    `npm 已完成但 Sharp 仍无法加载（${buildPlatformLabel()}）`,
    buildManualInstallHint(installDir, paths)
  ].join("\n");
  setInstallProgress("failed", "Sharp 验证失败", 0, msg);
  logger?.warn?.(`[依赖] ${msg}`);
  return false;
}
async function getSharpDependencyStatus(paths) {
  const installDir = resolveSharpInstallDir(paths);
  const pluginDir = path.resolve(String(paths.pluginDir || "").trim());
  const dataDir = String(paths.dataDir || "").trim();
  const installing = isSharpInstallRunning();
  const packagePresent = isSharpPackagePresent(paths);
  const platform = buildPlatformLabel();
  const manualHint = buildManualInstallHint(installDir, paths);
  const logPath = sharpInstallState.logPath || path.join(installDir, "sharp-install.log");
  const available = installing ? false : await probeSharpSafe();
  let message = "";
  if (installing) {
    message = sharpInstallState.detail || "正在安装中…";
  } else if (available) {
    message = `Sharp 已就绪（${platform}）`;
  } else if (sharpInstallState.phase === "failed" && sharpInstallState.error) {
    message = sharpInstallState.error;
  } else if (packagePresent) {
    message = `检测到 sharp 包但无法加载（${platform}），请重新安装`;
  } else {
    message = `未安装 Sharp（${platform}），将安装到 data/${SHARP_RUNTIME_DEPS_DIR}`;
  }
  return {
    available,
    packagePresent,
    installing,
    platform,
    libc: detectLinuxLibc(),
    installDir,
    pluginDir,
    dataDir,
    message,
    phase: installing ? "running" : sharpInstallState.phase,
    detail: sharpInstallState.detail,
    percent: sharpInstallState.percent,
    logPath,
    manualHint
  };
}
async function triggerSharpDependencyInstall(paths, logger) {
  if (!isSharpInstallRunning() && await probeSharpSafe()) {
    setInstallProgress("success", "Sharp 已就绪", 100);
    return { accepted: false, message: "Sharp 已就绪，无需重复安装" };
  }
  if (sharpInstallPromise) {
    return { accepted: true, message: "安装已在进行中" };
  }
  sharpInstallState.startedAt = Date.now();
  sharpInstallState.error = "";
  setInstallProgress("running", "已开始安装…", 8);
  sharpInstallPromise = installSharpOnce(paths, logger).catch((e) => {
    const msg = e instanceof Error ? e.message : String(e);
    setInstallProgress("failed", msg, 0, msg);
    logger?.error?.("[依赖] 安装异常:", e);
    return false;
  }).finally(() => {
    sharpInstallPromise = null;
  });
  return { accepted: true, message: "已开始安装，请稍候" };
}

// ===== 昵称记录：控制台会话列表与消息气泡的显示名 =====
function sanitizeUserId(userId) {
  return String(userId || "").trim().replace(/[\\/:*?"<>|]/g, "_").slice(0, 128);
}
function resolveNicknameDir(ctx) {
  return resolveUserDataFile$2(ctx, "昵称记录");
}
function resolveNicknameFile(ctx, userId) {
  const id = sanitizeUserId(userId);
  if (!id) throw new Error("empty userId");
  return path.join(resolveNicknameDir(ctx), `${id}.json`);
}
function 取事件昵称(event) {
  const author = event.author;
  return String(author?.username || author?.name || "").trim();
}
function 读昵称记录(ctx, userId) {
  const id = sanitizeUserId(userId);
  if (!id) return null;
  const file = path.join(resolveNicknameDir(ctx), `${id}.json`);
  try {
    if (!fs.existsSync(file)) return null;
    const o = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!o || typeof o !== "object") return null;
    return {
      userId: String(o.userId || id),
      nickname: String(o.nickname || "").trim(),
      updatedAt: String(o.updatedAt || ""),
      updatedAtMs: Number(o.updatedAtMs) || 0
    };
  } catch {
    return null;
  }
}
function 取缓存昵称(ctx, userId) {
  return 读昵称记录(ctx, userId)?.nickname || "";
}
function 更新昵称记录(ctx, userId, nickname) {
  const id = sanitizeUserId(userId);
  const name = String(nickname || "").trim();
  if (!id || id === "unknown" || !name) return false;
  const prev = 读昵称记录(ctx, id);
  if (prev?.nickname === name) return false;
  const now = /* @__PURE__ */ new Date();
  const record = {
    userId: id,
    nickname: name,
    updatedAt: now.toISOString(),
    updatedAtMs: now.getTime()
  };
  const file = resolveNicknameFile(ctx, id);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}
`, "utf8");
    ctx.logger?.debug?.(
      prev?.nickname ? `[昵称记录] 更新 ${id}: ${prev.nickname} → ${name}` : `[昵称记录] 新建 ${id}: ${name}`
    );
    return true;
  } catch (e) {
    ctx.logger?.warn?.("[kzt] 写入昵称记录失败:", e);
    return false;
  }
}
function 同步事件昵称(ctx, event) {
  const uid = 取用户Id(event);
  const name = 取事件昵称(event);
  更新昵称记录(ctx, uid, name);
}

// ===== 消息日志 / 会话 / 排行 / 仪表盘 / 路由注册 =====
/**
 * 其他机器人的「蓝色按钮」是 markdown 里的 mqqapi 内联指令链接，形如
 *   [属性](mqqapi://aio/inlinecmd?command=星甲属性&enter=false&reply=false)
 *   [签到](mqqapi://aio/inlinecmd?commandmd=<几十KB base64>&cmd=签到&enter=false)
 * 指令参数可能是 cmd / command / text，commandmd 是渲染用的 md 载荷、对展示没意义，
 * 还会把日志撑爆。这里统一压成「只留指令参数」的最短形态，其余参数丢弃。
 */
function 安全解码(v) {
  try {
    return decodeURIComponent(String(v ?? "").replace(/\+/g, " "));
  } catch {
    return String(v ?? "");
  }
}
/**
 * QQ markdown 的内联指令标签：`<qqbot-cmd-input text="%E7%AD%BE%E5%88%B0" show="签到" />`
 * 客户端会把它渲染成可点的蓝色按钮。这里统一转成 mqqapi 内联链接，
 * 前端只处理一种形态，日志里也短得多。
 */
function 内联标签转链接(tag) {
  const attrs = String(tag || "");
  const 取 = (name) => {
    const m = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s/>]+))`, "i").exec(attrs);
    return m ? m[1] ?? m[2] ?? m[3] ?? "" : "";
  };
  const 指令 = 安全解码(取("text")) || 安全解码(取("command"));
  const 文字 = (安全解码(取("show")) || 指令).replace(/[[\]]/g, "").trim();
  if (!指令) return 文字;
  return `[${文字 || 指令}](mqqapi://aio/inlinecmd?cmd=${encodeURIComponent(指令)})`;
}
function 压缩内联指令(s) {
  const 取指令 = (href) => {
    const q = String(href).split("?")[1] || "";
    try {
      const p = new URLSearchParams(q);
      for (const key of ["cmd", "command", "text"]) {
        const v = p.get(key);
        if (v) return { key, value: v };
      }
    } catch {
      // ignore
    }
    return null;
  };
  const 压 = (m, label, href) => {
    const hit = 取指令(href);
    return hit ? `[${label}](mqqapi://aio/inlinecmd?${hit.key}=${encodeURIComponent(hit.value)})` : label;
  };
  return String(s ?? "")
    .replace(/\[([^\]]+)\]\((mqqapi:[^)\s]+)\)/gi, 压)
    .replace(/([^\s()[\]{}]{1,24})\((mqqapi:[^)\s]+)\)/gi, 压);
}
function 规范化展示内容(content) {
  let s = String(content ?? "");
  if (!s) return "";
  s = s.replace(
    /<\s*face[^>\n]*faceId\s*=\s*["']?(\d+)["']?[^>\n]*>?/gi,
    (_m, id) => `[表情${id}]`
  );
  s = s.replace(/<\s*faceType\s*=[^>\n]*>?/gi, "[表情]");
  s = s.replace(/faceType\s*=\s*\d+\s*,\s*faceId\s*=\s*["']?\d+["']?[^<\n]*/gi, "[表情]");
  s = s.replace(/<\s*emoji[^>\n]*>?/gi, "[表情]");
  s = s.replace(/<\s*img\b[^>\n]*>?/gi, "[图片]");
  s = s.replace(/<\s*video\b[^>\n]*>?/gi, "[视频]");
  s = s.replace(/<\s*file\b[^>\n]*>?/gi, "[文件]");
  // 内联指令标签必须在「通用标签清理」之前转换，否则会被整段删掉
  s = s.replace(/<qqbot-cmd-(?:input|enter)\b[^>\n]*\/?>/gi, (m) => 内联标签转链接(m));
  s = s.replace(/<[^>\n]{1,120}>/g, (m) => {
    if (/^<@!?[A-Za-z0-9_]+>$/i.test(m.trim())) return m;
    return "";
  });
  return 压缩内联指令(
    s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim()
  );
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function todayYmd$1(d = /* @__PURE__ */ new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function resolveGfLogRoot(ctx) {
  const root = String(ctx.frameworkEnv?.projectRoot || "").trim();
  if (root) return path.join(root, "log", "gf");
  const plugin = String(ctx.pluginPath || "").trim();
  if (plugin) return path.resolve(plugin, "..", "..", "log", "gf");
  return path.join(process.cwd(), "log", "gf");
}
function dayFile(root, scope, ymd) {
  return path.join(root, scope, `${ymd}.jsonl`);
}
function ensureParent$1(file) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function loadNicknameCache(root) {
  const f = path.join(root, "nicknames.json");
  try {
    if (!fs.existsSync(f)) return {};
    const o = JSON.parse(fs.readFileSync(f, "utf8"));
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}
function saveNicknameCache(root, cache) {
  try {
    ensureParent$1(path.join(root, "nicknames.json"));
    fs.writeFileSync(path.join(root, "nicknames.json"), `${JSON.stringify(cache, null, 2)}
`, "utf8");
  } catch {
  }
}
/**
 * 读写日志的高频路径：控制台每秒轮询一次，日志是按天追加的。
 * 用 mtime + size 做键缓存解析结果，文件没变就不重复 JSON.parse。
 * 注意：返回的是缓存内的数组，调用方只读（需要排序请先复制）。
 */
const jsonlCache = new Map();
const JSONL_CACHE_MAX = 64;

function readJsonlFile(file) {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return [];
  }
  const cacheKey = `${stat.mtimeMs}:${stat.size}`;
  const cached = jsonlCache.get(file);
  if (cached && cached.key === cacheKey) return cached.entries;

  const entries = [];
  try {
    const text = fs.readFileSync(file, "utf8");
    if (text.trim()) {
      for (const line of text.split(/\r?\n/)) {
        const s = line.trim();
        if (!s) continue;
        try {
          const o = JSON.parse(s);
          if (o && typeof o === "object" && o.ts) entries.push(o);
        } catch {
        }
      }
    }
  } catch {
    return [];
  }

  if (jsonlCache.size >= JSONL_CACHE_MAX) {
    const oldest = jsonlCache.keys().next().value;
    if (oldest !== undefined) jsonlCache.delete(oldest);
  }
  jsonlCache.set(file, { key: cacheKey, entries });
  return entries;
}
function resolveBotMeta(ctx) {
  const root = String(ctx.frameworkEnv?.projectRoot || "").trim();
  const connId = String(ctx.connectionId || ctx.frameworkEnv?.connectionId || "").trim();
  const empty = { name: "GF Bot", avatar: "", appId: "", running: false };
  if (!root) return empty;
  try {
    const raw = JSON.parse(
      fs.readFileSync(path.join(root, "data", "connections.json"), "utf8")
    );
    const list = Array.isArray(raw.connections) ? raw.connections : [];
    const picked = (connId ? list.find((c) => c.id === connId) : void 0) || list.find((c) => (c.type ?? "") === "qq_official" && c.enable !== false) || list.find((c) => (c.type ?? "") === "qq_official");
    if (!picked) return empty;
    const botProfile = picked.botProfile;
    return {
      name: String(botProfile?.username || picked.name || "GF Bot"),
      avatar: String(botProfile?.avatar || ""),
      appId: String(picked.appId || ""),
      running: picked.enable !== false
    };
  } catch {
    return empty;
  }
}
function groupIdOf(event) {
  return String(event.group_openid || event.group_id || "").trim();
}
function classifyMessageScope(eventType) {
  const t = String(eventType || "");
  if (t === "GROUP_AT_MESSAGE_CREATE" || t === "GROUP_MESSAGE_CREATE") {
    return "group";
  }
  if (t === "C2C_MESSAGE_CREATE") return "private";
  return null;
}
function writeLogEntry(ctx, entry) {
  const root = resolveGfLogRoot(ctx);
  const file = dayFile(root, entry.scope, todayYmd$1(new Date(entry.time || Date.now())));
  try {
    ensureParent$1(file);
    fs.appendFileSync(file, `${JSON.stringify(entry)}
`, "utf8");
    if (entry.userId && entry.userId !== "unknown" && entry.userName) {
      const cache = loadNicknameCache(root);
      if (cache[entry.userId] !== entry.userName) {
        cache[entry.userId] = entry.userName;
        saveNicknameCache(root, cache);
      }
    }
    // 「保留天数」设了才真的删；内部按小时节流，不会每条消息都扫盘
    try {
      清理过期日志(ctx);
    } catch {
      // 清理失败不影响写入
    }
  } catch (e) {
    ctx.logger?.warn?.("[kzt] 写入消息日志失败:", e);
  }
}
function resolveDisplayName(ctx, event, userId) {
  const fromEvent = 取事件昵称(event);
  if (fromEvent) return fromEvent;
  return 取缓存昵称(ctx, userId);
}
function resolveEntryRankable(e) {
  if (typeof e.rankable === "boolean") return e.rankable;
  return 判定计入排行({
    scope: e.scope,
    eventType: e.eventType,
    content: e.content,
    rawContent: ""
  });
}
function collectImageAttachments(event) {
  const e = event;
  const d = e.d && typeof e.d === "object" ? e.d : void 0;
  const raw = e.attachments ?? d?.attachments;
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const a = item;
    const url = String(a.url || "").trim();
    if (!/^https?:\/\//i.test(url)) continue;
    const contentType = String(a.content_type || a.contentType || "").trim().toLowerCase();
    const filename = String(a.filename || a.file_name || "").trim();
    const isImage = contentType.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp)(?:$|\?)/i.test(filename) || /\.(jpe?g|png|gif|webp|bmp)(?:$|\?)/i.test(url);
    if (!isImage) continue;
    out.push({
      url,
      content_type: contentType,
      filename,
      width: Number(a.width) || 0,
      height: Number(a.height) || 0
    });
  }
  return out;
}
function attachmentFilename(att, index) {
  const byCt = {
    "image/png": "png",
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/bmp": "bmp"
  };
  const ext = byCt[att.content_type] || "jpg";
  const base = (att.filename || `img_${index + 1}`).replace(/\.[^.]+$/, "") || `img_${index + 1}`;
  return `${base}.${ext}`;
}
function mdImageLine(url, _width, _height) {
  return `![图片](${url})`;
}
/** 单张图转存 8s、整条消息 10s 的预算：超时就先用官方原链落库，绝不把消息卡在日志之外 */
const 单图转存超时 = 8000;
const 整条转存预算 = 10000;

async function rehostInboundImages(ctx, event) {
  const list = collectImageAttachments(event);
  if (!list.length) return [];
  const lines = [];
  const deadline = Date.now() + 整条转存预算;
  for (let i = 0; i < list.length; i += 1) {
    const att = list[i];
    const fallback = mdImageLine(att.url, att.width, att.height);
    const remain = deadline - Date.now();
    if (remain < 500) {
      lines.push(fallback);
      continue;
    }
    try {
      const result = await Promise.race([
        upload({ url: att.url, filename: attachmentFilename(att, i) }),
        new Promise((resolve) => setTimeout(() => resolve({ code: -1, msg: "图床超时" }), Math.min(remain, 单图转存超时)))
      ]);
      if (result.code === 0 && result.data?.url) {
        lines.push(mdImageLine(result.data.url, att.width, att.height));
        ctx.logger?.info?.(
          `[kzt] 入站图片已转存图床 source=${result.data.source} ${result.data.url}`
        );
      } else {
        lines.push(fallback);
        ctx.logger?.warn?.(`[kzt] 入站图片转存失败，保留原链: ${result.msg}`);
      }
    } catch (error) {
      lines.push(fallback);
      ctx.logger?.warn?.("[kzt] 入站图片转存异常，保留原链:", error);
    }
  }
  return lines;
}
async function recordInboundMessage(ctx, event) {
  const eventType = String(event.t || "");
  const scope = classifyMessageScope(eventType);
  if (!scope) return;
  同步事件昵称(ctx, event);
  const userId = 取用户Id(event);
  const rawContent = String(event.content ?? "");
  let text = 规范化展示内容(提取纯文本(rawContent));
  const imageLines = await rehostInboundImages(ctx, event);
  if (imageLines.length) {
    text = text.replace(/\[表情\d*\]/g, "").replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
  }
  const content = [text, ...imageLines].filter(Boolean).join("\n");
  const now = /* @__PURE__ */ new Date();
  writeLogEntry(ctx, {
    ts: now.toISOString(),
    time: now.getTime(),
    scope,
    eventType,
    userId,
    userName: resolveDisplayName(ctx, event, userId),
    groupId: scope === "group" ? groupIdOf(event) : "",
    content: content || "[空消息]",
    msgId: String(event.id || "").trim(),
    rankable: 判定计入排行({ scope, eventType, rawContent, content }),
    direction: "in"
  });
}
function extractApiMsgId(result) {
  if (!result || typeof result !== "object") return "";
  const o = result;
  const data = o.data && typeof o.data === "object" ? o.data : o;
  return String(data.id || data.msg_id || data.message_id || o.id || o.msg_id || "").trim();
}
function markMessageRecalled(ctx, msgId, opts) {
  const id = String(msgId || "").trim();
  if (!id) return false;
  const days = Math.min(30, Math.max(1, Number(opts?.days) || 7));
  const dates = listLogDates(ctx).slice(0, days);
  if (!dates.length) dates.push(todayYmd$1());
  const root = resolveGfLogRoot(ctx);
  let changed = false;
  for (const ymd of dates) {
    for (const scope of ["group", "private"]) {
      const file = dayFile(root, scope, ymd);
      if (!fs.existsSync(file)) continue;
      const lines = fs.readFileSync(file, "utf-8").split(/\r?\n/);
      let fileChanged = false;
      const next = lines.map((line) => {
        if (!line.trim()) return line;
        try {
          const row = JSON.parse(line);
          if (String(row.msgId || "").trim() !== id) return line;
          if (String(row.content || "").includes("[已撤回]")) return line;
          row.content = `[已撤回] ${String(row.content || "").trim()}`.trim();
          fileChanged = true;
          changed = true;
          return JSON.stringify(row);
        } catch {
          return line;
        }
      });
      if (fileChanged) {
        fs.writeFileSync(file, `${next.filter((l) => l.length).join("\n")}
`, "utf-8");
      }
    }
  }
  return changed;
}
function recordOutboundMessage(ctx, 发送目标, content, apiResult, keyboard) {
  const bot = resolveBotMeta(ctx);
  const text = 规范化展示内容(String(content || "").trim());
  if (!text) return;
  const isGroup = 发送目标.scope === "group";
  const groupId = isGroup ? String(发送目标.group_openid || "").trim() : "";
  const peerId = isGroup ? "" : String(发送目标.user_openid || "").trim();
  if (isGroup && !groupId) return;
  if (!isGroup && !peerId) return;
  const now = /* @__PURE__ */ new Date();
  writeLogEntry(ctx, {
    ts: now.toISOString(),
    time: now.getTime(),
    scope: isGroup ? "group" : "private",
    eventType: "BOT_MESSAGE_CREATE",
    userId: isGroup ? "bot" : peerId,
    userName: bot.name || "Bot",
    groupId,
    content: text,
    msgId: extractApiMsgId(apiResult),
    // 把内嵌键盘一起存下来，控制台才能把按钮还原成可点的样子
    keyboard: keyboard && Array.isArray(keyboard.rows) && keyboard.rows.length ? keyboard : void 0,
    rankable: false,
    direction: "out"
  });
}
function listLogDates(ctx) {
  const root = resolveGfLogRoot(ctx);
  const set = /* @__PURE__ */ new Set();
  for (const scope of ["group", "private"]) {
    const dir = path.join(root, scope);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const m = name.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/);
      if (m) set.add(m[1]);
    }
  }
  return [...set].sort().reverse();
}
function loadDayEntries(ctx, ymd, scope = "all") {
  const root = resolveGfLogRoot(ctx);
  const scopes = scope === "all" ? ["group", "private"] : [scope];
  const list = [];
  for (const s of scopes) {
    list.push(...readJsonlFile(dayFile(root, s, ymd)));
  }
  list.sort((a, b) => (a.time || 0) - (b.time || 0));
  return list;
}
function aggregateUsageMaps(entries) {
  const groupMap = /* @__PURE__ */ new Map();
  const userMap = /* @__PURE__ */ new Map();
  const nick = {};
  for (const e of entries) {
    if (!resolveEntryRankable(e)) continue;
    if (e.direction === "out" || e.eventType === "BOT_MESSAGE_CREATE") continue;
    if (e.scope === "group" && e.groupId) {
      groupMap.set(e.groupId, (groupMap.get(e.groupId) || 0) + 1);
    }
    if (e.userId && e.userId !== "unknown" && e.userId !== "bot") {
      userMap.set(e.userId, (userMap.get(e.userId) || 0) + 1);
      if (e.userName) nick[e.userId] = e.userName;
    }
  }
  return { groupMap, userMap, nick };
}
function qqAppAvatarUrl$1(appId, openId, size = 100) {
  const a = String(appId || "").trim();
  const id = String(openId || "").trim();
  if (!a || !id) return "";
  return `https://q.qlogo.cn/qqapp/${a}/${id}/${size}`;
}
function toUserRankRows(ctx, userMap, nick, appId) {
  return [...userMap.entries()].map(([id, count]) => {
    const name = 取缓存昵称(ctx, id) || nick[id] || "";
    return { id, name, avatar: qqAppAvatarUrl$1(appId, id, 100), count };
  }).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}
function toGroupRankRows(groupMap, appId) {
  return [...groupMap.entries()].map(([id, count]) => ({
    id,
    name: "",
    avatar: qqAppAvatarUrl$1(appId, id, 100),
    count
  })).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}
function buildDashboard(ctx, ymd = todayYmd$1()) {
  const entries = loadDayEntries(ctx, ymd, "all");
  const bot = resolveBotMeta(ctx);
  const root = resolveGfLogRoot(ctx);
  const nickCache = loadNicknameCache(root);
  const hourly = Array.from({ length: 24 }, () => 0);
  const groups = /* @__PURE__ */ new Set();
  const users = /* @__PURE__ */ new Set();
  let groupMessages = 0;
  let privateMessages = 0;
  for (const e of entries) {
    if (e.direction === "out" || e.eventType === "BOT_MESSAGE_CREATE") continue;
    const d = new Date(e.time || e.ts);
    if (!Number.isNaN(d.getTime())) {
      hourly[d.getHours()] += 1;
    }
    if (e.scope === "group") {
      groupMessages += 1;
      if (e.groupId) groups.add(e.groupId);
    } else {
      privateMessages += 1;
    }
    if (e.userId && e.userId !== "unknown" && e.userId !== "bot") {
      users.add(e.userId);
      if (e.userName) nickCache[e.userId] = e.userName;
    }
  }
  const { groupMap, userMap, nick } = aggregateUsageMaps(entries);
  Object.assign(nickCache, nick);
  const groupTop = toGroupRankRows(groupMap, bot.appId).slice(0, 5);
  const userTop = toUserRankRows(ctx, userMap, nickCache, bot.appId).slice(0, 5);
  return {
    date: ymd,
    bot,
    groupMessages,
    privateMessages,
    groupCount: groups.size,
    userCount: users.size,
    hourly,
    groupTop,
    userTop
  };
}
function buildRankings(ctx, ymd = todayYmd$1()) {
  const entries = loadDayEntries(ctx, ymd, "all");
  const bot = resolveBotMeta(ctx);
  const root = resolveGfLogRoot(ctx);
  const nickCache = loadNicknameCache(root);
  const { groupMap, userMap, nick } = aggregateUsageMaps(entries);
  Object.assign(nickCache, nick);
  return {
    date: ymd,
    groups: toGroupRankRows(groupMap, bot.appId),
    users: toUserRankRows(ctx, userMap, nickCache, bot.appId)
  };
}
function resolvePluginDataFile$1(ctx, rel) {
  const pluginDir = String(ctx.pluginPath || "").trim();
  return path.resolve(pluginDir, "data", rel);
}
function resolveUserDataFile$1(ctx, rel) {
  const dataDir = String(ctx.dataPath || "").trim();
  if (!dataDir) return resolvePluginDataFile$1(ctx, rel);
  return path.resolve(dataDir, rel);
}
function readJsonFile$1(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}
function writeJsonFile$1(filePath, data) {
  ensureParent$1(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}
`, "utf-8");
}
function pinFile(ctx) {
  return resolveUserDataFile$1(ctx, "chat-pins.json");
}
function chatKey(scope, id) {
  return `${scope}:${String(id || "").trim()}`;
}
function readChatPins(ctx) {
  const raw = readJsonFile$1(pinFile(ctx), { pins: [] });
  return Array.isArray(raw.pins) ? raw.pins.map(String).filter(Boolean) : [];
}
function writeChatPins(ctx, pins) {
  const next = [...new Set(pins.map(String).filter(Boolean))];
  writeJsonFile$1(pinFile(ctx), { pins: next });
  return next;
}
function toggleChatPin(ctx, key) {
  const k = String(key || "").trim();
  if (!k) return { pins: readChatPins(ctx), pinned: false };
  const pins = readChatPins(ctx);
  const i = pins.indexOf(k);
  if (i >= 0) pins.splice(i, 1);
  else pins.unshift(k);
  const next = writeChatPins(ctx, pins);
  return { pins: next, pinned: next.includes(k) };
}

// ===== 控制台设置：渲染默认开启，消息默认永久保留 =====
const 设置版本号 = 2;
const 默认设置 = { Markdown渲染: true, 按钮可点击: true, 保留天数: 0, 设置版本: 设置版本号 };

function 设置文件路径(ctx) {
  return resolveUserDataFile$1(ctx, "settings.json");
}
function 读设置(ctx) {
  const raw = readJsonFile$1(设置文件路径(ctx), null);
  const 原始版本 = Number(raw && typeof raw === "object" ? raw.设置版本 : 0) || 0;
  const out = { ...默认设置 };
  if (raw && typeof raw === "object") {
    if (typeof raw.Markdown渲染 === "boolean") out.Markdown渲染 = raw.Markdown渲染;
    if (typeof raw.按钮可点击 === "boolean") out.按钮可点击 = raw.按钮可点击;
    const 天数 = Number(raw.保留天数);
    if (Number.isFinite(天数) && 天数 >= 0) out.保留天数 = Math.min(3650, Math.floor(天数));
  }
  // 1.x 的默认值是两个开关全关，升级上来的人会以为「还是显示原文」，这里一次性打开
  if (原始版本 < 设置版本号) {
    out.Markdown渲染 = true;
    out.按钮可点击 = true;
    out.设置版本 = 设置版本号;
    try {
      writeJsonFile$1(设置文件路径(ctx), out);
    } catch {
      // 只读环境不致命，内存里生效即可
    }
  }
  return out;
}
function 写设置(ctx, patch) {
  const next = 读设置(ctx);
  if (patch && typeof patch === "object") {
    if (typeof patch.Markdown渲染 === "boolean") next.Markdown渲染 = patch.Markdown渲染;
    if (typeof patch.按钮可点击 === "boolean") next.按钮可点击 = patch.按钮可点击;
    if (patch.保留天数 !== void 0) {
      const 天数 = Number(patch.保留天数);
      if (!Number.isFinite(天数) || 天数 < 0) throw new Error("保留天数需为不小于 0 的整数");
      next.保留天数 = Math.min(3650, Math.floor(天数));
    }
  }
  next.设置版本 = 设置版本号;
  writeJsonFile$1(设置文件路径(ctx), next);
  return next;
}
function resolveAppId$1(ctx) {
  const root = String(ctx.frameworkEnv?.projectRoot || "").trim();
  if (!root) return "";
  const connId = String(ctx.connectionId || ctx.frameworkEnv?.connectionId || "").trim();
  try {
    const raw = JSON.parse(
      fs.readFileSync(path.join(root, "data", "connections.json"), "utf8")
    );
    const list = Array.isArray(raw.connections) ? raw.connections : [];
    const picked = (connId ? list.find((c) => c.id === connId) : void 0) || list.find((c) => (c.type ?? "") === "qq_official" && c.enable !== false) || list.find((c) => (c.type ?? "") === "qq_official");
    return String(picked?.appId || "").trim();
  } catch {
    return "";
  }
}
function sessionPeer(e) {
  if (e.scope === "group") {
    const id2 = String(e.groupId || "").trim();
    if (!id2) return null;
    return { scope: "group", id: id2 };
  }
  const id = String(e.userId || "").trim();
  if (!id || id === "unknown") return null;
  return { scope: "private", id };
}
function previewContent(s) {
  let t = 规范化展示内容(String(s || ""));
  const hasImg = /!\[[^\]]*\]\(https?:\/\/[^)\s]+\)/i.test(t);
  t = t.replace(/!\[[^\]]*\]\(https?:\/\/[^)\s]+\)/gi, "[图片]").replace(/\s+/g, " ").trim();
  if (!t && hasImg) t = "[图片]";
  if (t.length <= 48) return t;
  return `${t.slice(0, 48)}…`;
}
function resolveBotProfile(ctx) {
  const appId = resolveAppId$1(ctx);
  const root = String(ctx.frameworkEnv?.projectRoot || "").trim();
  const empty = { name: "Bot", avatar: "", appId };
  if (!root) return empty;
  const connId = String(ctx.connectionId || ctx.frameworkEnv?.connectionId || "").trim();
  try {
    const raw = JSON.parse(
      fs.readFileSync(path.join(root, "data", "connections.json"), "utf8")
    );
    const list = Array.isArray(raw.connections) ? raw.connections : [];
    const picked = (connId ? list.find((c) => c.id === connId) : void 0) || list.find((c) => (c.type ?? "") === "qq_official" && c.enable !== false) || list.find((c) => (c.type ?? "") === "qq_official");
    if (!picked) return empty;
    const botProfile = picked.botProfile;
    return {
      name: String(botProfile?.username || picked.name || "Bot"),
      avatar: String(botProfile?.avatar || ""),
      appId: String(picked.appId || appId)
    };
  } catch {
    return empty;
  }
}
function isOutbound(e) {
  return e.direction === "out" || e.eventType === "BOT_MESSAGE_CREATE";
}
function listChatSessions(ctx, opts) {
  const days = Math.min(90, Math.max(1, Number(opts?.days) || 30));
  const dates = listLogDates(ctx).slice(0, days);
  if (!dates.length) dates.push(todayYmd$1());
  const appId = resolveAppId$1(ctx);
  const pins = new Set(readChatPins(ctx));
  const map = /* @__PURE__ */ new Map();
  for (const ymd of dates) {
    const entries = loadDayEntries(ctx, ymd, "all");
    for (const e of entries) {
      const peer = sessionPeer(e);
      if (!peer) continue;
      const key = chatKey(peer.scope, peer.id);
      const cur = map.get(key);
      if (!cur) {
        map.set(key, {
          scope: peer.scope,
          id: peer.id,
          last: e,
          count: 1,
          titleHint: peer.scope === "private" ? e.userName || "" : ""
        });
      } else {
        cur.count += 1;
        if ((e.time || 0) >= (cur.last.time || 0)) cur.last = e;
        if (peer.scope === "private" && e.userName) cur.titleHint = e.userName;
      }
    }
  }
  const q = String(opts?.q || "").trim().toLowerCase();
  let sessions = [...map.entries()].map(([key, v]) => {
    const title = v.scope === "private" ? 取缓存昵称(ctx, v.id) || v.titleHint || v.id : v.id;
    return {
      key,
      scope: v.scope,
      id: v.id,
      title,
      avatar: qqAppAvatarUrl$1(appId, v.id, 100),
      lastContent: previewContent(v.last.content),
      lastTime: Number(v.last.time) || 0,
      lastTs: String(v.last.ts || ""),
      msgCount: v.count,
      pinned: pins.has(key)
    };
  });
  if (q) {
    sessions = sessions.filter(
      (s) => `${s.title}
${s.id}
${s.lastContent}
${s.scope}`.toLowerCase().includes(q)
    );
  }
  sessions.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (b.lastTime || 0) - (a.lastTime || 0);
  });
  return { sessions, botAppId: appId };
}
function listChatMessages(ctx, scope, id, opts) {
  const peerId = String(id || "").trim();
  const days = Math.min(90, Math.max(1, Number(opts?.days) || 30));
  const dates = listLogDates(ctx).slice(0, days);
  if (!dates.length) dates.push(todayYmd$1());
  const appId = resolveAppId$1(ctx);
  const bot = resolveBotProfile(ctx);
  const pins = new Set(readChatPins(ctx));
  const all = [];
  for (const ymd of dates) {
    for (const e of loadDayEntries(ctx, ymd, scope)) {
      const peer2 = sessionPeer(e);
      if (!peer2 || peer2.scope !== scope || peer2.id !== peerId) continue;
      all.push(e);
    }
  }
  all.sort((a, b) => (a.time || 0) - (b.time || 0));
  const total = all.length;
  const offset = Math.max(0, Number(opts?.offset) || 0);
  const limit = Math.min(300, Math.max(1, Number(opts?.limit) || 80));
  const start = Math.max(0, total - offset - limit);
  const end = Math.max(0, total - offset);
  const slice = all.slice(start, end);
  const list = slice.map((e) => {
    const out = isOutbound(e);
    return {
      ts: e.ts,
      time: e.time,
      scope: e.scope,
      userId: e.userId,
      userName: out ? bot.name || e.userName || "Bot" : e.userName || 取缓存昵称(ctx, e.userId) || e.userId,
      userAvatar: out ? bot.avatar || "" : qqAppAvatarUrl$1(appId, e.userId === "bot" ? "" : e.userId, 100),
      groupId: e.groupId,
      content: 规范化展示内容(e.content),
      eventType: e.eventType,
      msgId: e.msgId,
      keyboard: e.keyboard || null,
      direction: out ? "out" : "in"
    };
  });
  const last = all[all.length - 1];
  const peer = peerId ? {
    key: chatKey(scope, peerId),
    scope,
    id: peerId,
    title: scope === "private" ? 取缓存昵称(ctx, peerId) || (last && !isOutbound(last) ? last.userName : "") || peerId : peerId,
    avatar: qqAppAvatarUrl$1(appId, peerId, 100),
    lastContent: previewContent(last?.content || ""),
    lastTime: Number(last?.time) || 0,
    lastTs: String(last?.ts || ""),
    msgCount: total,
    pinned: pins.has(chatKey(scope, peerId))
  } : null;
  return { total, list, peer };
}

// ============================================================================
// 控制台登录：密码（scrypt 加盐）/ 会话令牌 / IP 连错锁定
// 密码保存在插件配置目录的 auth.json（只存哈希，不存明文）
// ============================================================================
const 初始密码 = "12345678";
const 最多连续失败 = 3;
const 锁定时长 = 24 * 60 * 60 * 1000;
const 会话时长 = 7 * 24 * 60 * 60 * 1000;
const 失败计数静默期 = 30 * 60 * 1000;

function 认证文件(ctx) {
  return resolveUserDataFile$1(ctx, "auth.json");
}
function 会话文件(ctx) {
  return resolveUserDataFile$1(ctx, "auth-sessions.json");
}
function 锁定文件(ctx) {
  return resolveUserDataFile$1(ctx, "auth-locks.json");
}
function 安全日志文件(ctx) {
  return resolveUserDataFile$1(ctx, "auth-security.log");
}
function 生成盐() {
  return crypto.randomBytes(16).toString("hex");
}
function 算哈希(密码, 盐) {
  return crypto.scryptSync(String(密码 ?? ""), String(盐 ?? ""), 64).toString("hex");
}
/** 读密码记录；第一次调用会写入初始密码的哈希 */
function 读认证(ctx) {
  const raw = readJsonFile$1(认证文件(ctx), null);
  if (raw && typeof raw.hash === "string" && raw.hash && typeof raw.salt === "string" && raw.salt) {
    return {
      hash: raw.hash,
      salt: raw.salt,
      已改密码: raw.已改密码 === true,
      updatedAt: Number(raw.updatedAt) || 0
    };
  }
  const salt = 生成盐();
  const rec = { hash: 算哈希(初始密码, salt), salt, 已改密码: false, updatedAt: Date.now() };
  try {
    writeJsonFile$1(认证文件(ctx), rec);
  } catch (e) {
    ctx.logger?.warn?.("[kzt] 写入初始密码失败:", e);
  }
  return { hash: rec.hash, salt: rec.salt, 已改密码: false, updatedAt: rec.updatedAt };
}
function 校验密码(ctx, 输入) {
  const rec = 读认证(ctx);
  const 输入哈希 = Buffer.from(算哈希(输入, rec.salt), "hex");
  const 正确 = Buffer.from(rec.hash, "hex");
  if (输入哈希.length !== 正确.length) return false;
  return crypto.timingSafeEqual(输入哈希, 正确);
}
/** 新密码规则：大写 + 小写 + 数字 + 特殊符号，且不能用初始密码 */
function 密码强度问题(密码) {
  const p = String(密码 ?? "");
  const 问题 = [];
  if (p.length < 8) 问题.push("至少 8 位");
  if (p.length > 64) 问题.push("不超过 64 位");
  if (!/[A-Z]/.test(p)) 问题.push("至少 1 个大写字母");
  if (!/[a-z]/.test(p)) 问题.push("至少 1 个小写字母");
  if (!/[0-9]/.test(p)) 问题.push("至少 1 个阿拉伯数字");
  if (!/[^A-Za-z0-9]/.test(p)) 问题.push("至少 1 个特殊符号");
  if (p === 初始密码) 问题.push("不能继续使用初始密码");
  if (/\s/.test(p)) 问题.push("不能包含空格");
  return 问题;
}
function 改密码(ctx, 新密码) {
  const salt = 生成盐();
  const rec = {
    hash: 算哈希(新密码, salt),
    salt,
    已改密码: true,
    updatedAt: Date.now()
  };
  writeJsonFile$1(认证文件(ctx), rec);
  return rec;
}

function 令牌键(token) {
  return crypto.createHash("sha256").update(String(token ?? "")).digest("hex");
}
const 会话缓存 = new Map();
function 会话表(ctx) {
  const file = 会话文件(ctx);
  const cached = 会话缓存.get(file);
  if (cached) return cached;
  const map = new Map();
  const raw = readJsonFile$1(file, { sessions: [] });
  const list = Array.isArray(raw?.sessions) ? raw.sessions : [];
  const now = Date.now();
  for (const item of list) {
    const key = String(item?.key || "").trim();
    const exp = Number(item?.exp) || 0;
    if (key && exp > now) map.set(key, { ip: String(item.ip || ""), exp });
  }
  会话缓存.set(file, map);
  return map;
}
function 保存会话(ctx) {
  const map = 会话表(ctx);
  const sessions = [...map.entries()].map(([key, v]) => ({ key, ip: v.ip, exp: v.exp }));
  writeJsonFile$1(会话文件(ctx), { sessions });
}
function 建会话(ctx, ip) {
  const token = crypto.randomBytes(24).toString("hex");
  const map = 会话表(ctx);
  const now = Date.now();
  for (const [key, v] of map) {
    if (!(v.exp > now)) map.delete(key);
  }
  map.set(令牌键(token), { ip: String(ip || ""), exp: now + 会话时长 });
  try {
    保存会话(ctx);
  } catch (e) {
    ctx.logger?.warn?.("[kzt] 保存会话失败:", e);
  }
  return token;
}
function 取请求令牌(req) {
  const header = String(req?.headers?.["x-kzt-token"] || "").trim();
  if (header) return header;
  const query = String(req?.query?.token || "").trim();
  return query;
}
function 验令牌(ctx, req) {
  const token = 取请求令牌(req);
  if (!token) return false;
  const map = 会话表(ctx);
  const rec = map.get(令牌键(token));
  if (!rec) return false;
  if (!(rec.exp > Date.now())) {
    map.delete(令牌键(token));
    return false;
  }
  return true;
}
function 清会话(ctx, req) {
  const token = 取请求令牌(req);
  if (!token) return;
  const map = 会话表(ctx);
  if (map.delete(令牌键(token))) {
    try {
      保存会话(ctx);
    } catch {
      // ignore
    }
  }
}

/** 请求来源 IP；本机反代（socket 是回环）时信任 X-Forwarded-For 首个地址 */
function 请求IP(req) {
  const raw = String(req?.ip || req?.socket?.remoteAddress || req?.connection?.remoteAddress || "").trim();
  const 直连 = raw.replace(/^::ffff:/i, "");
  const 回环 = !直连 || 直连 === "127.0.0.1" || 直连 === "::1";
  if (回环) {
    const xff = String(req?.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
    if (xff) return xff.replace(/^::ffff:/i, "");
  }
  if (直连 === "::1" || !直连) return "127.0.0.1";
  return 直连;
}
function 读锁定(ctx) {
  const raw = readJsonFile$1(锁定文件(ctx), { ips: {} });
  const ips = raw && typeof raw.ips === "object" && raw.ips ? raw.ips : {};
  const now = Date.now();
  let 变更 = false;
  for (const [ip, rec] of Object.entries(ips)) {
    const 锁到 = Number(rec?.lockedUntil) || 0;
    const 最后 = Number(rec?.lastFailAt) || 0;
    if (!(锁到 > now) && 最后 && now - 最后 > 失败计数静默期 && (Number(rec?.failures) || 0) > 0) {
      delete ips[ip];
      变更 = true;
    }
  }
  return { ips, 变更 };
}
function 写锁定(ctx, state) {
  writeJsonFile$1(锁定文件(ctx), { ips: (state && state.ips) || {} });
}
function 记安全日志(ctx, 说明) {
  const line = `[${new Date().toISOString()}] ${说明}`;
  ctx.logger?.warn?.(`[kzt] ${说明}`);
  try {
    const file = 安全日志文件(ctx);
    ensureParent$1(file);
    fs.appendFileSync(file, `${line}\n`, "utf8");
  } catch {
    // ignore
  }
}
function 记失败(ctx, ip) {
  const state = 读锁定(ctx);
  const rec = state.ips[ip] || { failures: 0, lastFailAt: 0, lockedUntil: 0 };
  const now = Date.now();
  if (Number(rec.lockedUntil) > now) {
    return { locked: true, failures: Number(rec.failures) || 0, lockedUntil: Number(rec.lockedUntil) };
  }
  if (rec.lockedUntil && !(Number(rec.lockedUntil) > now)) {
    // 上次的锁已到期，重新计数
    rec.failures = 0;
    rec.lockedUntil = 0;
  }
  rec.failures = (Number(rec.failures) || 0) + 1;
  rec.lastFailAt = now;
  let locked = false;
  if (rec.failures >= 最多连续失败) {
    rec.lockedUntil = now + 锁定时长;
    locked = true;
  }
  state.ips[ip] = rec;
  try {
    写锁定(ctx, state);
  } catch {
    // ignore
  }
  if (locked) {
    记安全日志(ctx, `登录失败：IP ${ip} 连续 ${rec.failures} 次密码错误，已锁定 24 小时`);
  } else {
    记安全日志(ctx, `登录失败：IP ${ip} 密码错误（第 ${rec.failures}/${最多连续失败} 次）`);
  }
  return { locked, failures: rec.failures, lockedUntil: rec.lockedUntil };
}
function 解除锁定(ctx, ip) {
  const state = 读锁定(ctx);
  const key = String(ip || "").trim();
  if (key && state.ips[key]) {
    delete state.ips[key];
    写锁定(ctx, state);
    记安全日志(ctx, `已手动解除 IP ${key} 的登录锁定`);
    return true;
  }
  if (key === "*") {
    const 数量 = Object.keys(state.ips).length;
    state.ips = {};
    写锁定(ctx, state);
    if (数量) 记安全日志(ctx, `已手动解除全部 ${数量} 个 IP 的登录锁定`);
    return 数量 > 0;
  }
  return false;
}
function 锁定列表(ctx) {
  const state = 读锁定(ctx);
  const now = Date.now();
  return Object.entries(state.ips)
    .map(([ip, rec]) => ({
      ip,
      失败次数: Number(rec?.failures) || 0,
      最后尝试: Number(rec?.lastFailAt) || 0,
      锁定至: Number(rec?.lockedUntil) || 0,
      剩余毫秒: Math.max(0, (Number(rec?.lockedUntil) || 0) - now)
    }))
    .filter((x) => x.剩余毫秒 > 0 || x.失败次数 > 0)
    .sort((a, b) => b.锁定至 - a.锁定至);
}
const 认证错误 = (res, message, extra) => {
  res.status(extra?.status || 401).json({ code: 401, message, needLogin: true, ...extra });
};

/** 给整组路由套上登录校验：只包 get/post，其余（static/page）原样透传 */
function 加登录校验(ctx, router) {
  const wrap = (handler) => (req, res) => {
    if (!验令牌(ctx, req)) {
      认证错误(res, "未登录或登录已过期");
      return;
    }
    return handler(req, res);
  };
  return new Proxy(router, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target);
      if (prop === "get" || prop === "post" || prop === "put" || prop === "delete") {
        return (p, handler) => value.call(target, p, wrap(handler));
      }
      if (typeof value === "function") return value.bind(target);
      return value;
    }
  });
}

// ============================================================================
// 消息日志保留：默认永久，可设天数，写日志时按小时节流清理
// ============================================================================
let 上次清理时刻 = 0;
function 日志存储概览(ctx) {
  const root = resolveGfLogRoot(ctx);
  let 文件数 = 0;
  let 字节 = 0;
  let 最早 = "";
  let 最晚 = "";
  for (const scope of ["group", "private"]) {
    let names = [];
    try {
      names = fs.readdirSync(path.join(root, scope));
    } catch {
      continue;
    }
    for (const name of names) {
      const m = /^(\d{4}-\d{2}-\d{2})\.jsonl$/.exec(name);
      if (!m) continue;
      文件数 += 1;
      if (!最早 || m[1] < 最早) 最早 = m[1];
      if (!最晚 || m[1] > 最晚) 最晚 = m[1];
      try {
        字节 += fs.statSync(path.join(root, scope, name)).size;
      } catch {
        // ignore
      }
    }
  }
  return { 文件数, 字节, 最早, 最晚, 保留天数: Number(读设置(ctx).保留天数) || 0 };
}
/**
 * 按「保留天数」删除过期日志文件；0 = 永久，不删。
 * 保留 N 天 = 今天在内的最近 N 个自然日。
 */
function 清理过期日志(ctx, options = {}) {
  const now = Date.now();
  if (!options.force && now - 上次清理时刻 < 60 * 60 * 1000) {
    return { deleted: 0, skipped: true };
  }
  const 天数 = Number(读设置(ctx).保留天数) || 0;
  if (!天数) return { deleted: 0, days: 0, skipped: true };
  上次清理时刻 = now;
  const 截止 = /* @__PURE__ */ new Date();
  截止.setHours(0, 0, 0, 0);
  截止.setDate(截止.getDate() - (天数 - 1));
  const root = resolveGfLogRoot(ctx);
  let deleted = 0;
  for (const scope of ["group", "private"]) {
    const dir = path.join(root, scope);
    let names = [];
    try {
      names = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      const m = /^(\d{4})-(\d{2})-(\d{2})\.jsonl$/.exec(name);
      if (!m) continue;
      const day = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      if (!(day.getTime() < 截止.getTime())) continue;
      const file = path.join(dir, name);
      try {
        fs.unlinkSync(file);
        jsonlCache.delete(file);
        deleted += 1;
      } catch {
        // ignore
      }
    }
  }
  if (deleted) ctx.logger?.info?.(`[kzt] 按「保留 ${天数} 天」清理了 ${deleted} 个日志文件`);
  return { deleted, days: 天数 };
}

const ROUTE_PREFIX = "/kzt";
function wrapPath(p) {
  if (!p) return ROUTE_PREFIX;
  return p.startsWith("/") ? `${ROUTE_PREFIX}${p}` : `${ROUTE_PREFIX}/${p}`;
}
function sharpDepsPaths(ctx) {
  return {
    dataDir: String(ctx.dataPath || "").trim(),
    pluginDir: String(ctx.pluginPath || "").trim()
  };
}
function 注册认证路由(ctx, router) {
  /**
   * 注意：不能用 router.getNoAuth / postNoAuth。
   * 宿主的 no-auth 路由挂在 `/plugin/<id>/api/*`，而控制台（含页面自身）走的是
   * `/api/Plugin/ext/<id>/...`，那条链路只用 buildApiRouter()，no-auth 路由在那里是 404。
   * 登录接口只需「不校验本插件的令牌」，宿主的登录校验本来就已经在链路上，所以直接注册普通路由。
   */
  const 注册 = (method, p, handler) => {
    router[method].call(router, p, handler);
  };

  // 登录状态：未登录也能查，用来决定前端显示登录页还是主界面
  注册("get", wrapPath("/auth/status"), (req, res) => {
    try {
      const ip = 请求IP(req);
      const rec = 读认证(ctx);
      const state = 读锁定(ctx);
      const lock = state.ips[ip] || {};
      const 锁定至 = Number(lock.lockedUntil) || 0;
      const 剩余 = Math.max(0, 锁定至 - Date.now());
      res.json({
        code: 0,
        data: {
          已登录: 验令牌(ctx, req),
          默认密码: !rec.已改密码,
          // 只在仍是初始密码时把它带出来，改过之后就永远不再下发了
          初始密码: rec.已改密码 ? "" : 初始密码,
          可尝试次数: Math.max(0, 最多连续失败 - (Number(lock.failures) || 0)),
          锁定剩余毫秒: 剩余,
          ip,
          密码规则: ["至少 8 位", "包含大写字母", "包含小写字母", "包含阿拉伯数字", "包含特殊符号"]
        }
      });
    } catch (e) {
      ctx.logger?.error?.("[kzt] auth/status 失败:", e);
      res.status(500).json({ code: -1, message: "状态查询失败" });
    }
  });

  注册("post", wrapPath("/auth/login"), (req, res) => {
    try {
      const ip = 请求IP(req);
      const state = 读锁定(ctx);
      const lock = state.ips[ip] || {};
      const 锁定至 = Number(lock.lockedUntil) || 0;
      if (锁定至 > Date.now()) {
        const 分钟 = Math.ceil((锁定至 - Date.now()) / 60000);
        res.status(429).json({
          code: -1,
          message: `密码连续错误次数过多，当前 IP 已锁定，请 ${分钟} 分钟后再试（可在插件配置里手动解除）`,
          锁定剩余毫秒: 锁定至 - Date.now()
        });
        return;
      }
      const 密码 = String(req.body?.password ?? "");
      if (!密码) {
        res.status(400).json({ code: -1, message: "请输入密码" });
        return;
      }
      if (校验密码(ctx, 密码)) {
        if (state.ips[ip]) {
          delete state.ips[ip];
          写锁定(ctx, state);
        }
        const token = 建会话(ctx, ip);
        const rec = 读认证(ctx);
        记安全日志(ctx, `登录成功：IP ${ip}`);
        res.json({ code: 0, data: { token, 默认密码: !rec.已改密码 }, message: "登录成功" });
        return;
      }
      const 结果 = 记失败(ctx, ip);
      if (结果.locked) {
        res.status(429).json({
          code: -1,
          message: `连续 ${结果.failures} 次密码错误，该 IP 已锁定 24 小时（可在插件配置里手动解除）`,
          锁定剩余毫秒: Math.max(0, 结果.lockedUntil - Date.now())
        });
        return;
      }
      res.status(401).json({
        code: -1,
        message: `密码错误，还可尝试 ${Math.max(0, 最多连续失败 - 结果.failures)} 次`
      });
    } catch (e) {
      ctx.logger?.error?.("[kzt] auth/login 失败:", e);
      res.status(500).json({ code: -1, message: "登录失败" });
    }
  });

  注册("post", wrapPath("/auth/logout"), (req, res) => {
    try {
      清会话(ctx, req);
      res.json({ code: 0, data: { ok: true }, message: "已退出登录" });
    } catch (e) {
      ctx.logger?.error?.("[kzt] auth/logout 失败:", e);
      res.status(500).json({ code: -1, message: "退出失败" });
    }
  });

  注册("post", wrapPath("/auth/password"), (req, res) => {
    try {
      if (!验令牌(ctx, req)) {
        认证错误(res, "未登录或登录已过期");
        return;
      }
      const 旧密码 = String(req.body?.oldPassword ?? "");
      const 新密码 = String(req.body?.newPassword ?? "");
      if (!校验密码(ctx, 旧密码)) {
        记安全日志(ctx, `修改密码被拒：IP ${请求IP(req)} 当前密码不正确`);
        res.status(400).json({ code: -1, message: "当前密码不正确" });
        return;
      }
      const 问题 = 密码强度问题(新密码);
      if (问题.length) {
        res.status(400).json({ code: -1, message: `新密码不满足要求：${问题.join("、")}` });
        return;
      }
      改密码(ctx, 新密码);
      // 改密后作废所有会话，当前这次重新签发
      const map = 会话表(ctx);
      map.clear();
      const token = 建会话(ctx, 请求IP(req));
      记安全日志(ctx, `密码已修改：IP ${请求IP(req)}，其余会话已失效`);
      res.json({ code: 0, data: { token, 默认密码: false }, message: "密码已修改，其他设备需重新登录" });
    } catch (e) {
      ctx.logger?.error?.("[kzt] auth/password 失败:", e);
      res.status(500).json({ code: -1, message: "修改密码失败" });
    }
  });

  注册("get", wrapPath("/auth/locks"), (req, res) => {
    try {
      if (!验令牌(ctx, req)) {
        认证错误(res, "未登录或登录已过期");
        return;
      }
      res.json({ code: 0, data: { list: 锁定列表(ctx), 上限: 最多连续失败, 锁定时长毫秒: 锁定时长 } });
    } catch (e) {
      ctx.logger?.error?.("[kzt] auth/locks 失败:", e);
      res.status(500).json({ code: -1, message: "读取锁定列表失败" });
    }
  });

  注册("post", wrapPath("/auth/unlock"), (req, res) => {
    try {
      if (!验令牌(ctx, req)) {
        认证错误(res, "未登录或登录已过期");
        return;
      }
      const ip = String(req.body?.ip || "").trim();
      if (!ip) {
        res.status(400).json({ code: -1, message: "缺少 ip（可传 * 解除全部）" });
        return;
      }
      const ok2 = 解除锁定(ctx, ip);
      res.json({ code: 0, data: { list: 锁定列表(ctx), changed: ok2 }, message: ok2 ? "已解除" : "该 IP 没有锁定记录" });
    } catch (e) {
      ctx.logger?.error?.("[kzt] auth/unlock 失败:", e);
      res.status(500).json({ code: -1, message: "解除锁定失败" });
    }
  });
}

function registerGfWebui(ctx) {
  const router = ctx.router;
  if (!router?.get || !router?.post) {
    ctx.logger?.warn?.("[kzt] 当前主机未提供 router，跳过后台注册");
    return;
  }
  configureSharpRuntimePaths(sharpDepsPaths(ctx));
  注册认证路由(ctx, router);
  // 其余全部路由都要求登录（宿主自身的登录是另一层，这里不依赖）
  const base = 加登录校验(ctx, router);
  if (base.static) {
    base.static(wrapPath("/static"), "webui");
  }
  base.get(wrapPath("/dashboard"), (_req, res) => {
    try {
      const date = String(_req.query?.date || todayYmd$1()).trim() || todayYmd$1();
      const stats = buildDashboard(ctx, date);
      res.json({ code: 0, data: stats });
    } catch (e) {
      ctx.logger?.error?.("[kzt] dashboard 失败:", e);
      res.status(500).json({ code: -1, message: "仪表盘统计失败" });
    }
  });
  base.get(wrapPath("/settings"), (_req, res) => {
    try {
      res.json({ code: 0, data: 读设置(ctx) });
    } catch (e) {
      ctx.logger?.error?.("[kzt] 读取设置失败:", e);
      res.status(500).json({ code: -1, message: "读取设置失败" });
    }
  });
  base.post(wrapPath("/settings"), (req, res) => {
    try {
      const saved = 写设置(ctx, req.body || {});
      // 收紧保留天数时立即生效，不必等下一次写日志
      if (Number(saved.保留天数) > 0) 清理过期日志(ctx, { force: true });
      res.json({ code: 0, data: saved, message: "已保存" });
    } catch (e) {
      ctx.logger?.error?.("[kzt] 保存设置失败:", e);
      const msg = e instanceof Error ? e.message : String(e);
      res.status(/保留天数/.test(msg) ? 400 : 500).json({ code: -1, message: msg || "保存设置失败" });
    }
  });
  base.get(wrapPath("/storage"), (_req, res) => {
    try {
      res.json({ code: 0, data: 日志存储概览(ctx) });
    } catch (e) {
      ctx.logger?.error?.("[kzt] storage 失败:", e);
      res.status(500).json({ code: -1, message: "存储统计失败" });
    }
  });
  base.post(wrapPath("/storage/clean"), (_req, res) => {
    try {
      const result = 清理过期日志(ctx, { force: true });
      res.json({
        code: 0,
        data: { ...result, ...日志存储概览(ctx) },
        message: result.days ? `已清理 ${result.deleted} 个过期文件` : "当前为永久保留，未删除任何文件"
      });
    } catch (e) {
      ctx.logger?.error?.("[kzt] storage/clean 失败:", e);
      res.status(500).json({ code: -1, message: "清理失败" });
    }
  });
  base.get(wrapPath("/rankings"), (_req, res) => {
    try {
      const date = String(_req.query?.date || todayYmd$1()).trim() || todayYmd$1();
      const data = buildRankings(ctx, date);
      res.json({ code: 0, data });
    } catch (e) {
      ctx.logger?.error?.("[kzt] rankings 失败:", e);
      res.status(500).json({ code: -1, message: "排行统计失败" });
    }
  });
  base.get(wrapPath("/chats"), (req, res) => {
    try {
      const data = listChatSessions(ctx, {
        days: Number(req.query?.days) || 30,
        q: String(req.query?.q || "").trim() || void 0
      });
      res.json({ code: 0, data });
    } catch (e) {
      ctx.logger?.error?.("[kzt] chats 失败:", e);
      res.status(500).json({ code: -1, message: "会话列表失败" });
    }
  });
  base.get(wrapPath("/chats/messages"), (req, res) => {
    try {
      const scopeRaw = String(req.query?.scope || "").trim();
      const scope = scopeRaw === "group" || scopeRaw === "private" ? scopeRaw : "";
      const id = String(req.query?.id || "").trim();
      if (!scope || !id) {
        res.status(400).json({ code: -1, message: "缺少 scope / id" });
        return;
      }
      const data = listChatMessages(ctx, scope, id, {
        days: Number(req.query?.days) || 30,
        limit: Number(req.query?.limit) || 100,
        offset: Number(req.query?.offset) || 0
      });
      res.json({ code: 0, data });
    } catch (e) {
      ctx.logger?.error?.("[kzt] chats/messages 失败:", e);
      res.status(500).json({ code: -1, message: "会话消息失败" });
    }
  });
  base.post(wrapPath("/chats/pin"), (req, res) => {
    try {
      const body = req.body || {};
      let key = String(body.key || "").trim();
      if (!key && body.scope && body.id) {
        const scope = body.scope === "group" ? "group" : body.scope === "private" ? "private" : "";
        if (scope) key = chatKey(scope, String(body.id));
      }
      if (!key) {
        res.status(400).json({ code: -1, message: "缺少 key" });
        return;
      }
      const data = toggleChatPin(ctx, key);
      res.json({ code: 0, data });
    } catch (e) {
      ctx.logger?.error?.("[kzt] chats/pin 失败:", e);
      res.status(500).json({ code: -1, message: "置顶失败" });
    }
  });
  base.post(wrapPath("/chats/send"), async (req, res) => {
    const body = req.body || {};
    const asMd = String(body.format || "").trim().toLowerCase() === "md";
    try {
      const scopeRaw = String(body.scope || "").trim();
      const id = String(body.id || "").trim();
      const content = String(body.content || "").trim();
      if (!id || !content) {
        res.status(400).json({ code: -1, message: "缺少 id / content" });
        return;
      }
      if (scopeRaw !== "group" && scopeRaw !== "private") {
        res.status(400).json({ code: -1, message: "scope 须为 group / private" });
        return;
      }
      const target = scopeRaw === "group" ? { scope: "group", group_openid: id } : { scope: "c2c", user_openid: id };
      const keyboard = 规范化键盘(body.keyboard);
      const useMd = asMd || !!keyboard;
      const result = await 发消息(ctx, target, [useMd ? 段_md(content) : 段_文本(content)], { keyboard });
      res.json({ code: 0, data: { ok: true, result, format: useMd ? "md" : "text", keyboard: !!keyboard }, message: useMd ? "已发送（Markdown）" : "已发送" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      ctx.logger?.error?.("[kzt] chats/send 失败:", e);
      res.status(500).json({ code: -1, message: (asMd ? "Markdown 发送失败：" : "") + (msg || "发送失败") });
    }
  });
  base.post(wrapPath("/chats/send-media"), async (req, res) => {
    const body = req.body || {};
    const kind = String(body.kind || "image").trim().toLowerCase();
    const label = kind === "file" ? "文件" : "图片";
    try {
      const scopeRaw = String(body.scope || "").trim();
      const id = String(body.id || "").trim();
      const url = String(body.url || "").trim();
      const fileData = String(body.dataBase64 || "").trim().replace(/^data:[^;]*;base64,/i, "");
      const fileName = String(body.name || "").trim();
      const caption = String(body.caption || "").trim();

      if (!id) {
        res.status(400).json({ code: -1, message: "缺少 id" });
        return;
      }
      if (scopeRaw !== "group" && scopeRaw !== "private") {
        res.status(400).json({ code: -1, message: "scope 须为 group / private" });
        return;
      }
      if (!url && !fileData) {
        res.status(400).json({ code: -1, message: "缺少文件内容（url / dataBase64）" });
        return;
      }
      const fileType = MEDIA_FILE_TYPES[kind];
      if (!fileType) {
        res.status(400).json({ code: -1, message: "kind 须为 image / file" });
        return;
      }
      if (fileData && (fileData.length * 3) / 4 > MEDIA_MAX_BYTES) {
        res.status(400).json({ code: -1, message: `${label}超过 ${MEDIA_MAX_BYTES / 1048576}MB，无法通过控制台上传` });
        return;
      }

      const target = scopeRaw === "group" ? { scope: "group", group_openid: id } : { scope: "c2c", user_openid: id };
      const result = await 发送富媒体(ctx, target, { fileType, url, fileData, fileName, caption });
      res.json({ code: 0, data: { ok: true, kind, result }, message: `${label}已发送` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      ctx.logger?.error?.("[kzt] chats/send-media 失败:", e);
      res.status(500).json({ code: -1, message: `${label}发送失败：${msg || "未知原因"}` });
    }
  });
  base.post(wrapPath("/chats/recall"), async (req, res) => {
    try {
      const body = req.body || {};
      const scopeRaw = String(body.scope || "").trim();
      const peerId = String(body.id || "").trim();
      const msgId = String(body.msgId || "").trim();
      if (!peerId || !msgId) {
        res.status(400).json({ code: -1, message: "缺少 id / msgId" });
        return;
      }
      if (scopeRaw !== "group" && scopeRaw !== "private") {
        res.status(400).json({ code: -1, message: "scope 须为 group / private" });
        return;
      }
      const target = scopeRaw === "group" ? { scope: "group", group_openid: peerId } : { scope: "c2c", user_openid: peerId };
      await 撤回消息(ctx, target, msgId);
      markMessageRecalled(ctx, msgId);
      res.json({ code: 0, data: { ok: true, msgId }, message: "已撤回" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      ctx.logger?.error?.("[kzt] chats/recall 失败:", e);
      res.status(500).json({ code: -1, message: msg || "撤回失败" });
    }
  });
  base.get(wrapPath("/sharp-deps/status"), async (_req, res) => {
    try {
      const status = await getSharpDependencyStatus(sharpDepsPaths(ctx));
      res.json({ code: 0, data: status });
    } catch (e) {
      ctx.logger?.error?.("[kzt] Sharp 状态失败:", e);
      res.status(500).json({ code: -1, message: "状态查询失败" });
    }
  });
  base.post(wrapPath("/sharp-deps/install"), async (_req, res) => {
    try {
      const result = await triggerSharpDependencyInstall(sharpDepsPaths(ctx), ctx.logger);
      res.json({ code: 0, data: result, message: result.message });
    } catch (e) {
      ctx.logger?.error?.("[kzt] Sharp 安装触发失败:", e);
      res.status(500).json({ code: -1, message: "安装触发失败" });
    }
  });
  if (base.page) {
    base.page({
      path: "admin",
      title: "kzt 后台",
      module: path.join("webui", "remote.js").replace(/\\/g, "/"),
      kind: "module",
      description: "仪表盘 · 使用排行 · 查看消息（Markdown 渲染 / 可点击按钮）· 登录与安全 · Sharp 依赖（控制台宿主 React 模块）"
    });
  }
  ctx.logger?.info?.("[kzt] 后台已注册（React 模块 webui/remote.js · /kzt API）");
}


// ============================================================================
// 排行口径：只统计「对机器人说的话」（私聊 / 群里 @机器人 / 按钮互动）
// 原版靠一张超长的指令白名单，指令整体移除后改为按「是否指向机器人」判定
// ============================================================================
function 含艾特标记(rawContent) {
  return /<@!?[A-Za-z0-9_]+>/.test(String(rawContent ?? ""));
}
function 判定计入排行(opts) {
  if (opts.scope === "private") return true;
  const et = String(opts.eventType || "");
  if (et === "INTERACTION_CREATE") return true;
  if (et === "GROUP_AT_MESSAGE_CREATE") return true;
  return 含艾特标记(String(opts.rawContent ?? ""));
}

// ============================================================================
// 发送 / 撤回：只服务于网页控制台「查看消息」的发送与撤回
// ============================================================================
function 段_文本(text) {
  return { type: "text", data: String(text ?? "") };
}
function 段_md(content) {
  return { type: "md", data: String(content ?? "") };
}

/** 官方 Markdown 图片语法支持 `![描述 #宽px #高px](url)`，没写尺寸时补一个默认值 */
function 补全Md图片语法(content) {
  return content.replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/gi, (match, alt, url) => {
    if (/#\d+px/i.test(alt)) return match;
    const text = alt.trim() || "img";
    return `![${text}#640px #360px](${url})`;
  });
}

async function BOTAPI(ctx, apiPath, params = {}) {
  if (!ctx.actions) throw new Error("kzt: 插件上下文未就绪");
  try {
    return await ctx.actions.call(apiPath, params, ctx.adapterName);
  } catch (error) {
    ctx.logger?.error?.("BOTAPI 调用失败:", apiPath, error);
    throw error;
  }
}

function 组装发送路径(目标) {
  if (目标.scope === "group") {
    if (!目标.group_openid) throw new Error("缺少 group_openid");
    return `/v2/groups/${目标.group_openid}/messages`;
  }
  if (!目标.user_openid) throw new Error("缺少 user_openid");
  return `/v2/users/${目标.user_openid}/messages`;
}

/**
 * 给请求体补被动回复凭证（event_id 优先，其次 msg_id + 递增的 msg_seq）。
 * 控制台主动发送时目标里没有任何凭证，就是一条主动消息。
 */
function 附加被动凭证(目标, body) {
  if (目标.event_id) {
    body.event_id = 目标.event_id;
    return body;
  }
  if (目标.msg_id) {
    const seq = Number(目标.next_msg_seq) || 1;
    body.msg_id = 目标.msg_id;
    body.msg_seq = seq;
    目标.next_msg_seq = seq + 1;
  }
  return body;
}

/**
 * 收敛前端传来的内嵌键盘：只保留能取出 label 的按钮；
 * 按官方限制裁剪（label ≤ 10 字、每行 ≤ 5 个、最多 5 行）。
 */
function 规范化键盘(raw) {
  const rowsIn = raw && Array.isArray(raw.rows) ? raw.rows : [];
  const rows = [];
  for (const row of rowsIn) {
    const btnsIn = row && Array.isArray(row.buttons) ? row.buttons : [];
    const buttons = [];
    for (const b of btnsIn) {
      if (!b || typeof b !== "object") continue;
      const label = 清理文本(b.render_data?.label).slice(0, 10);
      if (!label) continue;
      const act = b.action && typeof b.action === "object" ? b.action : {};
      const type = Number(act.type);
      buttons.push({
        id: 清理文本(b.id) || `kzt_${rows.length}_${buttons.length}`,
        render_data: {
          label,
          visited_label: 清理文本(b.render_data?.visited_label).slice(0, 10) || label,
          style: 1
        },
        action: {
          type: type === 0 || type === 1 ? type : 2,
          permission: { type: 2 },
          data: 清理文本(act.data),
          enter: act.enter === true,
          unsupport_tips: "当前客户端版本不支持该操作"
        }
      });
      if (buttons.length >= 5) break;
    }
    if (buttons.length) rows.push({ buttons });
    if (rows.length >= 5) break;
  }
  return rows.length ? { rows } : null;
}

/**
 * 发消息（控制台专用）
 * @param {{keyboard?: {rows: Array<{buttons: unknown[]}>}}} 选项 内嵌键盘，只有 Markdown 消息支持
 * @returns {Promise<object|null>} 最后一次接口返回
 */
async function 发消息(ctx, 发送目标, 内容, 选项 = {}) {
  const list = Array.isArray(内容) ? 内容 : [内容];
  const apiPath = 组装发送路径(发送目标);
  const keyboard = 选项?.keyboard && Array.isArray(选项.keyboard.rows) && 选项.keyboard.rows.length ? 选项.keyboard : null;
  const outChunks = [];
  let lastResult = null;

  for (const seg of list) {
    if (!seg) continue;
    const type = 清理文本(seg.type).toLowerCase();
    const raw = seg.data;

    if (type === "md" || type === "markdown") {
      const md = typeof raw === "string" ? raw : String(raw?.content ?? "");
      if (!md) continue;
      const body = { msg_type: 2, markdown: { content: 补全Md图片语法(md) } };
      if (keyboard) body.keyboard = { content: keyboard };
      lastResult = await BOTAPI(ctx, apiPath, 附加被动凭证(发送目标, body));
      outChunks.push(md);
      continue;
    }

    if (type === "text") {
      const text = typeof raw === "string" ? raw : String(raw?.text ?? "");
      if (!text) continue;
      lastResult = await BOTAPI(ctx, apiPath, 附加被动凭证(发送目标, { msg_type: 0, content: text }));
      outChunks.push(text);
    }
  }

  if (outChunks.length) {
    recordOutboundMessage(ctx, 发送目标, outChunks.join("\n"), lastResult, keyboard);
  }
  return lastResult;
}

async function 撤回消息(ctx, 目标, messageId) {
  const id = 清理文本(messageId);
  if (!id) throw new Error("message_id 为空");
  if (目标.scope === "group") {
    const gid = 清理文本(目标.group_openid);
    if (!gid) throw new Error("缺少 group_openid");
    return BOTAPI(ctx, `/v2/groups/${gid}/messages/${id}`, { __method: "DELETE" });
  }
  const uid = 清理文本(目标.user_openid);
  if (!uid) throw new Error("缺少 user_openid");
  return BOTAPI(ctx, `/v2/users/${uid}/messages/${id}`, { __method: "DELETE" });
}

// ============================================================================
// 富媒体：控制台发送图片 / 文件
// 官方要求两步：先上传换 file_info，再用 msg_type=7 发送；群聊与单聊的上传接口不互通。
// ============================================================================

/** 只开放「图片」和「文件」两类，其余类型不暴露给控制台 */
const MEDIA_FILE_TYPES = { image: 1, file: 4 };

/** 宿主 express.json 上限 10MB，base64 膨胀 4/3，原始文件留 7MB 余量 */
const MEDIA_MAX_BYTES = 7 * 1024 * 1024;

function 组装上传路径(目标) {
  if (目标.scope === "group") {
    if (!目标.group_openid) throw new Error("缺少 group_openid");
    return `/v2/groups/${目标.group_openid}/files`;
  }
  if (!目标.user_openid) throw new Error("缺少 user_openid");
  return `/v2/users/${目标.user_openid}/files`;
}

async function 发送富媒体(ctx, 发送目标, 选项) {
  const fileType = 选项.fileType;
  const uploadBody = { file_type: fileType, srv_send_msg: false };
  if (选项.url) uploadBody.url = 选项.url;
  else if (选项.fileData) uploadBody.file_data = 选项.fileData;
  else throw new Error("缺少 url / file_data");
  if (选项.fileName) uploadBody.file_name = 选项.fileName;

  const up = await BOTAPI(ctx, 组装上传路径(发送目标), uploadBody);
  const fileInfo = 清理文本(up?.file_info);
  if (!fileInfo) throw new Error("上传未返回 file_info");

  const sendBody = { msg_type: 7, media: { file_info: fileInfo } };
  const caption = 清理文本(选项.caption);
  if (caption) sendBody.content = caption;

  const result = await BOTAPI(ctx, 组装发送路径(发送目标), 附加被动凭证(发送目标, sendBody));
  const label = fileType === 1 ? "图片" : "文件";
  recordOutboundMessage(
    ctx,
    发送目标,
    caption || `[${label}] ${选项.fileName || ""}`.trim(),
    result
  );
  return result;
}

// ============================================================================
// 宿主「插件配置」弹窗：把控制台的核心设置映射过去，忘记密码/被锁时不用进后台
// ============================================================================
const plugin_config_ui = [
  {
    key: "Markdown渲染",
    label: "渲染 Markdown",
    type: "boolean",
    default: true,
    description: "「查看消息」按 QQ 排版显示 Markdown 消息。"
  },
  {
    key: "按钮可点击",
    label: "内嵌按钮可点击",
    type: "boolean",
    default: true,
    description: "消息里的指令按钮还原成可点击的蓝色按钮。"
  },
  {
    key: "保留天数",
    label: "消息记录保留天数",
    type: "number",
    default: 0,
    placeholder: "0",
    description: "0 = 永久保留；大于 0 时，超出天数的日志文件会被自动删除（不可恢复）。"
  },
  {
    key: "解除锁定的IP",
    label: "解除登录锁定",
    type: "string",
    default: "",
    placeholder: "填 IP 或 * （* 表示全部解除）",
    description: "同一 IP 连续 3 次密码错误会锁定 24 小时。填写后保存即解锁，保存完这一栏会自动清空；详细锁定列表见控制台「系统设置 → 登录锁定」。"
  },
  {
    key: "重置控制台密码",
    label: "重置控制台密码",
    type: "string",
    default: "",
    placeholder: "留空表示不修改",
    description: "填写后立即生效，需满足：至少 8 位，且包含大写字母、小写字母、阿拉伯数字、特殊符号。重置后所有已登录设备都会掉线。"
  }
];

function 布尔值(v) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "on" || s === "yes";
}

function plugin_get_config(ctx) {
  let 设置 = { Markdown渲染: true, 按钮可点击: true, 保留天数: 0 };
  try {
    设置 = 读设置(ctx);
  } catch {
    // 读不到就用默认值，别让配置弹窗打不开
  }
  return {
    Markdown渲染: 设置.Markdown渲染 !== false,
    按钮可点击: 设置.按钮可点击 !== false,
    保留天数: Math.max(0, Number(设置.保留天数) || 0),
    解除锁定的IP: "",
    重置控制台密码: ""
  };
}

async function plugin_set_config(ctx, config) {
  const c = config && typeof config === "object" ? config : {};

  // 先校验密码，避免「设置写了一半才报错」
  const 新密码 = String(c.重置控制台密码 ?? "").trim();
  if (新密码) {
    const 问题 = 密码强度问题(新密码);
    if (问题.length) throw new Error(`重置密码失败：${问题.join("、")}`);
  }

  const patch = {};
  if (c.Markdown渲染 !== void 0) patch.Markdown渲染 = 布尔值(c.Markdown渲染);
  if (c.按钮可点击 !== void 0) patch.按钮可点击 = 布尔值(c.按钮可点击);
  if (c.保留天数 !== void 0) {
    const 天数 = Number(c.保留天数);
    patch.保留天数 = Number.isFinite(天数) ? Math.max(0, Math.min(3650, Math.floor(天数))) : 0;
  }
  if (Object.keys(patch).length) {
    写设置(ctx, patch);
    if (Number(patch.保留天数) > 0) 清理过期日志(ctx, { force: true });
  }

  const 解锁IP = String(c.解除锁定的IP ?? "").trim();
  if (解锁IP && 解锁IP !== "0" && 解锁IP.toLowerCase() !== "false") {
    解除锁定(ctx, 解锁IP);
  }

  if (新密码) {
    改密码(ctx, 新密码);
    const map = 会话表(ctx);
    map.clear();
    保存会话(ctx);
    记安全日志(ctx, "通过「插件配置」重置了控制台密码，全部登录已失效");
  }
}

// ============================================================================
// 生命周期
// ============================================================================
async function plugin_init(ctx) {
  registerGfWebui(ctx);
  try {
    清理过期日志(ctx, { force: true });
  } catch (e) {
    ctx.logger?.warn?.("[kzt] 启动清理失败:", e);
  }
  const rec = 读认证(ctx);
  if (!rec.已改密码) {
    ctx.logger?.warn?.("[kzt] 控制台仍在使用初始密码，请在「系统设置 → 登录与安全」里修改");
  }
  ctx.logger?.info?.("[kzt] 已加载（网页控制台：仪表盘 / 使用排行 / 查看消息 / 登录与安全 / Sharp 依赖）");
}

async function plugin_cleanup(ctx) {
  cancelSharpDependencyInstall(ctx?.logger);
  ctx.logger?.info?.("[kzt] 插件已卸载");
}

/** 只做一件事：把入站消息记进日志，供控制台查看与统计。不再响应任何指令。 */
async function plugin_onmessage(ctx, event) {
  try {
    if (!event) return;
    if (!classifyMessageScope(String(event.t ?? ""))) return;
    await recordInboundMessage(ctx, event);
  } catch (error) {
    ctx.logger?.warn?.("[kzt] 记录入站消息失败:", error);
  }
}

export { plugin_cleanup, plugin_config_ui, plugin_get_config, plugin_init, plugin_onmessage, plugin_set_config };
