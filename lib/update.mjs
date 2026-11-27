/* ============================================================
 * lib/update.mjs —— kzt 插件自更新（零第三方依赖）
 * ------------------------------------------------------------
 * 参照「星甲娱乐」GF-plugin-xjyl 的在线更新链路：
 *   GitHub Release 检测 → 多下载源 → 内存解压校验 → 备份 → 双目录覆盖 → 回读校验 → 重载。
 *
 * 与之不同的几点（都是踩过的坑）：
 *   1. 备份放在 plugins/GF-kzt/update-backups/（插件目录的子目录，不写 data/）：
 *      星甲的 GF-plugin-xjyl.bak-* 放 plugins/ 顶层，仍以 GF- 开头会被宿主当成新插件；
 *      放子目录既不会被扫到，控制台删插件时又能把备份一起删掉，不用登服务器。
 *   2. 旧版本从磁盘 package.json 回读，不 import 常量（星甲会把「旧版本」报成编译时的版本）。
 *   3. 支持发布包内顶层 GF-kzt/ 目录（kzt 的 Release zip 带这层），解压时自动剥掉。
 *   4. 安装源目录识别不到时只写运行副本会立刻被重载覆盖回去，这里明确报错而不是假装成功。
 * ============================================================ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';

export const 仓库 = '3671656786/GF-kzt';
export const 插件ID = 'GF-kzt';
export const Release接口 = `https://api.github.com/repos/${仓库}/releases/latest`;
export const 下载超时毫秒 = 90000;
export const 备份保留数 = 3;
export const 状态文件 = 'update-status.json';
/** 各阶段的展示进度（0-100）。下载拿不到字节进度，用阶段百分比给确定感。 */
export const 阶段进度表 = { 检查版本: 10, 签名验证: 20, 下载: 45, 解压: 58, 校验: 68, 备份: 78, 安装: 90, 回读校验: 96, 完成: 100 };
export const 配置文件 = 'update-config.json';
export const 备份目录名 = 'update-backups';

const 资产正则 = /^GF-kzt-?v?(\d+\.\d+\.\d+(?:[-.][0-9A-Za-z]+)?)\.zip$/i;

export const 下载源表 = [
  {
    键: 'direct',
    名: 'GitHub 直连',
    拼: (u) => u,
    需要资产id: false,
  },
  {
    键: 'api',
    名: 'GitHub 官方 API',
    拼: (u, id) => `https://api.github.com/repos/${仓库}/releases/assets/${id}`,
    需要资产id: true,
  },
  {
    键: 'ghproxy',
    名: 'gh-proxy 加速',
    拼: (u) => `https://gh-proxy.com/${u}`,
    需要资产id: false,
  },
  {
    键: 'catmak',
    名: 'catmak 加速',
    拼: (u) => `https://gh.catmak.name/${u}`,
    需要资产id: false,
  },
];
export const 默认源键 = 'direct';

export function 取源(键) {
  return 下载源表.find((x) => x.键 === String(键 || '')) || 下载源表.find((x) => x.键 === 默认源键);
}

/** 版本比较：a > b 返回 1，a < b 返回 -1，相等 0；忽略前导 v 与预发布后缀 */
export function 比较版本(a, b) {
  const 取段 = (v) => String(v || '0').replace(/^v/i, '').split(/[-+]/)[0].split('.').map((x) => Number(x) || 0);
  const pa = 取段(a), pb = 取段(b);
  for (let i = 0; i < 3; i += 1) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

/* ------------------------------------------------------------------ HTTP */
// GitHub 匿名 API 只有 60 次/小时；填 Token 后能到 5000 次/小时。
// 令牌只存插件数据目录，且**只发给 GitHub 官方域名**，绝不发给 gh-proxy / catmak 等加速源。
let 当前令牌 = '';
export function 设令牌(t) { 当前令牌 = String(t || '').trim(); }
export function 读令牌() { return 当前令牌; }
export function 令牌格式合法(t) {
  const s = String(t || '').trim();
  return /^(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})$/.test(s);
}
function 是GitHub官方(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h === 'github.com' || h === 'api.github.com' || h === 'uploads.github.com' || h.endsWith('.githubusercontent.com');
  } catch {
    return false;
  }
}
function 请求头(url = '', 额外 = {}) {
  const 头 = {
    'User-Agent': 'kzt-self-update',
    Accept: 'application/vnd.github+json,application/octet-stream;q=0.9,*/*;q=0.8',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (当前令牌 && 是GitHub官方(url)) 头.Authorization = `Bearer ${当前令牌}`;
  return { ...头, ...额外 };
}

/** 用 fetch 取 JSON，带超时；失败交给 node:https 通道 */
async function 取JSON用fetch(url, 头, 超时毫秒) {
  const ctrl = new AbortController();
  const 计时 = setTimeout(() => ctrl.abort(), 超时毫秒);
  try {
    const res = await fetch(url, { headers: 头, redirect: 'follow', signal: ctrl.signal });
    if (!res.ok) return { ok: false, 状态: res.status, 原因: `HTTP ${res.status}` };
    return { ok: true, json: JSON.parse(await res.text()) };
  } catch (e) {
    return { ok: false, 原因: String((e && e.message) || e) };
  } finally {
    clearTimeout(计时);
  }
}

function 取JSON用模块(url, 头, 超时毫秒, 层数 = 0) {
  return new Promise((resolve) => {
    let u;
    try {
      u = new URL(url);
    } catch {
      resolve({ ok: false, 原因: '地址不合法' });
      return;
    }
    const mod = u.protocol === 'http:' ? http : https;
    const req = mod.get(url, { headers: 头, timeout: 超时毫秒 }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        if (层数 >= 5) {
          resolve({ ok: false, 原因: '重定向过多' });
          return;
        }
        const 下 = new URL(res.headers.location, url).toString();
        resolve(取JSON用模块(下, 头, 超时毫秒, 层数 + 1));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        resolve({ ok: false, 状态: res.statusCode, 原因: `HTTP ${res.statusCode}` });
        return;
      }
      let 文 = '';
      res.setEncoding('utf8');
      res.on('data', (d) => { 文 += d; });
      res.on('end', () => {
        try {
          resolve({ ok: true, json: JSON.parse(文) });
        } catch (e) {
          resolve({ ok: false, 原因: `JSON 解析失败：${e.message}` });
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('超时')));
    req.on('error', (e) => resolve({ ok: false, 原因: String((e && e.message) || e) }));
  });
}

async function 取JSON(url, 头 = 请求头(url), 超时毫秒 = 15000) {
  const a = await 取JSON用fetch(url, 头, 超时毫秒);
  if (a.ok) return a;
  const b = await 取JSON用模块(url, 头, 超时毫秒);
  return b.ok ? b : a;
}

/** 查 GitHub API 配额（/rate_limit 本身不消耗配额），用于控制台显示「核心 4994/5000」 */
export async function 查速率限制() {
  const url = 'https://api.github.com/rate_limit';
  try {
    const ctrl = new AbortController();
    const 计时 = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, { headers: 请求头(url), signal: ctrl.signal });
    clearTimeout(计时);
    if (!res.ok) return { ok: false, 原因: `HTTP ${res.status}` };
    const j = await res.json();
    const core = j && j.resources && j.resources.core ? j.resources.core : null;
    if (!core) return { ok: false, 原因: 'GitHub 没有返回 core 配额信息' };
    return {
      ok: true,
      限额: Number(core.limit) || 0,
      剩余: Number(core.remaining) || 0,
      已用: Number(core.used) || 0,
      重置时间: core.reset ? new Date(Number(core.reset) * 1000).toISOString() : '',
      已认证: !!当前令牌,
    };
  } catch (e) {
    return { ok: false, 原因: String((e && e.message) || e) };
  }
}

/* -------------------------------------------------------------- 签名验证 */
const 官方账号 = 仓库.split('/')[0];
const 官方邮箱 = '3671656786@qq.com';

/**
 * 验证 Release 对应 commit 的 GitHub 签名。
 * "官方" = GitHub 验签通过（verified + reason=valid）且提交作者是仓库主人；
 * 任何一项不满足都返回 官方已验证=false，由调用方决定要不要让用户确认风险。
 */
export async function 验证官方签名(版本) {
  const tag = String(版本 || '').replace(/^v/i, '');
  const url = `https://api.github.com/repos/${仓库}/commits/v${tag}`;
  const r = await 取JSON(url);
  if (!r.ok) {
    return {
      官方已验证: false,
      已验证: false,
      原因: `签名信息获取失败（${r.状态 ? 'HTTP ' + r.状态 : r.原因}）`,
      提交: '',
      作者登录: '',
      作者邮箱: '',
    };
  }
  const c = r.json && typeof r.json === 'object' ? r.json : {};
  const v = c.commit && c.commit.verification ? c.commit.verification : {};
  const 已验证 = v.verified === true && String(v.reason || '') === 'valid';
  const payload = String(v.payload || '');
  const 邮箱 = (payload.match(/^author .* <([^>]+)>/m) || [])[1] || '';
  const 作者登录 = String((c.author && c.author.login) || '');
  const 作者匹配 = 邮箱 === 官方邮箱 || 作者登录 === 官方账号;
  const 官方已验证 = 已验证 && 作者匹配;
  const 原因 = 官方已验证
    ? `GitHub 已验证官方签名（提交 ${String(c.sha || '').slice(0, 7)}，作者 ${作者登录 || 邮箱}）`
    : !已验证
      ? `提交未通过 GitHub 验签（reason=${String(v.reason || '未知')}），无法确认包出自官方`
      : `签名虽通过 GitHub 验签，但作者 ${作者登录 || 邮箱 || '未知'} 不是官方账号 ${官方账号}`;
  return {
    官方已验证,
    已验证,
    原因,
    提交: String(c.sha || ''),
    作者登录,
    作者邮箱: 邮箱,
    验证时间: String(v.verified_at || ''),
  };
}

/* -------------------------------------------------------------- 版本检测 */
const 信息缓存 = new Map();
const 缓存毫秒 = 5 * 60 * 1000;
/** 供测试或手动强制刷新用 */
export function 清空发布缓存() { 信息缓存.clear(); }

/** 查 Release；tag 为空 = 最新版；缓存 5 分钟，避免控制台轮询打爆 GitHub API */
export async function 查发布(tag = '') {
  const 版本键 = String(tag || '').replace(/^v/i, '');
  const 键 = 版本键 || '__latest__';
  const 旧 = 信息缓存.get(键);
  if (旧 && Date.now() - 旧.时间 < 缓存毫秒) return 旧.结果;

  const url = 版本键
    ? `https://api.github.com/repos/${仓库}/releases/tags/v${版本键}`
    : Release接口;
  const r = await 取JSON(url);
  if (!r.ok) {
    return {
      ok: false,
      原因: r.状态 === 404
        ? `GitHub 上没有 v${版本键 || ''} 这个版本`
        : `检查更新失败：${r.原因}（若开着代理，请把 github.com / api.github.com 设为直连）`,
    };
  }
  const j = r.json;
  if (!j || !j.tag_name) return { ok: false, 原因: 'GitHub 返回的 Release 没有版本号' };
  const 版本号 = String(j.tag_name).replace(/^v/i, '');
  const 资产 = (Array.isArray(j.assets) ? j.assets : []).find((a) => 资产正则.test(String(a.name || '')));
  if (!资产) return { ok: false, 原因: `Release v${版本号} 里没有 GF-kzt-*.zip 发布包` };

  const 签名 = await 验证官方签名(版本号);
  const 结果 = {
    ok: true,
    版本: 版本号,
    标题: String(j.name || j.tag_name || ''),
    发布时间: String(j.published_at || ''),
    说明: String(j.body || ''),
    zip名: String(资产.name),
    资产id: Number(资产.id) || 0,
    下载地址: String(资产.browser_download_url || ''),
    资产大小: Number(资产.size) || 0,
    页面: String(j.html_url || ''),
    签名,
  };
  信息缓存.set(键, { 时间: Date.now(), 结果 });
  return 结果;
}

/* ------------------------------------------------------------------ 下载 */
async function 下载用fetch(url, 头, 超时毫秒) {
  const ctrl = new AbortController();
  const 计时 = setTimeout(() => ctrl.abort(), 超时毫秒);
  try {
    const res = await fetch(url, { headers: 头, redirect: 'follow', signal: ctrl.signal });
    if (!res.ok) return { ok: false, 原因: `HTTP ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1024) return { ok: false, 原因: `内容过小（${buf.length} 字节）` };
    return { ok: true, 内容: buf, 通道: 'fetch' };
  } catch (e) {
    return { ok: false, 原因: String((e && e.message) || e) };
  } finally {
    clearTimeout(计时);
  }
}

function 下载用模块(url, 头, 超时毫秒, 层数 = 0) {
  return new Promise((resolve) => {
    let u;
    try {
      u = new URL(url);
    } catch {
      resolve({ ok: false, 原因: '地址不合法' });
      return;
    }
    const mod = u.protocol === 'http:' ? http : https;
    const req = mod.get(url, { headers: 头, timeout: 超时毫秒 }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        if (层数 >= 5) {
          resolve({ ok: false, 原因: '重定向过多' });
          return;
        }
        resolve(下载用模块(new URL(res.headers.location, url).toString(), 头, 超时毫秒, 层数 + 1));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        resolve({ ok: false, 原因: `HTTP ${res.statusCode}` });
        return;
      }
      const 块 = [];
      res.on('data', (d) => 块.push(d));
      res.on('end', () => {
        const buf = Buffer.concat(块);
        if (buf.length < 1024) {
          resolve({ ok: false, 原因: `内容过小（${buf.length} 字节）` });
          return;
        }
        resolve({ ok: true, 内容: buf, 通道: 'https' });
      });
    });
    req.on('timeout', () => req.destroy(new Error('下载超时')));
    req.on('error', (e) => resolve({ ok: false, 原因: String((e && e.message) || e) }));
  });
}

async function 下载单源(源, 发布) {
  if (源.需要资产id && !发布.资产id) return { ok: false, 原因: '该源需要资产 id，但 Release 没有提供' };
  const url = 源.拼(发布.下载地址, 发布.资产id);
  const 头 = 请求头(url, 源.需要资产id ? { Accept: 'application/octet-stream' } : {});
  const a = await 下载用fetch(url, 头, 下载超时毫秒);
  if (a.ok) return { ...a, 源: 源.名 };
  const b = await 下载用模块(url, 头, 下载超时毫秒);
  return b.ok ? { ...b, 源: 源.名 } : { ok: false, 原因: a.原因, 源: 源.名 };
}

/** 顺序降级：首选源不通就换下一个，并把试过的源如实回报 */
export async function 下载zip(源键, 发布) {
  const 首选 = 取源(源键);
  const 顺序 = [首选, ...下载源表.filter((x) => x.键 !== 首选.键)];
  const 试过 = [];
  for (const 源 of 顺序) {
    const r = await 下载单源(源, 发布);
    if (r.ok) {
      return {
        ok: true,
        内容: r.内容,
        源: 源.名,
        源键: 源.键,
        通道: r.通道,
        换过源: 源.键 !== 首选.键,
        提示: 源.键 !== 首选.键 ? `首选源「${首选.名}」不可用，已改用「${源.名}」` : '',
        试过,
      };
    }
    试过.push({ 源: 源.名, 原因: String(r.原因 || '').slice(0, 60) });
  }
  return { ok: false, 原因: `所有下载源都失败：\n${试过.map((x) => `· ${x.源}：${x.原因}`).join('\n')}`, 试过 };
}

/* ------------------------------------------------------------------ 解压 */
const EOCD签名 = 0x06054b50;
const 中央目录签名 = 0x02014b50;
const 本地头签名 = 0x04034b50;

function 找EOCD(buf) {
  const 起点 = Math.max(0, buf.length - 66000);
  for (let i = buf.length - 22; i >= 起点; i -= 1) {
    if (buf.readUInt32LE(i) === EOCD签名) return i;
  }
  return -1;
}

/**
 * 解压 zip 到内存 Map<相对路径, Buffer>
 * 只支持 Stored(0) / Deflate(8)，这两足以覆盖 GitHub Actions 生成的 zip。
 */
export function 解压到内存(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 22) return { ok: false, 原因: '文件太短，不是有效的 zip' };
  const eocd = 找EOCD(buf);
  if (eocd < 0) return { ok: false, 原因: '找不到 zip 中央目录结尾，包可能损坏' };
  const 条目数 = buf.readUInt16LE(eocd + 10);
  const 目录大小 = buf.readUInt32LE(eocd + 12);
  const 目录偏移 = buf.readUInt32LE(eocd + 16);
  if (目录偏移 + 目录大小 > buf.length) return { ok: false, 原因: 'zip 中央目录偏移越界' };

  const 原始 = [];
  let p = 目录偏移;
  for (let i = 0; i < 条目数; i += 1) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 中央目录签名) break;
    const 方式 = buf.readUInt16LE(p + 10);
    const 压缩大小 = buf.readUInt32LE(p + 20);
    const 原始大小 = buf.readUInt32LE(p + 24);
    const 名长 = buf.readUInt16LE(p + 28);
    const 扩长 = buf.readUInt16LE(p + 30);
    const 注长 = buf.readUInt16LE(p + 32);
    const 本地偏移 = buf.readUInt32LE(p + 42);
    let 名 = buf.slice(p + 46, p + 46 + 名长).toString('utf8').replace(/\\/g, '/').replace(/^\.\//, '');
    p += 46 + 名长 + 扩长 + 注长;

    if (!名 || 名.endsWith('/')) continue;
    if (名.includes('..') || path.isAbsolute(名) || /^[A-Za-z]:/.test(名)) continue;
    if (原始大小 > 200 * 1024 * 1024) return { ok: false, 原因: `zip 内含超大文件：${名}` };
    if (本地偏移 + 30 > buf.length || buf.readUInt32LE(本地偏移) !== 本地头签名) {
      return { ok: false, 原因: `本地头校验失败：${名}` };
    }
    const 本地名长 = buf.readUInt16LE(本地偏移 + 26);
    const 本地扩长 = buf.readUInt16LE(本地偏移 + 28);
    const 起点 = 本地偏移 + 30 + 本地名长 + 本地扩长;
    const 数据 = buf.slice(起点, 起点 + 压缩大小);
    try {
      const 内容 = 方式 === 0 ? Buffer.from(数据) : 方式 === 8 ? zlib.inflateRawSync(数据) : null;
      if (!内容) return { ok: false, 原因: `不支持的压缩方式 ${方式}（${名}）` };
      原始.push([名, 内容]);
    } catch (e) {
      return { ok: false, 原因: `解压失败：${名}（${e.message}）` };
    }
  }
  if (!原始.length) return { ok: false, 原因: 'zip 里没有可解压的文件' };

  // kzt 的发布包带顶层 GF-kzt/，剥掉这一层；只有所有文件共享同一层时才剥
  const 前缀 = 原始.every(([名]) => 名.split('/').length > 1 && 名.split('/')[0].toLowerCase() === 插件ID.toLowerCase())
    ? `${插件ID}/`
    : '';
  const 条目 = new Map();
  for (const [名, 内容] of 原始) {
    const 相对 = 前缀 ? 名.slice(前缀.length) : 名;
    if (!相对 || 相对.includes('..')) continue;
    条目.set(相对, 内容);
  }
  if (!条目.size) return { ok: false, 原因: '剥掉顶层目录后 zip 是空的' };
  return { ok: true, 条目, 剥掉前缀: 前缀 || void 0 };
}

/** 包体校验：关键文件齐全 + 版本号与 Release 标注一致 */
export function 校验包(条目, 期望版本) {
  for (const 文件 of ['index.mjs', 'package.json', 'plugin.json', 'webui/remote.js']) {
    if (!条目.get(文件)) return { ok: false, 原因: `压缩包里缺少 ${文件}，不是有效的 kzt 插件包` };
  }
  let 版本 = '';
  try {
    版本 = String(JSON.parse(条目.get('package.json').toString('utf8')).version || '');
  } catch {
    return { ok: false, 原因: 'package.json 解析失败，已放弃安装' };
  }
  if (期望版本 && 版本 !== String(期望版本).replace(/^v/i, '')) {
    return { ok: false, 原因: `包内版本（${版本}）与 Release 标注（${期望版本}）不一致，已放弃` };
  }
  return { ok: true, 版本 };
}

/* ------------------------------------------------------------ 状态 / 备份 */
function 读JSON(文件, 兜底) {
  try {
    if (!fs.existsSync(文件)) return 兜底;
    return JSON.parse(fs.readFileSync(文件, 'utf8'));
  } catch {
    return 兜底;
  }
}
function 写JSON(文件, 数据) {
  fs.mkdirSync(path.dirname(文件), { recursive: true });
  fs.writeFileSync(文件, `${JSON.stringify(数据, null, 2)}\n`, 'utf8');
}

export function 读状态(dataPath) {
  const raw = 读JSON(path.join(String(dataPath || ''), 状态文件), {});
  return raw && typeof raw === 'object' ? raw : {};
}
export function 写状态(dataPath, patch) {
  const next = { ...读状态(dataPath), ...(patch || {}) };
  写JSON(path.join(String(dataPath || ''), 状态文件), next);
  return next;
}
export function 读更新配置(dataPath) {
  const raw = 读JSON(path.join(String(dataPath || ''), 配置文件), {});
  return raw && typeof raw === 'object' ? raw : {};
}
export function 写更新配置(dataPath, patch) {
  const next = { ...读更新配置(dataPath), ...(patch || {}) };
  写JSON(path.join(String(dataPath || ''), 配置文件), next);
  return next;
}

export function 读包版本(dir) {
  try {
    return String(JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version || '');
  } catch {
    return '';
  }
}

/**
 * 备份放在插件安装目录的 update-backups/ 子目录里：
 *   · 宿主只扫描 plugins/ 的顶层目录，子目录不会被当成新插件加载
 *   · 控制台插件列表的「删除」会移除整个 plugins/GF-kzt，备份跟着一起删，不用登服务器
 *   · 星甲是放同级的 GF-plugin-xjyl.bak-*，但那样会在插件列表里多出一张卡片，这里改成子目录
 */
export function 备份目录(dir, 备份根路径) {
  // 同一秒里要备份两个目录（源目录 + 运行副本），时间戳必须带随机后缀，否则后一份会覆盖前一份
  const 戳 = `${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}-${Math.random().toString(16).slice(2, 6)}`;
  const 根 = String(备份根路径 || '').trim();
  if (!根) return { ok: false, 原因: '备份目录未指定' };
  const 绝对根 = path.resolve(根);
  const 目标 = path.join(根, `${插件ID}-${戳}`);
  let 临时 = '';
  try {
    // fs.cpSync 不允许把目录直接复制到它自己的子目录里，所以先落到系统临时目录再搬回来。
    // 同时用 filter 排除旧备份根，避免备份里套备份。
    临时 = fs.mkdtempSync(path.join(os.tmpdir(), 'kzt-bak-'));
    fs.cpSync(dir, 临时, {
      recursive: true,
      force: true,
      filter: (src) => {
        const abs = path.resolve(src);
        return abs === 绝对根 || !abs.startsWith(`${绝对根}${path.sep}`);
      },
    });
    fs.mkdirSync(根, { recursive: true });
    fs.cpSync(临时, 目标, { recursive: true, force: true });
  } catch (e) {
    return { ok: false, 原因: `备份失败：${e.message}` };
  } finally {
    if (临时) {
      try { fs.rmSync(临时, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }
  try {
    const 旧 = fs.readdirSync(根).filter((x) => x.startsWith(`${插件ID}-`)).sort();
    while (旧.length > 备份保留数) fs.rmSync(path.join(根, 旧.shift()), { recursive: true, force: true });
  } catch {
    // 清理旧备份失败不影响本次更新
  }
  return { ok: true, 路径: 目标 };
}

/** 逐文件覆盖，不删除本地多余文件（data/、日志、备份都不在覆盖范围内） */
export function 覆盖安装(条目, 目录组) {
  let 写了 = 0;
  const 明细 = [];
  for (const 目录 of 目录组) {
    let n = 0;
    for (const [名, 内容] of 条目) {
      const 目标 = path.join(目录, 名);
      const 相对 = path.relative(目录, 目标);
      if (相对.startsWith('..') || path.isAbsolute(相对)) continue;
      fs.mkdirSync(path.dirname(目标), { recursive: true });
      fs.writeFileSync(目标, 内容);
      n += 1;
    }
    写了 += n;
    明细.push({ 目录, 文件数: n, 回读版本: 读包版本(目录) });
  }
  return { ok: true, 写了, 明细 };
}

/** 从 ctx 推导安装源目录 plugins/<插件ID>；宿主重载时会用它覆盖运行副本 */
export function 解析安装源目录(ctx) {
  const 根 = String(ctx?.frameworkEnv?.projectRoot || '').trim();
  const 候选 = [];
  if (根) 候选.push(path.join(根, 'plugins', 插件ID));
  const 运行 = String(ctx?.pluginPath || '').trim();
  if (运行) 候选.push(运行);
  for (const dir of 候选) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
  }
  return '';
}

/**
 * 执行更新：查版本 → 下载 → 校验 → 备份 → 覆盖 → 回读。
 * 不含重载：调用方要先发完状态消息，再调 ctx.pluginManager.reloadPlugin。
 */
export async function 执行更新({ 插件目录, 安装源目录, dataPath, 目标版本 = '', 源键 = 默认源键, 允许无签名 = false }) {
  const 置状态 = (patch) => 写状态(dataPath, patch);
  const 开始 = Date.now();
  try {
    置状态({ 阶段: '检查版本', 进度: 10,  进行中: true, 错误: '', 开始时间: 开始 });

    // 签名门禁：官方签名通过 → 直接装；否则必须用户显式同意承担风险
    const 签名 = await 验证官方签名(目标版本 || (await 查发布('')).版本);
    if (!签名.官方已验证 && !允许无签名) {
      const 原因 = `${签名.原因}。如仍要安装，请在控制台勾选「我已了解风险」后重试。`;
      const 结果 = { ok: false, 阶段: '签名验证', 需要风险确认: true, 原因, 签名 };
      写状态(dataPath, { 阶段: '失败', 进度: 20, 进行中: false, 错误: `【签名验证】${原因}`, 签名, 最后结果: 结果, 完成时间: Date.now() });
      return 结果;
    }
    置状态({ 阶段: '签名验证', 进度: 20,  签名, 风险已确认: !签名.官方已验证 && 允许无签名 });

    const 查 = await 查发布(目标版本);
    if (!查.ok) throw Object.assign(new Error(查.原因), { 阶段: '检查版本' });
    if (目标版本 && 查.版本 !== String(目标版本).replace(/^v/i, '')) {
      throw Object.assign(new Error(`版本不匹配（想要 v${目标版本}，GitHub 返回 v${查.版本}）`), { 阶段: '检查版本' });
    }
    // 规则：每做一次更新都必须升版本。同源同版本重装、降级都在入口拦下，
    // 防止「文件改了但版本号没动」让后台无法判断到底更没更。
    const 安装源路径 = String(安装源目录 || '').trim();
    const 当前版本 = 读包版本(安装源路径 && fs.existsSync(安装源路径) ? 安装源路径 : 插件目录);
    if (当前版本 && 比较版本(查.版本, 当前版本) <= 0) {
      throw Object.assign(
        new Error(`目标版本 v${查.版本} 不高于当前版本 v${当前版本}；每次更新都必须升版本号`),
        { 阶段: '版本检查' }
      );
    }

    置状态({ 阶段: '下载', 进度: 45,  最新版本: 查.版本 });
    const 下 = await 下载zip(源键, 查);
    if (!下.ok) throw Object.assign(new Error(下.原因), { 阶段: '下载' });

    置状态({ 阶段: '校验', 进度: 68 });
    const 解 = 解压到内存(下.内容);
    if (!解.ok) throw Object.assign(new Error(解.原因), { 阶段: '解压' });
    const 校 = 校验包(解.条目, 查.版本);
    if (!校.ok) throw Object.assign(new Error(校.原因), { 阶段: '校验' });

    const 目录组 = [];
    const src = String(安装源目录 || '').trim();
    const run = String(插件目录 || '').trim();
    if (!run || !fs.existsSync(run)) throw Object.assign(new Error('插件目录不存在，无法更新'), { 阶段: '备份' });
    if (src && fs.existsSync(src) && path.resolve(src) !== path.resolve(run)) 目录组.push(src);
    目录组.push(run);

    const 旧版本 = 读包版本(src && fs.existsSync(src) ? src : run);

    置状态({ 阶段: '备份', 进度: 78 });
    const 备份根 = path.join(src && fs.existsSync(src) ? src : run, 备份目录名);
    const 备份 = [];
    for (const dir of 目录组) {
      const b = 备份目录(dir, 备份根);
      if (!b.ok) throw Object.assign(new Error(`${b.原因}（${dir}）`), { 阶段: '备份' });
      备份.push({ 目录: dir, 路径: b.路径 });
    }
    置状态({ 备份根 });

    置状态({ 阶段: '安装', 进度: 90 });
    const 写 = 覆盖安装(解.条目, 目录组);
    置状态({ 阶段: '回读校验', 进度: 96 });
    const 没对上 = 写.明细.filter((x) => x.回读版本 !== 校.版本);
    if (没对上.length) {
      throw Object.assign(
        new Error(`写入后版本没对上（期望 v${校.版本}，实际 ${没对上.map((x) => `${x.目录}:v${x.回读版本 || '未知'}`).join(' / ')}）；备份在 ${备份根}`),
        { 阶段: '回读校验' }
      );
    }

    const 结果 = {
      ok: true,
      旧版本,
      新版本: 校.版本,
      标题: 查.标题,
      页面: 查.页面,
      说明: 查.说明,
      下载源: 下.源,
      换过源: !!下.换过源,
      源提示: 下.提示 || '',
      试过: 下.试过 || [],
      写了: 写.写了,
      明细: 写.明细,
      备份,
      签名,
      风险已确认: !签名.官方已验证 && 允许无签名,
      耗时毫秒: Date.now() - 开始,
    };
    置状态({
      阶段: '完成',
      进度: 100,
      进行中: false,
      当前版本: 校.版本,
      最新版本: 校.版本,
      签名,
      最后结果: 结果,
      错误: '',
      完成时间: Date.now(),
    });
    return 结果;
  } catch (e) {
    const 阶段 = String((e && e.阶段) || '更新');
    const 原因 = String((e && e.message) || e);
    const 已有备份根 = path.join(
      String(安装源目录 || '').trim() && fs.existsSync(String(安装源目录).trim()) ? String(安装源目录).trim() : String(插件目录 || '').trim(),
      备份目录名
    );
    const 结果 = { ok: false, 阶段, 原因, 备份位置: 已有备份根 };
    写状态(dataPath, { 阶段: '失败', 进度: 阶段进度表[阶段] || 0, 进行中: false, 最后结果: 结果, 错误: `【${阶段}】${原因}`, 完成时间: Date.now() });
    return 结果;
  }
}
