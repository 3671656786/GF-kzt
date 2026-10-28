import { jsxs as r, jsx as e, Fragment as Ue } from "react/jsx-runtime";
import { useRef as N, useState as k, useMemo as je, useEffect as M, useCallback as H } from "react";
/** 登录失效时由根组件接管，弹回登录页 */
let 登录失效回调 = null;
function 设登录失效回调(fn) {
  登录失效回调 = fn;
}
function 本机令牌() {
  try {
    return localStorage.getItem("kzt-token") || "";
  } catch {
    return "";
  }
}
function 存令牌(v) {
  try {
    v ? localStorage.setItem("kzt-token", v) : localStorage.removeItem("kzt-token");
  } catch {
  }
}
function We(a, i) {
  const t = a.replace(/\/$/, "") + "/kzt";
  async function o(s, 场景) {
    const m = await s.text().catch(() => "");
    let d = null;
    if (m) {
      try {
        d = JSON.parse(m);
      } catch {
      }
    }
    if (s.status === 401 && 场景 !== "登录") {
      存令牌("");
      if (typeof 登录失效回调 == "function") 登录失效回调();
    }
    if (!s.ok) {
      const reason = d && (d.message || d.msg || d.error);
      throw new Error(reason ? String(reason) : `HTTP ${s.status}${m ? ` - ${m.slice(0, 200)}` : ""}`);
    }
    if (d === null) throw new Error("服务端返回了非 JSON 内容");
    return d;
  }
  const 令牌头 = () => {
    const v = 本机令牌();
    return v ? { "X-Kzt-Token": v } : {};
  };
  return {
    async get(s, m, 选项) {
      const p = new URLSearchParams();
      if (m)
        for (const [c, u] of Object.entries(m))
          u === void 0 || u === "" || p.set(c, String(u));
      const f = p.toString(), x = t + s + (f ? `?${f}` : "");
      return o(await i(x, { credentials: "include", headers: 令牌头() }), 选项 && 选项.场景);
    },
    async post(s, m, 选项) {
      return o(
        await i(t + s, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...令牌头() },
          body: JSON.stringify(m ?? {})
        }),
        选项 && 选项.场景
      );
    }
  };
}
function He() {
  const a = /* @__PURE__ */ new Date(), i = (t) => String(t).padStart(2, "0");
  return `${a.getFullYear()}-${i(a.getMonth() + 1)}-${i(a.getDate())}`;
}
function P(a) {
  const i = String(a || "");
  return i.length <= 16 ? i : `${i.slice(0, 8)}…${i.slice(-6)}`;
}
function Ge(a, i) {
  const t = i ? new Date(i) : new Date(a || 0);
  if (Number.isNaN(t.getTime())) return String(a || "");
  const o = (s) => String(s).padStart(2, "0");
  return `${o(t.getMonth() + 1)}-${o(t.getDate())} ${o(t.getHours())}:${o(t.getMinutes())}:${o(t.getSeconds())}`;
}
function Ve(a, i) {
  const t = i ? new Date(i) : new Date(a || 0);
  if (Number.isNaN(t.getTime())) return "";
  const o = (p) => String(p).padStart(2, "0"), s = /* @__PURE__ */ new Date();
  return t.getFullYear() === s.getFullYear() && t.getMonth() === s.getMonth() && t.getDate() === s.getDate() ? `${o(t.getHours())}:${o(t.getMinutes())}` : `${o(t.getMonth() + 1)}-${o(t.getDate())} ${o(t.getHours())}:${o(t.getMinutes())}`;
}
function Ke({ hourly: a }) {
  const i = N(null), [t, o] = k(0), s = je(() => {
    const h = Array.isArray(a) ? a.map((w) => Number(w) || 0) : [];
    for (; h.length < 24; ) h.push(0);
    return h.slice(0, 24);
  }, [a]);
  M(() => {
    const h = i.current;
    if (!h || typeof ResizeObserver > "u") {
      o(h?.clientWidth || 0);
      return;
    }
    const w = new ResizeObserver(() => o(Math.round(h.clientWidth)));
    return w.observe(h), o(Math.round(h.clientWidth)), () => w.disconnect();
  }, []);
  const m = Math.max(1, ...s), p = 180, f = 2, x = Math.max(1, t), c = p - f * 2, y = s.map((h, w) => {
    const z = w / 23 * x, g = f + (1 - h / m) * c;
    return [z, g];
  }).map((h, w) => `${w === 0 ? "M" : "L"}${h[0].toFixed(2)},${h[1].toFixed(2)}`).join(" "), l = `${y} L${x.toFixed(2)},${(f + c).toFixed(2)} L0,${(f + c).toFixed(2)} Z`, $ = /* @__PURE__ */ new Set([0, 3, 6, 9, 12, 15, 18, 21, 23]);
  return /* @__PURE__ */ r("div", { className: "chart-wrap", children: [
    /* @__PURE__ */ r("div", { className: "chart-body", children: [
      /* @__PURE__ */ r("div", { className: "chart-y", children: [
        /* @__PURE__ */ e("span", { children: m }),
        /* @__PURE__ */ e("span", { children: Math.round(m / 2) }),
        /* @__PURE__ */ e("span", { children: "0" })
      ] }),
      /* @__PURE__ */ e("div", { className: "chart-plot", ref: i, children: x > 0 ? /* @__PURE__ */ r("svg", { viewBox: `0 0 ${x} ${p}`, width: x, height: p, "aria-hidden": !0, children: [
        [0, 0.5, 1].map((h) => {
          const w = (f + (1 - h) * c).toFixed(2);
          return /* @__PURE__ */ e(
            "line",
            {
              x1: 0,
              y1: w,
              x2: x,
              y2: w,
              stroke: "rgba(100,116,139,0.25)",
              strokeWidth: 1,
              strokeDasharray: "4 4"
            },
            h
          );
        }),
        /* @__PURE__ */ e("path", { d: l, fill: "rgba(13,148,136,0.18)" }),
        /* @__PURE__ */ e(
          "path",
          {
            d: y,
            fill: "none",
            stroke: "#0d9488",
            strokeWidth: 2.5,
            strokeLinejoin: "round",
            strokeLinecap: "round"
          }
        )
      ] }) : null })
    ] }),
    /* @__PURE__ */ e("div", { className: "chart-x", children: Array.from({ length: 24 }, (h, w) => /* @__PURE__ */ e("span", { children: $.has(w) ? `${w}h` : "" }, w)) })
  ] });
}
function B(a) {
  return String(a ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function Je(a) {
  const i = String(a || "");
  return i ? /(^|\n)\s{0,3}#{1,6}\s|!\[[^\]]*\]\(|\[[^\]]+\]\([^)]+\)|\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|(^|\n)\s{0,3}[-*+]\s|(^|\n)\s{0,3}\d+\.\s|(^|\n)\s{0,3}>\s|(^|\n)\s*\|.+\||(^|\n)\s*(?:-{3,}|\*{3,})\s*($|\n)/m.test(i) : !1;
}
/** 从 mqqapi://aio/inlinecmd?…&cmd=xxx（或 command= / text=）里取出指令；取不到返回空串 */
function 取内联指令(u) {
  const raw = String(u || "").replace(/&amp;/g, "&");
  const q = raw.split("?")[1] || "";
  if (!q) return "";
  try {
    const p = new URLSearchParams(q);
    return String(p.get("cmd") || p.get("command") || p.get("text") || "").trim();
  } catch {
    return "";
  }
}
/** 其他机器人的「蓝色按钮」就是 markdown 里的 mqqapi 内联指令链接，转成可点的样式 */
function 内联指令span(文字, 链接) {
  const 命令 = 取内联指令(链接);
  const 样式 = "color:#0b6bcb;font-weight:600";
  if (!命令) return `<span style="${样式}">${文字}</span>`;
  return `<span class="im-cmd" data-cmd="${B(命令)}" role="button" tabindex="0" title="点击填入指令：${B(命令)}" style="${样式};cursor:pointer">${文字}</span>`;
}
/** QQ markdown 的内联指令标签 → 统一折算成 mqqapi 内联链接，后面只有一种形态要处理 */
function 预处理指令标签(s) {
  return String(s ?? "").replace(/<qqbot-cmd-(?:input|enter)\b[^>\n]*\/?>/gi, (tag) => {
    const 取 = (name) => {
      const m = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s/>]+))`, "i").exec(tag);
      return m ? m[1] ?? m[2] ?? m[3] ?? "" : "";
    };
    const 解 = (v) => {
      try {
        return decodeURIComponent(String(v || "").replace(/\+/g, " "));
      } catch {
        return String(v || "");
      }
    };
    const 指令 = 解(取("text")) || 解(取("command"));
    const 文字 = (解(取("show")) || 指令).replace(/[[\]]/g, "").trim();
    if (!指令) return 文字;
    return `[${文字 || 指令}](mqqapi://aio/inlinecmd?cmd=${encodeURIComponent(指令)})`;
  });
}
function O(a) {
  let i = B(a);
  return i = i.replace(
    /!\[([^\]]*?)\]\((https?:\/\/[^)\s]+)\)/g,
    (t, o, s) => {
      const m = String(o || ""), p = m.match(/^(.*?)(?:#(\d+)px\s*#(\d+)px)?$/), f = (p && p[1] ? p[1] : m).trim() || "img";
      return `<img class="im-zoom-img" src="${B(s)}" alt="${B(f)}" loading="lazy" />`;
    }
  ), i = i.replace(/\[([^\]]+)\]\((mqqapi:[^)\s]+)\)/g, (t, o, s) => 内联指令span(o, s)), i = i.replace(/([^\s()[\]{}]{1,24})\((mqqapi:[^)\s]+)\)/g, (t, o, s) => 内联指令span(o, s)), i = i.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'), i = i.replace(/`([^`\n]+)`/g, "<code>$1</code>"), i = i.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>"), i = i.replace(/__([^_\n]+)__/g, "<strong>$1</strong>"), i = i.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>"), i;
}
function Qe(a) {
  const i = 预处理指令标签(String(a ?? "")).replace(/\r\n/g, `
`).trim();
  if (!i) return { html: "", isMd: !1 };
  if (!Je(i))
    return { html: B(i).replace(/\n/g, "<br>"), isMd: !1 };
  const t = i.split(`
`), o = [];
  let s = 0, m = !1, p = [], f = null, x = [];
  const c = () => {
    f && (o.push(f === "ol" ? "</ol>" : "</ul>"), f = null);
  }, u = () => {
    if (!x.length) return;
    const y = x.slice();
    x = [];
    const l = y.filter(($, h) => !(h === 1 && $.every((w) => /^:?-+:?$/.test(w.replace(/\s/g, "")))));
    l.length && (o.push("<table>"), l.forEach(($, h) => {
      const w = h === 0 ? "th" : "td";
      o.push(`<tr>${$.map((z) => `<${w}>${O(z.trim())}</${w}>`).join("")}</tr>`);
    }), o.push("</table>"));
  };
  for (; s < t.length; ) {
    const y = t[s];
    if (m) {
      /^```/.test(y) ? (o.push(`<pre><code>${B(p.join(`
`))}</code></pre>`), p = [], m = !1) : p.push(y), s += 1;
      continue;
    }
    if (/^```/.test(y)) {
      c(), u(), m = !0, p = [], s += 1;
      continue;
    }
    if (/^\s*\|/.test(y) && y.indexOf("|", 1) >= 0) {
      c(), x.push(y.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|")), s += 1;
      continue;
    }
    if (u(), /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(y)) {
      c(), o.push("<hr>"), s += 1;
      continue;
    }
    const l = y.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
    if (l) {
      c();
      const g = l[1].length;
      o.push(`<h${g}>${O(l[2])}</h${g}>`), s += 1;
      continue;
    }
    const $ = y.match(/^\s{0,3}>\s?(.*)$/);
    if ($) {
      c(), o.push(`<blockquote><p>${O($[1])}</p></blockquote>`), s += 1;
      continue;
    }
    const h = y.match(/^\s{0,3}[-*+]\s+(.+)$/);
    if (h) {
      f !== "ul" && (c(), o.push("<ul>"), f = "ul"), o.push(`<li>${O(h[1])}</li>`), s += 1;
      continue;
    }
    const w = y.match(/^\s{0,3}\d+\.\s+(.+)$/);
    if (w) {
      f !== "ol" && (c(), o.push("<ol>"), f = "ol"), o.push(`<li>${O(w[1])}</li>`), s += 1;
      continue;
    }
    if (!y.trim()) {
      c(), s += 1;
      continue;
    }
    c();
    const z = [y];
    for (s += 1; s < t.length; ) {
      const g = t[s];
      if (!g.trim() || /^\s{0,3}#{1,6}\s|^\s{0,3}[-*+]\s|^\s{0,3}\d+\.\s|^\s{0,3}>|^\s*```|^\s*\||^\s*(?:-{3,}|\*{3,})\s*$/.test(g)) break;
      z.push(g), s += 1;
    }
    o.push(`<p>${z.map(O).join("<br>")}</p>`);
  }
  return c(), u(), m && o.push(`<pre><code>${B(p.join(`
`))}</code></pre>`), { html: o.join(""), isMd: !0 };
}
/** 把内嵌键盘解析成可渲染的行 / 按钮；同时兼容 {rows} 与官方 {content:{rows}} 两种形状 */
function 解析键盘(a) {
  const rows = a && Array.isArray(a.rows) ? a.rows : a && a.content && Array.isArray(a.content.rows) ? a.content.rows : [];
  const out = [];
  for (const row of rows) {
    if (!row || !Array.isArray(row.buttons)) continue;
    const btns = [];
    for (const b of row.buttons) {
      if (!b) continue;
      const label = String(b.render_data && b.render_data.label || "").trim();
      if (!label) continue;
      const act = b.action || {}, type = Number(act.type);
      btns.push({
        文字: label,
        类型: type,
        数据: String(act.data || "").trim(),
        可点: type === 0 || type === 2
      });
    }
    if (btns.length) out.push(btns);
  }
  return out;
}
function te({ list: a, empty: i, mode: t }) {
  return a.length ? /* @__PURE__ */ e("ul", { className: "rank-list", children: a.map((o, s) => {
    const m = String(o.id || ""), p = t === "user" ? String(o.name || "").trim() || "未知昵称" : P(m);
    return /* @__PURE__ */ r("li", { className: "rank-row", children: [
      /* @__PURE__ */ r("div", { className: "rank-row-main", children: [
        /* @__PURE__ */ e("span", { className: "rank-idx", children: s + 1 }),
        /* @__PURE__ */ e("img", { src: o.avatar || "", alt: "", onError: (f) => {
          f.target.style.visibility = "hidden";
        } }),
        /* @__PURE__ */ r("div", { className: "rank-name", children: [
          /* @__PURE__ */ e("span", { className: "rank-nick", title: t === "user" ? p : m, children: p }),
          /* @__PURE__ */ e("span", { className: "rank-id", title: m, children: m })
        ] })
      ] }),
      /* @__PURE__ */ e("span", { className: "rank-count", children: o.count ?? 0 })
    ] }, `${m}-${s}`);
  }) }) : /* @__PURE__ */ r("div", { className: "empty rank-empty", children: [
    /* @__PURE__ */ e("div", { className: "empty-icon", "aria-hidden": !0 }),
    /* @__PURE__ */ e("span", { children: i })
  ] });
}
function Xe() {
  const a = "kzt-manrope-font";
  if (document.getElementById(a)) return;
  const i = document.createElement("link");
  i.id = a, i.rel = "stylesheet", i.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap", document.head.appendChild(i);
}
function Ze({
  api: a,
  toast: i,
  默认密码: 用初始密码,
  初始密码: 初始密码值,
  on密码已改: 密码已改回调,
  on退出登录: 退出登录
}) {
  const [t, o] = k("dash"), [s, m] = k(""), [p, f] = k(!1);
  M(() => {
    Xe();
  }, []), M(() => {
    t !== "chats" && f(!1);
  }, [t]);
  const x = [
    ["dash", "仪表盘", "概览"],
    ["ranks", "使用排行", "排行"],
    ["chats", "查看消息", "消息"],
    ["settings", "系统设置", "设置"]
  ];
  return /* @__PURE__ */ r(Ue, { children: [
    /* @__PURE__ */ r("aside", { className: "sidebar", children: [
      /* @__PURE__ */ r("div", { className: "brand", children: [
        /* @__PURE__ */ e("span", { className: "mark", children: "kzt" }),
        /* @__PURE__ */ e("small", { children: "console" })
      ] }),
      x.slice(0, 3).map(([c, u]) => /* @__PURE__ */ e(
        "button",
        {
          type: "button",
          className: `nav-item${t === c ? " active" : ""}`,
          onClick: () => o(c),
          children: u
        },
        c
      )),
      /* @__PURE__ */ e("div", { className: "nav-label", children: "系统" }),
      /* @__PURE__ */ e(
        "button",
        {
          type: "button",
          className: `nav-item${t === "settings" ? " active" : ""}`,
          onClick: () => o("settings"),
          children: "系统设置"
        }
      ),
      /* @__PURE__ */ e(
        "button",
        {
          type: "button",
          className: "nav-item",
          title: "退出后需要重新输入密码",
          onClick: () => {
            typeof 退出登录 == "function" && 退出登录();
          },
          children: "退出登录"
        }
      )
    ] }),
    /* @__PURE__ */ r(
      "main",
      {
        className: `main${p ? " chat-open" : ""}`,
        style: t === "chats" ? { display: "flex", flexDirection: "column", minHeight: 0 } : void 0,
        children: [
          用初始密码 && t !== "settings" ? /* @__PURE__ */ r("div", { className: "kzt-warn-bar", children: [
            /* @__PURE__ */ r("span", { children: [
              /* @__PURE__ */ e("strong", { children: "仍在使用初始密码" }),
              初始密码值 ? "：" : "。",
              初始密码值 ? /* @__PURE__ */ e("code", { className: "kzt-warn-code", children: 初始密码值 }) : null,
              " 　任何能打开这个地址的人都能登录控制台。"
            ] }),
            /* @__PURE__ */ e("button", { type: "button", className: "btn btn-solid", onClick: () => o("settings"), children: "去修改" })
          ] }) : null,
          t === "dash" ? /* @__PURE__ */ e(en, { api: a, onError: m }) : null,
          t === "ranks" ? /* @__PURE__ */ e(nn, { api: a, onError: m }) : null,
          t === "chats" ? /* @__PURE__ */ e(
            tn,
            {
              api: a,
              toast: i,
              onError: m,
              onScreenChange: (c) => f(c === "chat")
            }
          ) : null,
          t === "settings" ? /* @__PURE__ */ e(an, { api: a, toast: i, onError: m, 默认密码: 用初始密码, 初始密码: 初始密码值, on密码已改: 密码已改回调 }) : null,
          s ? /* @__PURE__ */ e("div", { className: "err", children: s }) : null
        ]
      }
    ),
    /* @__PURE__ */ e("nav", { className: `mobile-tabbar${p ? " is-hidden" : ""}`, "aria-label": "主导航", children: x.map(([c, , u]) => /* @__PURE__ */ e(
      "button",
      {
        type: "button",
        className: `mobile-tab${t === c ? " active" : ""}`,
        onClick: () => o(c),
        children: /* @__PURE__ */ e("span", { className: "mobile-tab-label", children: u })
      },
      c
    )) })
  ] });
}
function en({ api: a, onError: i }) {
  const [t, o] = k(He()), [s, m] = k(null), p = H(async () => {
    i("");
    try {
      const u = await a.get("/dashboard", { date: t });
      m(u.data || {});
    } catch (u) {
      i(u instanceof Error ? u.message : String(u));
    }
  }, [a, t, i]);
  M(() => {
    p();
  }, [p]);
  const f = s?.bot || {}, x = Number(s?.groupMessages) || 0, c = Number(s?.privateMessages) || 0;
  return /* @__PURE__ */ r("section", { children: [
    /* @__PURE__ */ e("h1", { className: "page-title", children: "仪表盘" }),
    /* @__PURE__ */ r("div", { className: "toolbar toolbar-glass", children: [
      /* @__PURE__ */ r("label", { children: [
        "日期",
        /* @__PURE__ */ e("input", { type: "date", value: t, onChange: (u) => o(u.target.value) })
      ] }),
      /* @__PURE__ */ e("button", { type: "button", className: "btn btn-ghost", onClick: () => void p(), children: "刷新" })
    ] }),
    /* @__PURE__ */ r("div", { className: "stats", children: [
      /* @__PURE__ */ r("div", { className: "stat-card", children: [
        /* @__PURE__ */ e("div", { className: "label", children: "Bot" }),
        /* @__PURE__ */ r("div", { className: "bot-row", children: [
          /* @__PURE__ */ e("img", { src: f.avatar || "", alt: "", onError: (u) => {
            u.target.style.visibility = "hidden";
          } }),
          /* @__PURE__ */ r("div", { className: "bot-meta", children: [
            /* @__PURE__ */ e("div", { className: "bot-name", title: f.name || "GF Bot", children: f.name || "GF Bot" }),
            /* @__PURE__ */ e("div", { className: "bot-sub", children: f.appId ? `AppID ${f.appId}` : "—" })
          ] }),
          /* @__PURE__ */ e("span", { className: `status-pill${f.running ? "" : " off"}`, children: f.running ? "运行中" : "未启用" })
        ] })
      ] }),
      /* @__PURE__ */ r("div", { className: "stat-card", children: [
        /* @__PURE__ */ e("div", { className: "label", children: "今日消息" }),
        /* @__PURE__ */ e("div", { className: "value", children: x + c }),
        /* @__PURE__ */ r("div", { className: "hint", children: [
          "群聊 ",
          x,
          " · 私聊 ",
          c
        ] })
      ] }),
      /* @__PURE__ */ r("div", { className: "stat-card", children: [
        /* @__PURE__ */ e("div", { className: "label", children: "今日群聊消息" }),
        /* @__PURE__ */ e("div", { className: "value", children: x }),
        /* @__PURE__ */ r("div", { className: "hint", children: [
          s?.groupCount || 0,
          " 个群 · ",
          s?.userCount || 0,
          " 个用户"
        ] })
      ] }),
      /* @__PURE__ */ r("div", { className: "stat-card", children: [
        /* @__PURE__ */ e("div", { className: "label", children: "今日私聊消息" }),
        /* @__PURE__ */ e("div", { className: "value", children: c }),
        /* @__PURE__ */ e("div", { className: "hint", children: "合并日志可筛「私聊」" })
      ] })
    ] }),
    /* @__PURE__ */ r("div", { className: "panel", children: [
      /* @__PURE__ */ e("h3", { children: "今日消息时段分布" }),
      /* @__PURE__ */ e(Ke, { hourly: s?.hourly })
    ] }),
    /* @__PURE__ */ r("div", { className: "split", children: [
      /* @__PURE__ */ r("div", { className: "panel", children: [
        /* @__PURE__ */ e("h3", { children: "群聊使用排行 Top5" }),
        /* @__PURE__ */ e(te, { list: s?.groupTop || [], empty: "暂无群聊数据", mode: "group" })
      ] }),
      /* @__PURE__ */ r("div", { className: "panel", children: [
        /* @__PURE__ */ e("h3", { children: "用户使用排行 Top5" }),
        /* @__PURE__ */ e(te, { list: s?.userTop || [], empty: "暂无用户数据", mode: "user" })
      ] })
    ] })
  ] });
}
function nn({ api: a, onError: i }) {
  const [t, o] = k(He()), [s, m] = k([]), [p, f] = k([]), x = H(async () => {
    i("");
    try {
      const c = await a.get("/rankings", { date: t });
      m(c.data?.groups || []), f(c.data?.users || []);
    } catch (c) {
      i(c instanceof Error ? c.message : String(c));
    }
  }, [a, t, i]);
  return M(() => {
    x();
  }, [x]), /* @__PURE__ */ r("section", { className: "ranks-page", children: [
    /* @__PURE__ */ e("h1", { className: "page-title", children: "使用排行" }),
    /* @__PURE__ */ r("div", { className: "toolbar toolbar-glass", children: [
      /* @__PURE__ */ r("label", { children: [
        "日期",
        /* @__PURE__ */ e("input", { type: "date", value: t, onChange: (c) => o(c.target.value) })
      ] }),
      /* @__PURE__ */ e("button", { type: "button", className: "btn btn-ghost", onClick: () => void x(), children: "刷新" })
    ] }),
    /* @__PURE__ */ r("div", { className: "split ranks-split", children: [
      /* @__PURE__ */ r("div", { className: "panel ranks-panel", children: [
        /* @__PURE__ */ e("h3", { children: "群聊使用排行" }),
        /* @__PURE__ */ e(te, { list: s, empty: "暂无群聊数据", mode: "group" })
      ] }),
      /* @__PURE__ */ r("div", { className: "panel ranks-panel", children: [
        /* @__PURE__ */ e("h3", { children: "用户使用排行" }),
        /* @__PURE__ */ e(te, { list: p, empty: "暂无用户数据", mode: "user" })
      ] })
    ] })
  ] });
}
function tn({
  api: a,
  toast: i,
  onError: t,
  onScreenChange: o
}) {
  const [s, m] = k(""), [p, f] = k("all"), [x, c] = k([]), [u, y] = k("list"), [l, $] = k(null), [h, w] = k([]), [z, g] = k(""), [C, ae] = k(!1), [R, be] = k(!1), [I, Re] = k(() => {
    try {
      return localStorage.getItem("kzt-im-send-md") === "1";
    } catch {
      return !1;
    }
  }), [W, G] = k(null), [V, ue] = k(!1), [he, le] = k(0), [xe, K] = k(""), [渲染设置, 设渲染设置] = k({ Markdown渲染: !0, 按钮可点击: !0 }), [按钮草稿, 设按钮草稿] = k(""), [按钮开, 设按钮开] = k(!1), de = N(null), ke = N(null), J = N(null), we = N(u), ve = N(l), ye = N(0), ce = N(!1), X = N(null), Y = N(null), $e = N(0), ze = N(!1), Z = N(null), fe = N(!1);
  we.current = u, ve.current = l, ye.current = h.length;
  M(() => {
    let 活 = !0;
    return a.get("/settings").then((n) => {
      活 && 设渲染设置(n && n.data || {});
    }).catch(() => {
    }), () => {
      活 = !1;
    };
  }, [a]);
  const L = H((n) => {
    const d = n || J.current;
    d && (d.style.height = "auto", d.style.height = `${Math.min(120, Math.max(48, d.scrollHeight))}px`);
  }, []), F = H(async (n) => {
    n?.silent || t("");
    try {
      const d = await a.get("/chats", {
        days: 30,
        q: s.trim() || void 0
      });
      c(d.data?.sessions || []);
    } catch (d) {
      n?.silent || t(d instanceof Error ? d.message : String(d));
    }
  }, [a, s, t]), ee = H(() => {
    const n = de.current;
    n && (n.scrollTop = n.scrollHeight), ke.current?.scrollIntoView({ block: "end" });
  }, []), q = H(async (n, d, b) => {
    try {
      const v = await a.get("/chats/messages", {
        scope: n,
        id: d,
        days: 30,
        limit: 120,
        offset: 0
      }), T = v.data?.list || [], D = v.data?.peer || b?.peerHint || null;
      D && $(D);
      const j = ye.current, U = (() => {
        const S = de.current;
        return S ? S.scrollHeight - S.scrollTop - S.clientHeight < 80 : !0;
      })();
      w(T);
      const A = T.length > j;
      (!b?.silent || A && U) && requestAnimationFrame(() => ee());
    } catch (v) {
      b?.silent || t(v instanceof Error ? v.message : String(v));
    }
  }, [a, t, ee]), Ae = H(async (n, d, b) => {
    t(""), be(!0), y("chat"), o?.("chat"), g(""), b && $(b);
    try {
      await q(n, d, { peerHint: b });
    } finally {
      be(!1);
    }
  }, [t, o, q]), Pe = () => {
    y("list"), o?.("list"), $(null), w([]), g(""), F({ silent: !0 });
  };
  M(() => {
    F();
  }, [F]), M(() => {
    u === "chat" && L();
  }, [u, z, L]), M(() => {
    const n = async () => {
      if (!ce.current) {
        ce.current = !0;
        try {
          if (we.current === "list")
            await F({ silent: !0 });
          else {
            const b = ve.current;
            b && await q(b.scope, b.id, { silent: !0, peerHint: b });
          }
        } finally {
          ce.current = !1;
        }
      }
    }, d = window.setInterval(() => {
      n();
    }, 1e3);
    return () => window.clearInterval(d);
  }, [F, q]), M(() => {
    if (u !== "chat" || R) return;
    const n = () => ee();
    n();
    const d = window.setTimeout(n, 0), b = window.setTimeout(n, 80);
    return requestAnimationFrame(() => requestAnimationFrame(n)), () => {
      window.clearTimeout(d), window.clearTimeout(b);
    };
  }, [u, R, ee]);
  const Le = async () => {
    if (C || !l || !z.trim()) return;
    ae(!0);
    const 键盘 = 按钮开 ? 建键盘(按钮草稿) : null, 用md = I || !!键盘;
    try {
      await a.post("/chats/send", {
        scope: l.scope,
        id: l.id,
        content: z.trim(),
        format: 用md ? "md" : "text",
        keyboard: 键盘 || void 0
      }), g(""), i(用md ? "已发送（Markdown）" : "已发送"), requestAnimationFrame(() => L()), await q(l.scope, l.id, { peerHint: l }), await F({ silent: !0 });
    } catch (n) {
      const d = n instanceof Error ? n.message : String(n);
      t(d), i(d);
    } finally {
      ae(!1);
    }
  }, qe = (n) => {
    const d = String(n.userId || "").trim();
    if (!d || d === "bot" || d === "unknown") return;
    const b = `<@${d}>`, v = J.current, T = z;
    let D;
    if (v && typeof v.selectionStart == "number") {
      const j = v.selectionStart, U = v.selectionEnd, A = T.slice(0, j), S = T.slice(U), _ = A.length > 0 && !/\s$/.test(A), ie = S.length > 0 && !/^\s/.test(S), De = `${_ ? " " : ""}${b}${ie ? " " : ""}`;
      D = A + De + S, g(D), requestAnimationFrame(() => {
        const Ie = A.length + De.length;
        v.focus(), v.setSelectionRange(Ie, Ie), L(v);
      });
    } else {
      const j = T.length > 0 && !/\s$/.test(T);
      D = `${T}${j ? " " : ""}${b} `, g(D), requestAnimationFrame(() => {
        J.current?.focus(), L();
      });
    }
    i(`已艾特 ${n.userName || P(d)}`);
  }, pe = () => {
    X.current != null && (window.clearTimeout(X.current), X.current = null), Y.current != null && (window.cancelAnimationFrame(Y.current), Y.current = null), le(0), Z.current = null;
  };
  M(() => () => {
    pe();
  }, []);
  const Ce = (n) => {
    if (n === I) return;
    Re(n);
    try {
      localStorage.setItem("kzt-im-send-md", n ? "1" : "0");
    } catch {
    }
    i(n ? "已切换：Markdown" : "已切换：纯文本");
  }, Be = (n, d) => {
    if (!String(d.msgId || "").trim() || n.button != null && n.button !== 0) return;
    ze.current = !1, Z.current = d, $e.current = Date.now(), le(0);
    const b = () => {
      const v = Math.min(1, (Date.now() - $e.current) / 3e3);
      le(v), v < 1 && (Y.current = window.requestAnimationFrame(b));
    };
    Y.current = window.requestAnimationFrame(b), X.current = window.setTimeout(() => {
      ze.current = !0, fe.current = !0;
      const v = Z.current;
      pe(), v?.msgId && G(v);
    }, 3e3);
  }, ge = () => {
    pe();
  }, Ee = async () => {
    if (!(!l || !W?.msgId)) {
      ue(!0);
      try {
        await a.post("/chats/recall", {
          scope: l.scope,
          id: l.id,
          msgId: W.msgId
        }), i("已撤回"), G(null), await q(l.scope, l.id, { peerHint: l });
      } catch (n) {
        const d = n instanceof Error ? n.message : String(n);
        t(d), i(d);
      } finally {
        ue(!1);
      }
    }
  }, Me = async (n) => {
    try {
      const d = await a.post("/chats/pin", { key: n });
      i(d.data?.pinned ? "已置顶" : "已取消置顶"), await F(), l?.key === n && $((b) => b && { ...b, pinned: !!d.data?.pinned });
    } catch (d) {
      t(d instanceof Error ? d.message : String(d));
    }
  }, Te = x.filter((n) => p === "all" ? !0 : n.scope === p), Ye = l ? l.scope === "private" ? l.title || P(l.id) : l.title && l.title !== l.id ? l.title : P(l.id) : "";
  const 图片输入 = N(null), 文件输入 = N(null), 附件上限 = 7 * 1024 * 1024;
  const 读文件base64 = (n) => new Promise((res2, rej2) => {
    const rd = new FileReader();
    rd.onload = () => res2(String(rd.result || "")), rd.onerror = () => rej2(new Error("读取文件失败")), rd.readAsDataURL(n);
  });
  const 发附件 = async (n, d) => {
    if (!n || !l || C) return;
    if (n.size > 附件上限) {
      const m2 = `文件超过 ${附件上限 / 1048576}MB（当前 ${(n.size / 1048576).toFixed(1)}MB），请改用更小的文件`;
      t(m2), i(m2);
      return;
    }
    ae(!0);
    try {
      const d2 = await 读文件base64(n);
      await a.post("/chats/send-media", {
        scope: l.scope,
        id: l.id,
        kind: d,
        name: n.name || (d === "image" ? "image.png" : "file"),
        dataBase64: d2,
        caption: z.trim() || void 0
      }), g(""), i(d === "image" ? "图片已发送" : "文件已发送"), await q(l.scope, l.id, { peerHint: l }), await F({ silent: !0 });
    } catch (m2) {
      const b2 = m2 instanceof Error ? m2.message : String(m2);
      t(b2), i(b2);
    } finally {
      ae(!1);
    }
  };
  /** 「文字|指令」一行一个 → 官方内嵌键盘（每行最多 3 个，最多 5 行） */
  const 建键盘 = (s) => {
    const rows = [];
    let cur = [];
    String(s || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean).forEach((line, idx) => {
      const i2 = line.indexOf("|");
      const label = String(i2 >= 0 ? line.slice(0, i2) : line).trim().slice(0, 10);
      const data = String(i2 >= 0 ? line.slice(i2 + 1) : "").trim();
      if (!label) return;
      cur.push({
        id: `kzt_b${idx}`,
        render_data: { label, visited_label: label, style: 1 },
        action: { type: data ? 2 : 1, permission: { type: 2 }, data: data || label, enter: !0 }
      });
      if (cur.length >= 3) {
        rows.push({ buttons: cur }), cur = [];
      }
    });
    if (cur.length) rows.push({ buttons: cur });
    return rows.length ? { rows } : null;
  };
  /** 还原真实点击：链接直接开；指令按钮填入输入框（QQ 里也是插进输入框）；回调无法模拟 */
  const 点按钮 = (n) => {
    if (!n) return;
    if (n.类型 === 0) {
      if (!n.数据) {
        t("该按钮没有可打开的链接");
        return;
      }
      window.open(n.数据, "_blank", "noopener,noreferrer"), i("已在新窗口打开链接");
      return;
    }
    if (n.类型 === 2) {
      g(n.数据), requestAnimationFrame(() => {
        J.current && (J.current.focus(), L());
      }), i(`已填入指令：${n.数据}`);
      return;
    }
    t("回调按钮需要真实用户点击才能触发，控制台无法模拟"), i("该按钮无法在控制台触发");
  };
  return u === "chat" && l ? /* @__PURE__ */ e("section", { style: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }, children: /* @__PURE__ */ e("div", { className: "im-shell im-shell-page", children: /* @__PURE__ */ r("div", { className: "im-pane im-pane-full", children: [
    /* @__PURE__ */ r("div", { className: "im-pane-head", children: [
      /* @__PURE__ */ e("button", { type: "button", className: "im-back", onClick: Pe, "aria-label": "返回列表", children: "← 返回" }),
      /* @__PURE__ */ r("div", { style: { minWidth: 0, flex: 1 }, children: [
        /* @__PURE__ */ r("div", { className: "im-pane-title", children: [
          Ye,
          l.msgCount ? ` (${l.msgCount})` : ""
        ] }),
        /* @__PURE__ */ e("div", { className: "im-pane-sub", children: l.id })
      ] }),
      /* @__PURE__ */ r("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
        /* @__PURE__ */ e("span", { className: `im-pane-type ${l.scope}`, children: l.scope === "group" ? "群聊" : "私聊" }),
        /* @__PURE__ */ e(
          "button",
          {
            type: "button",
            className: `im-pin-btn${l.pinned ? " on" : ""}`,
            title: l.pinned ? "取消星标" : "星标置顶",
            "aria-label": l.pinned ? "取消星标" : "星标置顶",
            onClick: () => void Me(l.key),
            children: l.pinned ? "★" : "☆"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ r("div", { className: "im-messages", ref: de, children: [
      R && !h.length ? /* @__PURE__ */ e("div", { className: "im-empty", children: "加载中…" }) : null,
      !R && !h.length ? /* @__PURE__ */ e("div", { className: "im-empty", children: "该会话暂无消息" }) : null,
      h.map((n, d) => {
        const b = n.direction === "out", v = !b && !!n.userId && n.userId !== "bot" && n.userId !== "unknown", T = !!String(n.msgId || "").trim(), D = he > 0 && !!n.msgId && Z.current?.msgId === n.msgId;
        let j = 预处理指令标签(String(n.content || ""));
        j = j.replace(/\[按钮\]\s*([^\n\]]+)/g, "`$1`");
        const 键盘行 = 渲染设置.按钮可点击 ? 解析键盘(n.keyboard) : [], { html: U, isMd: A } = 渲染设置.Markdown渲染 ? Qe(j) : { html: B(j.replace(/\[([^\]]+)\]\(mqqapi:[^)]+\)/gi, "$1").replace(/([^\s()[\]{}]{1,24})\(mqqapi:[^)]+\)/gi, "$1")).replace(/\n/g, "<br>"), isMd: !1 };
        return /* @__PURE__ */ r("div", { className: `im-msg${b ? " out" : ""}`, children: [
          /* @__PURE__ */ e(
            "img",
            {
              src: n.userAvatar || "",
              alt: "",
              className: v ? "im-avatar-at" : void 0,
              title: v ? `点击艾特 ${n.userName || P(n.userId || "")}` : void 0,
              onClick: () => {
                v && qe(n);
              },
              onError: (S) => {
                S.target.style.visibility = "hidden";
              }
            }
          ),
          /* @__PURE__ */ r("div", { className: "im-msg-body", children: [
            /* @__PURE__ */ r("div", { className: "im-msg-head", children: [
              /* @__PURE__ */ e("span", { className: "im-msg-name", children: n.userName || P(n.userId || "") }),
              /* @__PURE__ */ e("span", { className: "im-msg-time", children: Ge(n.ts, n.time) })
            ] }),
            /* @__PURE__ */ e(
              "div",
              {
                className: `im-bubble${A ? " md" : ""}${T ? " recallable" : ""}${D ? " holding" : ""}`,
                style: D ? { "--hold": String(he) } : void 0,
                title: T ? "长按 3 秒可撤回 · 点击图片可放大" : "点击图片可放大",
                onPointerDown: (S) => Be(S, n),
                onPointerUp: ge,
                onPointerLeave: ge,
                onPointerCancel: ge,
                onContextMenu: (S) => {
                  T && S.preventDefault();
                },
                onClick: (S) => {
                  if (fe.current) {
                    fe.current = !1;
                    return;
                  }
                  const _ = S.target;
                  if (_ && _.tagName === "IMG") {
                    const ie = _.currentSrc || _.src;
                    ie && K(ie);
                    return;
                  }
                  const 命令 = _ && _.dataset ? String(_.dataset.cmd || "").trim() : "";
                  命令 && (g(命令), requestAnimationFrame(() => {
                    J.current && (J.current.focus(), L());
                  }), i(`已填入指令：${命令}`));
                },
                dangerouslySetInnerHTML: { __html: U }
              }
            ),
            键盘行.length ? /* @__PURE__ */ r("div", {
              style: { display: "flex", flexDirection: "column", gap: 6, marginTop: 8, alignItems: b ? "flex-end" : "flex-start" },
              children: 键盘行.map((行2, 行i) => /* @__PURE__ */ r("div", {
                style: { display: "flex", flexWrap: "wrap", gap: 6, justifyContent: b ? "flex-end" : "flex-start" },
                children: 行2.map((钮2, 钮i) => /* @__PURE__ */ e("button", {
                  type: "button",
                  className: "im-kb-btn",
                  style: {
                    border: "1px solid rgba(14,116,144,.35)",
                    background: "rgba(14,116,144,.10)",
                    color: "#0b6bcb",
                    font: "inherit",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "5px 12px",
                    borderRadius: 8,
                    cursor: 钮2.可点 ? "pointer" : "not-allowed",
                    opacity: 钮2.可点 ? 1 : .55
                  },
                  title: 钮2.类型 === 2 ? `点击填入指令：${钮2.数据}` : 钮2.类型 === 0 ? `打开链接：${钮2.数据}` : "回调按钮需要真实用户点击，控制台无法模拟",
                  onClick: () => 点按钮(钮2),
                  children: 钮2.文字
                }, `${行i}-${钮i}`))
              }, 行i))
            }) : null
          ] })
        ] }, d);
      }),
      /* @__PURE__ */ e("div", { ref: ke, "aria-hidden": !0, className: "im-scroll-anchor" })
    ] }),
    /* @__PURE__ */ r("div", { className: "im-dock", children: [
      /* @__PURE__ */ r("div", {
        style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 14px 0" },
        children: [
          /* @__PURE__ */ r("div", { className: "seg", role: "group", "aria-label": "发送格式", children: [
            /* @__PURE__ */ e("button", { type: "button", className: I ? "" : "active", "aria-pressed": !I, disabled: C, onClick: () => Ce(!1), children: "文本" }),
            /* @__PURE__ */ e("button", { type: "button", className: I ? "active" : "", "aria-pressed": I, disabled: C, onClick: () => Ce(!0), children: "Markdown" })
          ] }),
          /* @__PURE__ */ r("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
            /* @__PURE__ */ e("button", {
              type: "button",
              className: `btn ${按钮开 ? "btn-solid" : "btn-ghost"}`,
              style: { padding: "6px 10px", fontSize: 12 },
              disabled: C,
              title: "为这条消息添加内嵌按钮（仅 Markdown 消息生效）",
              onClick: () => 设按钮开(!按钮开),
              children: "按钮"
            }),
            /* @__PURE__ */ e("input", {
              ref: 图片输入,
              type: "file",
              accept: "image/*",
              style: { display: "none" },
              onChange: (n) => {
                const f2 = n.target.files && n.target.files[0];
                n.target.value = "", void 发附件(f2, "image");
              }
            }),
            /* @__PURE__ */ e("input", {
              ref: 文件输入,
              type: "file",
              style: { display: "none" },
              onChange: (n) => {
                const f2 = n.target.files && n.target.files[0];
                n.target.value = "", void 发附件(f2, "file");
              }
            }),
            /* @__PURE__ */ e("button", {
              type: "button",
              className: "btn btn-ghost",
              style: { padding: "6px 10px", fontSize: 12 },
              disabled: C,
              title: "发送图片（单张 ≤ 7MB，可配合输入框文字作为说明）",
              onClick: () => 图片输入.current && 图片输入.current.click(),
              children: "图片"
            }),
            /* @__PURE__ */ e("button", {
              type: "button",
              className: "btn btn-ghost",
              style: { padding: "6px 10px", fontSize: 12 },
              disabled: C,
              title: "发送任意文件（≤ 7MB，可配合输入框文字作为说明）",
              onClick: () => 文件输入.current && 文件输入.current.click(),
              children: "文件"
            })
          ] })
        ]
      }),
      按钮开 ? /* @__PURE__ */ r("div", {
        style: { padding: "8px 14px 0" },
        children: [
          /* @__PURE__ */ e("textarea", {
            rows: 2,
            value: 按钮草稿,
            placeholder: "每行一个按钮：文字|指令（例：签到|签到 / 帮助|帮助）",
            onChange: (n) => 设按钮草稿(n.target.value),
            style: {
              width: "100%",
              boxSizing: "border-box",
              resize: "vertical",
              minHeight: 48,
              maxHeight: 120,
              border: "1px solid rgba(255,255,255,.4)",
              borderRadius: 12,
              padding: "8px 10px",
              font: "inherit",
              fontSize: 12,
              lineHeight: 1.4,
              color: "#334155",
              background: "rgba(255,255,255,.2)",
              outline: "none"
            }
          }),
          /* @__PURE__ */ e("div", {
            style: { marginTop: 4, fontSize: 11, color: "#64748b" },
            children: "带按钮时这条消息按 Markdown 发送；最多 5 行、每行 3 个，文字超 10 字会截断"
          })
        ]
      }) : null,
      /* @__PURE__ */ r("div", { className: "im-compose", children: [
        /* @__PURE__ */ e(
          "textarea",
          {
            ref: J,
            rows: 1,
            placeholder: I ? l.scope === "group" ? "用 Markdown 发送到该群…" : "用 Markdown 私聊…" : l.scope === "group" ? "发送到该群…" : "发送私聊…",
            value: z,
            onChange: (n) => {
              g(n.target.value), L(n.target);
            },
            onInput: (n) => L(n.currentTarget),
            onKeyDown: (n) => {
              n.key === "Enter" && !n.shiftKey && !(n.nativeEvent && n.nativeEvent.isComposing) && (n.preventDefault(), void Le());
            }
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            type: "button",
            className: `btn-send${I ? " md-on" : ""}${z.trim() ? "" : " is-empty"}`,
            disabled: C || !z.trim(),
            title: I ? "以 Markdown 发送（Enter）" : "发送（Enter）",
            onClick: () => void Le(),
            children: C ? "…" : I ? "MD" : "发送"
          }
        )
      ] })
    ] }),
    W ? /* @__PURE__ */ e("div", { className: "im-send-cfg-mask", onClick: () => !V && G(null), children: /* @__PURE__ */ r("div", { className: "im-send-cfg", role: "dialog", "aria-label": "撤回消息", onClick: (n) => n.stopPropagation(), children: [
      /* @__PURE__ */ e("div", { className: "im-send-cfg-title", children: "撤回消息" }),
      /* @__PURE__ */ e("p", { className: "im-send-cfg-hint", children: "确认撤回这条消息吗？群内撤回用户消息需要机器人具备管理权限；自己发出的消息通常限 2 分钟内。" }),
      /* @__PURE__ */ e("div", { className: "im-recall-preview", children: String(W.content || "").slice(0, 120) || "(无内容)" }),
      /* @__PURE__ */ r("div", { className: "im-recall-actions", children: [
        /* @__PURE__ */ e(
          "button",
          {
            type: "button",
            className: "im-send-cfg-close ghost",
            disabled: V,
            onClick: () => G(null),
            children: "取消"
          }
        ),
        /* @__PURE__ */ e(
          "button",
          {
            type: "button",
            className: "im-send-cfg-close danger",
            disabled: V,
            onClick: () => void Ee(),
            children: V ? "撤回中…" : "确认撤回"
          }
        )
      ] })
    ] }) }) : null,
    xe ? /* @__PURE__ */ r(
      "div",
      {
        className: "im-lightbox",
        role: "dialog",
        "aria-label": "图片预览",
        onClick: () => K(""),
        onKeyDown: (n) => {
          n.key === "Escape" && K("");
        },
        children: [
          /* @__PURE__ */ e("button", { type: "button", className: "im-lightbox-close", onClick: () => K(""), children: "关闭" }),
          /* @__PURE__ */ e(
            "img",
            {
              src: xe,
              alt: "预览",
              onClick: (n) => n.stopPropagation()
            }
          )
        ]
      }
    ) : null
  ] }) }) }) : /* @__PURE__ */ e("section", { style: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }, children: /* @__PURE__ */ e("div", { className: "im-shell im-shell-page", children: /* @__PURE__ */ r("div", { className: "im-list-col im-list-full", children: [
    /* @__PURE__ */ e("div", { className: "im-list-head", children: /* @__PURE__ */ e(
      "input",
      {
        type: "search",
        placeholder: "搜索会话…",
        value: s,
        onChange: (n) => m(n.target.value),
        onKeyDown: (n) => {
          n.key === "Enter" && F();
        }
      }
    ) }),
    /* @__PURE__ */ e("div", { className: "im-tabs", role: "tablist", children: [
      ["all", "全部"],
      ["private", "私聊"],
      ["group", "群聊"]
    ].map(([n, d]) => /* @__PURE__ */ e(
      "button",
      {
        type: "button",
        role: "tab",
        "aria-selected": p === n,
        className: `im-tab${p === n ? " active" : ""}`,
        onClick: () => f(n),
        children: d
      },
      n
    )) }),
    /* @__PURE__ */ r("div", { className: "im-sessions", children: [
      Te.length ? null : /* @__PURE__ */ e("div", { className: "im-empty", children: "暂无会话" }),
      Te.map((n) => {
        const d = n.scope === "private" ? n.title || P(n.id) : n.title && n.title !== n.id ? n.title : P(n.id);
        return /* @__PURE__ */ r(
          "div",
          {
            className: `im-session${n.pinned ? " pinned" : ""}`,
            onClick: () => void Ae(n.scope, n.id, n),
            children: [
              /* @__PURE__ */ e("img", { src: n.avatar || "", alt: "", onError: (b) => {
                b.target.style.visibility = "hidden";
              } }),
              /* @__PURE__ */ r("div", { className: "im-session-body", children: [
                /* @__PURE__ */ r("div", { className: "im-session-top", children: [
                  /* @__PURE__ */ e("span", { className: `im-type ${n.scope}`, children: n.scope === "group" ? "群聊" : "私聊" }),
                  /* @__PURE__ */ e("span", { className: "im-session-title", title: d, children: d }),
                  /* @__PURE__ */ e(
                    "button",
                    {
                      type: "button",
                      className: `im-pin-btn${n.pinned ? " on" : ""}`,
                      title: n.pinned ? "取消星标" : "星标置顶",
                      "aria-label": n.pinned ? "取消星标" : "星标置顶",
                      onClick: (b) => {
                        b.stopPropagation(), Me(n.key);
                      },
                      children: n.pinned ? "★" : "☆"
                    }
                  )
                ] }),
                /* @__PURE__ */ r("div", { className: "im-session-bottom", children: [
                  /* @__PURE__ */ e("div", { className: "im-session-preview", children: n.lastContent || " " }),
                  /* @__PURE__ */ e("span", { className: "im-session-time", children: Ve(n.lastTs, n.lastTime) })
                ] })
              ] })
            ]
          },
          n.key
        );
      })
    ] })
  ] }) }) });
}
function an({
  api: a,
  toast: i,
  onError: t,
  默认密码: 用初始密码,
  初始密码: 初始密码值,
  on密码已改: 密码已改回调
}) {
  const [sh, 设sh] = k(null);
  const [设置, 设设置] = k({ Markdown渲染: !0, 按钮可点击: !0, 保留天数: 0 });
  const [存储, 设存储] = k(null);
  const [锁定, 设锁定] = k([]);
  const [密码表, 设密码表] = k({ 旧: "", 新: "", 确认: "" });
  const [密码错, 设密码错] = k("");
  const [忙, 设忙] = k("");
  const 轮询 = N(null);
  const 刷sh = H((g) => {
    设sh(g), !!(g.installing || g.phase === "running") && !轮询.current && (轮询.current = window.setInterval(async () => {
      try {
        const R = (await a.get("/sharp-deps/status")).data || {};
        设sh(R), !R.installing && R.phase !== "running" && (轮询.current && window.clearInterval(轮询.current), 轮询.current = null, i("Sharp 状态已更新"));
      } catch {
      }
    }, 2e3));
  }, [a, i]);
  const 刷新存储 = H(async () => {
    try {
      const R = await a.get("/storage");
      设存储(R.data || null);
    } catch {
    }
  }, [a]);
  const 刷新 = H(async () => {
    t("");
    try {
      const [shRes, 设Res, 存Res, 锁Res] = await Promise.all([
        a.get("/sharp-deps/status"),
        a.get("/settings"),
        a.get("/storage"),
        a.get("/auth/locks")
      ]);
      设设置(设Res.data || {}), 设存储(存Res.data || null), 设锁定(锁Res && 锁Res.data && 锁Res.data.list || []), 刷sh(shRes.data || {});
    } catch (g) {
      t(g instanceof Error ? g.message : String(g));
    }
  }, [a, 刷sh, t]);
  M(() => (刷新(), () => {
    轮询.current && window.clearInterval(轮询.current);
  }), [刷新]);
  const 切设置 = async (键, 值) => {
    try {
      const S = await a.post("/settings", { [键]: 值 });
      设设置(S.data || {}), i(S.message || (值 ? "已开启" : "已关闭"));
    } catch (S) {
      t(S instanceof Error ? S.message : String(S));
    }
  };
  const 存保留 = async (天数) => {
    const d = Math.max(0, Math.min(3650, Math.floor(Number(天数) || 0)));
    设忙("保留");
    try {
      const S = await a.post("/settings", { 保留天数: d });
      设设置(S.data || {}), i(d ? `已设为保留 ${d} 天` : "已设为永久保留"), await 刷新存储();
    } catch (S) {
      t(S instanceof Error ? S.message : String(S));
    } finally {
      设忙("");
    }
  };
  const 立即清理 = async () => {
    设忙("清理");
    try {
      const S = await a.post("/storage/clean", {});
      i(S.message || "已清理"), await 刷新();
    } catch (S) {
      t(S instanceof Error ? S.message : String(S));
    } finally {
      设忙("");
    }
  };
  const 解除 = async (ip) => {
    设忙(`解锁:${ip}`);
    try {
      const S = await a.post("/auth/unlock", { ip });
      设锁定(S.data && S.data.list || []), i(S.message || "已解除");
    } catch (S) {
      t(S instanceof Error ? S.message : String(S));
    } finally {
      设忙("");
    }
  };
  const 改密码 = async () => {
    设密码错("");
    if (密码表.新 !== 密码表.确认) {
      设密码错("两次输入的新密码不一致");
      return;
    }
    设忙("密码");
    try {
      const S = await a.post("/auth/password", { oldPassword: 密码表.旧, newPassword: 密码表.新 });
      S.data && S.data.token && 存令牌(S.data.token);
      设密码表({ 旧: "", 新: "", 确认: "" }), i(S.message || "密码已修改");
      typeof 密码已改回调 == "function" && 密码已改回调();
    } catch (S) {
      const d = S instanceof Error ? S.message : String(S);
      设密码错(d), t(d);
    } finally {
      设忙("");
    }
  };
  const 安装 = async () => {
    try {
      const S = await a.post("/sharp-deps/install", {});
      i(S.message || "已开始安装"), 刷sh(S.data || { phase: "running", installing: !0, percent: 8 }), await 刷新();
    } catch (S) {
      i(S instanceof Error ? S.message : String(S));
    }
  };
  const 规则 = [
    ["至少 8 位", 密码表.新.length >= 8],
    ["含大写字母", /[A-Z]/.test(密码表.新)],
    ["含小写字母", /[a-z]/.test(密码表.新)],
    ["含阿拉伯数字", /[0-9]/.test(密码表.新)],
    ["含特殊符号", /[^A-Za-z0-9]/.test(密码表.新) && !/\s/.test(密码表.新)]
  ];
  const 规则全过 = 规则.every(([, g]) => g);
  const 可提交 = 规则全过 && 密码表.旧 && 密码表.新 === 密码表.确认 && 忙 !== "密码";
  const l = String(sh && sh.phase || ""), $ = !!(sh && sh.available), h = l === "running" ? "run" : $ ? "ok" : l === "failed" ? "fail" : "", w = l === "running" ? "安装中" : $ ? "可用" : l === "failed" ? "失败" : "未安装", z = !!(sh && (sh.installing || l === "running"));
  const 兆 = (n) => {
    const b = Number(n) || 0;
    return b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : b >= 1024 ? `${(b / 1024).toFixed(0)} KB` : `${b} B`;
  };
  return /* @__PURE__ */ r("section", { children: [
    /* @__PURE__ */ e("h1", { className: "page-title", children: "系统设置" }),
    用初始密码 ? /* @__PURE__ */ r("div", { className: "panel kzt-danger-panel", style: { marginBottom: 12 }, children: [
      /* @__PURE__ */ e("h3", { style: { marginTop: 0 }, children: "仍在使用初始密码" }),
      /* @__PURE__ */ r("p", { className: "setting-desc", style: { marginBottom: 0 }, children: [
        初始密码值 ? /* @__PURE__ */ r(Ue, { children: [
          "当前初始密码 ",
          /* @__PURE__ */ e("code", { className: "kzt-warn-code", children: 初始密码值 }),
          " 是公开的。"
        ] }) : "初始密码是公开的。",
        "任何能打开这个地址的人都能看到全部聊天记录并冒充机器人发消息。请在下方「登录与安全」里改掉它。"
      ] })
    ] }) : null,
    /* @__PURE__ */ r("div", { className: "panel", style: { marginBottom: 12 }, children: [
      /* @__PURE__ */ r("div", { className: "row", style: { marginTop: 0, justifyContent: "space-between" }, children: [
        /* @__PURE__ */ e("h3", { style: { margin: 0 }, children: "消息渲染" }),
        /* @__PURE__ */ e("span", { className: `badge${设置.Markdown渲染 || 设置.按钮可点击 ? " run" : ""}`, children: 设置.Markdown渲染 || 设置.按钮可点击 ? "已开启" : "关闭" })
      ] }),
      /* @__PURE__ */ e("p", { className: "setting-desc", children: "开启后，「查看消息」里的 Markdown 按 QQ 的排版渲染：标题、列表、引用、表格、图片、分割线，消息里的指令按钮还原成可点击的蓝色按钮。默认开启。" }),
      /* @__PURE__ */ r("div", { className: "switch-row", children: [
        /* @__PURE__ */ r("div", { children: [
          /* @__PURE__ */ e("div", { className: "label", children: "实时渲染 Markdown" }),
          /* @__PURE__ */ e("div", { className: "hint", children: "所有带 Markdown 语法的消息都按排版显示，换行保持原样" })
        ] }),
        /* @__PURE__ */ e("button", {
          type: "button",
          className: `switch${设置.Markdown渲染 ? " on" : ""}`,
          "aria-pressed": !!设置.Markdown渲染,
          onClick: () => void 切设置("Markdown渲染", !设置.Markdown渲染)
        })
      ] }),
      /* @__PURE__ */ r("div", { className: "switch-row", children: [
        /* @__PURE__ */ r("div", { children: [
          /* @__PURE__ */ e("div", { className: "label", children: "内嵌按钮可点击" }),
          /* @__PURE__ */ e("div", { className: "hint", children: "指令按钮点击后填入输入框，链接按钮直接打开；正文里的蓝色指令文字始终可点" })
        ] }),
        /* @__PURE__ */ e("button", {
          type: "button",
          className: `switch${设置.按钮可点击 ? " on" : ""}`,
          "aria-pressed": !!设置.按钮可点击,
          onClick: () => void 切设置("按钮可点击", !设置.按钮可点击)
        })
      ] })
    ] }),
    /* @__PURE__ */ r("div", { className: "panel", style: { marginBottom: 12 }, children: [
      /* @__PURE__ */ r("div", { className: "row", style: { marginTop: 0, justifyContent: "space-between" }, children: [
        /* @__PURE__ */ e("h3", { style: { margin: 0 }, children: "消息记录保留" }),
        /* @__PURE__ */ e("span", { className: "badge", children: Number(设置.保留天数) > 0 ? `保留 ${设置.保留天数} 天` : "永久保留" })
      ] }),
      /* @__PURE__ */ e("p", { className: "setting-desc", children: "默认永久保留。设置天数后，超出范围的日志文件会在写入新消息时自动删除（每小时最多清理一次），也可以在下面手动清理。" }),
      /* @__PURE__ */ r("div", { className: "switch-row", children: [
        /* @__PURE__ */ r("div", { children: [
          /* @__PURE__ */ e("div", { className: "label", children: "保留时长" }),
          /* @__PURE__ */ e("div", { className: "hint", children: "「保留 7 天」= 只留今天在内最近 7 个自然日" })
        ] }),
        /* @__PURE__ */ e(
          "select",
          {
            className: "kzt-select",
            value: [0, 7, 30, 90, 180, 365].includes(Number(设置.保留天数)) ? String(Number(设置.保留天数) || 0) : "custom",
            disabled: 忙 === "保留",
            onChange: (g) => {
              g.target.value !== "custom" && void 存保留(Number(g.target.value));
            },
            children: [
              /* @__PURE__ */ e("option", { value: "0", children: "永久保留（默认）" }),
              /* @__PURE__ */ e("option", { value: "7", children: "7 天" }),
              /* @__PURE__ */ e("option", { value: "30", children: "30 天" }),
              /* @__PURE__ */ e("option", { value: "90", children: "90 天" }),
              /* @__PURE__ */ e("option", { value: "180", children: "180 天" }),
              /* @__PURE__ */ e("option", { value: "365", children: "365 天" }),
              /* @__PURE__ */ e("option", { value: "custom", children: "自定义…" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ r("div", { className: "row", style: { alignItems: "center" }, children: [
        /* @__PURE__ */ e("input", {
          type: "number",
          min: 0,
          max: 3650,
          placeholder: "自定义天数（0 = 永久）",
          className: "kzt-num",
          defaultValue: Number(设置.保留天数) || 0,
          disabled: 忙 === "保留",
          onKeyDown: (g) => {
            g.key === "Enter" && void 存保留(g.currentTarget.value);
          }
        }),
        /* @__PURE__ */ e("button", { type: "button", className: "btn btn-secondary", disabled: 忙 === "保留", onClick: (g) => void 存保留(g.currentTarget.parentElement.querySelector("input").value), children: "保存天数" }),
        /* @__PURE__ */ e("button", { type: "button", className: "btn btn-ghost", disabled: 忙 === "清理", onClick: () => void 立即清理(), children: 忙 === "清理" ? "清理中…" : "立即清理过期记录" })
      ] }),
      /* @__PURE__ */ e("div", { className: "status", children: 存储 ? `现有 ${存储.文件数 || 0} 个日志文件 · 共 ${兆(存储.字节)}${存储.最早 ? ` · 范围 ${存储.最早} ~ ${存储.最晚}` : ""}` : "统计中…" })
    ] }),
    /* @__PURE__ */ r("div", { className: "panel", style: { marginBottom: 12 }, children: [
      /* @__PURE__ */ r("div", { className: "row", style: { marginTop: 0, justifyContent: "space-between" }, children: [
        /* @__PURE__ */ e("h3", { style: { margin: 0 }, children: "登录与安全" }),
        /* @__PURE__ */ e("span", { className: `badge${用初始密码 ? " fail" : " run"}`, children: 用初始密码 ? "初始密码" : "已自定义" })
      ] }),
      /* @__PURE__ */ e("p", { className: "setting-desc", children: "新密码需同时包含大写字母、小写字母、阿拉伯数字和特殊符号，至少 8 位。修改后其他设备上的登录会立即失效。" }),
      /* @__PURE__ */ r("div", { className: "kzt-form", children: [
        /* @__PURE__ */ r("label", { children: [
          /* @__PURE__ */ e("span", { children: "当前密码" }),
          /* @__PURE__ */ e("input", {
            type: "password",
            autoComplete: "current-password",
            value: 密码表.旧,
            onChange: (g) => 设密码表((C) => ({ ...C, 旧: g.target.value }))
          })
        ] }),
        /* @__PURE__ */ r("label", { children: [
          /* @__PURE__ */ e("span", { children: "新密码" }),
          /* @__PURE__ */ e("input", {
            type: "password",
            autoComplete: "new-password",
            value: 密码表.新,
            onChange: (g) => 设密码表((C) => ({ ...C, 新: g.target.value }))
          })
        ] }),
        /* @__PURE__ */ r("label", { children: [
          /* @__PURE__ */ e("span", { children: "确认新密码" }),
          /* @__PURE__ */ e("input", {
            type: "password",
            autoComplete: "new-password",
            value: 密码表.确认,
            onChange: (g) => 设密码表((C) => ({ ...C, 确认: g.target.value }))
          })
        ] })
      ] }),
      /* @__PURE__ */ e("div", { className: "kzt-rules", children: 规则.map(([名, 过]) => /* @__PURE__ */ e("span", { className: 过 ? "ok" : "", children: `${过 ? "✓" : "○"} ${名}` }, 名)) }),
      密码错 ? /* @__PURE__ */ e("div", { className: "err", style: { marginTop: 8 }, children: 密码错 }) : null,
      /* @__PURE__ */ r("div", { className: "row", children: [
        /* @__PURE__ */ e("button", { type: "button", className: "btn btn-solid", disabled: !可提交, onClick: () => void 改密码(), children: 忙 === "密码" ? "提交中…" : "修改密码" })
      ] })
    ] }),
    /* @__PURE__ */ r("div", { className: "panel", style: { marginBottom: 12 }, children: [
      /* @__PURE__ */ r("div", { className: "row", style: { marginTop: 0, justifyContent: "space-between" }, children: [
        /* @__PURE__ */ e("h3", { style: { margin: 0 }, children: "登录锁定" }),
        /* @__PURE__ */ e("span", { className: `badge${锁定.some((g) => g.剩余毫秒 > 0) ? " fail" : ""}`, children: 锁定.length ? `${锁定.length} 个 IP 有记录` : "无" })
      ] }),
      /* @__PURE__ */ e("p", { className: "setting-desc", children: "同一 IP 连续 3 次密码错误自动锁定 24 小时，并写入 auth-security.log。这里可以手动解除。" }),
      锁定.length ? /* @__PURE__ */ e("div", { className: "kzt-locks", children: 锁定.map((g) => /* @__PURE__ */ r("div", { className: "kzt-lock-row", children: [
        /* @__PURE__ */ e("code", { children: g.ip }),
        /* @__PURE__ */ e("span", { className: "hint", children: g.剩余毫秒 > 0 ? `已锁定 · 剩余 ${Math.ceil(g.剩余毫秒 / 36e5)} 小时` : `失败 ${g.失败次数} 次 · 未锁定` }),
        /* @__PURE__ */ e("button", { type: "button", className: "btn btn-ghost", disabled: 忙 === `解锁:${g.ip}`, onClick: () => void 解除(g.ip), children: "解除" })
      ] }, g.ip)) }) : /* @__PURE__ */ e("div", { className: "status", children: "当前没有被锁定的 IP" }),
      锁定.length ? /* @__PURE__ */ r("div", { className: "row", children: [
        /* @__PURE__ */ e("button", { type: "button", className: "btn btn-secondary", disabled: 忙 === "解锁:*", onClick: () => void 解除("*"), children: "解除全部" }),
        /* @__PURE__ */ e("button", { type: "button", className: "btn btn-ghost", onClick: () => void 刷新(), children: "刷新" })
      ] }) : null
    ] }),
    /* @__PURE__ */ r("div", { className: "panel", children: [
      /* @__PURE__ */ r("div", { className: "row", style: { marginTop: 0, justifyContent: "space-between" }, children: [
        /* @__PURE__ */ e("h3", { style: { margin: 0 }, children: "Sharp 运行时依赖" }),
        /* @__PURE__ */ e("span", { className: `badge ${h}`, children: w })
      ] }),
      /* @__PURE__ */ e("div", { className: "status", children: String(sh && (sh.message || sh.detail) || "正在检测…") }),
      /* @__PURE__ */ e("div", { className: `progress${z ? " show" : ""}`, children: /* @__PURE__ */ e("i", { style: { width: `${Math.max(5, Number(sh && sh.percent) || 8)}%` } }) }),
      sh && sh.manualHint && (l === "failed" || !$) ? /* @__PURE__ */ e("pre", { className: "status", style: { marginTop: 10, fontSize: 11 }, children: String(sh.manualHint) }) : null,
      /* @__PURE__ */ r("div", { className: "row", children: [
        /* @__PURE__ */ e("button", { type: "button", className: "btn btn-solid", disabled: z || $, onClick: () => void 安装(), children: "安装 Sharp 依赖" }),
        /* @__PURE__ */ e("button", { type: "button", className: "btn btn-secondary", onClick: () => void 刷新(), children: "刷新状态" })
      ] })
    ] })
  ] });
}

const rn = '.kzt-admin{--ink: #0b1220;--surface: rgba(255, 255, 255, .2);--surface-strong: rgba(255, 255, 255, .3);--surface-soft: rgba(255, 255, 255, .1);--sidebar: rgba(255, 255, 255, .3);--text: #0f172a;--heading: #1e293b;--muted: #64748b;--accent: #0f766e;--accent-2: #0d9488;--accent-soft: rgba(15, 118, 110, .12);--ok: #059669;--warn: #b45309;--fail: #dc2626;--chip-group: rgba(224, 242, 254, .75);--chip-group-t: #0369a1;--chip-priv: rgba(255, 228, 230, .75);--chip-priv-t: #be123c;--radius: 16px;--radius-sm: 10px;--font: "Manrope", "PingFang SC", "Microsoft YaHei", sans-serif;--display: "Manrope", "PingFang SC", "Microsoft YaHei", sans-serif;--mono: ui-monospace, Consolas, monospace;--sidebar-w: 220px;--shadow: 0 8px 24px rgba(148, 163, 184, .18);--glass-blur: blur(16px);--safe-bottom: env(safe-area-inset-bottom, 0px);--mobile-nav-h: 4.25rem;box-sizing:border-box;display:flex;min-height:100%;height:100%;max-height:none;color:var(--text);font-family:var(--font);border-radius:0;overflow:hidden;background:radial-gradient(900px 520px at 8% -6%,rgba(45,212,191,.28),transparent 55%),radial-gradient(780px 480px at 96% 4%,rgba(56,189,248,.2),transparent 52%),radial-gradient(640px 420px at 70% 110%,rgba(165,243,252,.18),transparent 50%),linear-gradient(155deg,#e0f2fe,#ecfeff 42%,#e0f7f4)}.kzt-admin *,.kzt-admin *:before,.kzt-admin *:after{box-sizing:border-box}.kzt-admin *{scrollbar-width:none}.kzt-admin *::-webkit-scrollbar{display:none}.kzt-admin .sidebar{width:var(--sidebar-w);flex-shrink:0;display:flex;flex-direction:column;gap:4px;padding:18px 12px;color:var(--heading);background:#ffffff4d;backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);border-right:1px solid rgba(255,255,255,.4);overflow:auto}.kzt-admin .brand{font-family:var(--display);font-weight:800;font-size:1.35rem;padding:8px 10px 18px;line-height:1.1}.kzt-admin .brand .mark{background:linear-gradient(120deg,#0f766e 10%,#0d9488,#38bdf8);-webkit-background-clip:text;background-clip:text;color:transparent}.kzt-admin .brand small{display:block;margin-top:6px;font-size:10px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:#475569a6}.kzt-admin .nav-label{font-size:10px;color:#64748bd9;letter-spacing:.14em;text-transform:uppercase;padding:14px 10px 6px;font-weight:600}.kzt-admin .nav-item{display:flex;align-items:center;gap:8px;width:100%;padding:10px 12px;border-radius:12px;border:1px solid transparent;background:transparent;color:#334155d1;font:inherit;font-size:13px;font-weight:600;text-align:left;cursor:pointer;transition:.2s}.kzt-admin .nav-item:hover{background:#ffffff73;color:var(--heading)}.kzt-admin .nav-item.active{background:#14b8a633;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1px solid rgba(45,212,191,.4);color:#0f766e;font-weight:600;box-shadow:0 4px 14px #14b8a61f}.kzt-admin .main{flex:1;min-width:0;overflow:auto;padding:20px 22px 28px}.kzt-admin .page-title{margin:0 0 14px;font-family:var(--display);font-size:1.45rem;font-weight:800;color:var(--heading)}.kzt-admin .toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:14px}.kzt-admin .toolbar-glass{padding:12px;border-radius:12px;background:#fff3;border:1px solid rgba(255,255,255,.4);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 6px 18px #94a3b81f}.kzt-admin .toolbar label{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#1e293b;background:#ffffff38;border:1px solid rgba(255,255,255,.35);border-radius:10px;padding:6px 10px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}.kzt-admin .toolbar label input,.kzt-admin .toolbar label select{border:0;background:transparent;font:inherit;color:var(--text)}.kzt-admin .toolbar label input::placeholder{color:#94a3b8}.kzt-admin .btn{font:inherit;font-size:13px;font-weight:600;border-radius:var(--radius-sm);padding:9px 13px;cursor:pointer;transition:background .2s,border-color .2s,color .2s,transform .15s}.kzt-admin .btn-ghost{background:transparent;border:1px solid rgba(255,255,255,.55);color:#0f766e;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}.kzt-admin .btn-ghost:hover{background:#ffffff59;border-color:#fffc;color:#0d9488}.kzt-admin .btn-solid{background:linear-gradient(135deg,var(--accent),var(--accent-2));color:#fff;border:0;box-shadow:0 8px 20px #0f766e47}.kzt-admin .btn-solid:disabled{opacity:.5;cursor:not-allowed}.kzt-admin .btn-secondary{background:#fff3;border:1px solid rgba(255,255,255,.4);color:var(--text)}.kzt-admin .seg{display:inline-flex;border:1px solid rgba(255,255,255,.4);border-radius:var(--radius-sm);overflow:hidden;background:#fff3}.kzt-admin .seg button{border:0;background:transparent;padding:9px 13px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;color:var(--text)}.kzt-admin .seg button.active{background:#0f766e38;color:var(--accent-2)}.kzt-admin .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:14px}.kzt-admin .stat-card,.kzt-admin .panel{background:#fff3;border:1px solid rgba(255,255,255,.4);border-radius:1rem;padding:16px;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 10px 28px #94a3b82e;transition:background .25s,transform .25s,box-shadow .25s}.kzt-admin .stat-card{background:#ffffff47;display:flex;flex-direction:column;gap:4px}.kzt-admin .stat-card:hover{background:#ffffff5c;transform:translateY(-2px);box-shadow:0 14px 32px #94a3b83d}.kzt-admin .stat-card .label{color:#475569;font-size:13px;font-weight:600;letter-spacing:0;text-transform:none;margin-bottom:2px}.kzt-admin .stat-card .value{font-family:var(--display);font-size:1.5rem;font-weight:800;color:#0d9488;font-variant-numeric:tabular-nums;line-height:1.2}.kzt-admin .stat-card .hint{color:#94a3b8;font-size:12px;margin-top:2px}.kzt-admin .bot-row{display:flex;align-items:center;gap:10px;margin-top:2px}.kzt-admin .bot-row img{width:40px;height:40px;border-radius:12px;object-fit:cover;background:#e2e8f08c;flex-shrink:0}.kzt-admin .bot-meta{flex:1;min-width:0}.kzt-admin .bot-name{font-family:var(--display);font-size:1.25rem;font-weight:800;color:var(--heading);line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kzt-admin .bot-sub{margin-top:4px;font-size:11px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kzt-admin .status-pill{flex-shrink:0;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#4ade8033;color:#16a34a}.kzt-admin .status-pill.off{background:#94a3b840;color:#64748b}.kzt-admin .panel{background:#fff3}.kzt-admin .ranks-panel{min-height:280px}.kzt-admin .panel h3{margin:0 0 12px;font-family:var(--display);font-size:1.02rem;font-weight:700;color:#1e293b}.kzt-admin .split{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;align-items:stretch}.kzt-admin .split>.panel{display:flex;flex-direction:column;min-height:160px}.kzt-admin .ranks-split>.panel{min-height:280px}.kzt-admin .rank-list{list-style:none;margin:0;padding:0;flex:1;display:flex;flex-direction:column;gap:8px}.kzt-admin .rank-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:12px;border:1px solid transparent;background:#ffffff14;cursor:default;transition:background .2s,border-color .2s}.kzt-admin .rank-row:hover{background:#ffffff38;border-color:#ffffff52}.kzt-admin .rank-row-main{display:flex;align-items:center;gap:12px;flex:1;min-width:0;overflow:hidden}.kzt-admin .rank-idx{width:24px;height:24px;border-radius:999px;background:#ffffff4d;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.4);color:#64748b;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:var(--mono);flex-shrink:0}.kzt-admin .rank-list img,.kzt-admin .rank-row img{width:40px;height:40px;border-radius:999px;object-fit:cover;flex-shrink:0;background:#ffffff1f;border:1px solid rgba(255,255,255,.22)}.kzt-admin .rank-name{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.kzt-admin .rank-nick{display:block;font-size:13px;font-weight:600;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}.kzt-admin .rank-id{display:block;color:#94a3b8;font-size:10px;font-family:var(--mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}.kzt-admin .rank-count{flex-shrink:0;font-weight:700;font-size:13px;color:#0f766e;font-family:var(--display);padding:2px 12px;border-radius:8px;background:#14b8a633;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1px solid rgba(45,212,191,.3);box-shadow:0 2px 8px #14b8a614}.kzt-admin .empty{margin:auto;color:#94a3b8;font-size:13px;text-align:center;background:transparent;border:0;padding:28px 16px;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}.kzt-admin .rank-empty{flex:1;min-height:160px;margin:4px 0 0;background:#ffffff1a;border:1px solid rgba(255,255,255,.2);border-radius:12px;color:#94a3b8}.kzt-admin .empty-icon{width:40px;height:40px;border-radius:12px;border:1.5px dashed rgba(148,163,184,.45);background:#94a3b814}.kzt-admin .err{color:var(--fail);font-size:13px;margin-top:8px;font-weight:600}.kzt-admin .chart-wrap{border-radius:14px;padding:12px 10px 8px;background:#0f172a0d;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.25)}.kzt-admin .chart-body{display:grid;grid-template-columns:36px 1fr;gap:8px}.kzt-admin .chart-y{display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end;height:180px;font-size:11px;color:#94a3b8;font-variant-numeric:tabular-nums}.kzt-admin .chart-plot{height:180px;border-left:1px solid rgba(15,23,42,.1);border-bottom:1px solid rgba(15,23,42,.1);border-radius:0 12px 0 0;background:transparent;overflow:hidden}.kzt-admin .chart-plot svg{display:block;width:100%;height:180px;filter:drop-shadow(0 0 6px rgba(0,200,150,.4))}.kzt-admin .chart-x{display:grid;grid-template-columns:repeat(24,minmax(0,1fr));margin:8px 0 0 44px;font-size:11px;color:#94a3b8}.kzt-admin .chart-x span{text-align:center}.kzt-admin .im-shell{flex:1;min-height:0;height:100%;display:flex;flex-direction:column;border-radius:1rem;overflow:hidden;border:1px solid rgba(255,255,255,.4);background:#ffffff1f;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 10px 32px #94a3b826}.kzt-admin .im-shell-page{min-height:0}.kzt-admin .im-list-col{display:flex;flex-direction:column;min-height:0;flex:1;background:#fff3;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}.kzt-admin .im-list-full,.kzt-admin .im-pane-full{flex:1;min-height:0;width:100%;position:relative}.kzt-admin .im-tabs{display:flex;gap:6px;padding:8px 10px 0}.kzt-admin .im-tab{flex:1;border:1px solid transparent;background:transparent;border-radius:999px;padding:7px 10px;font:inherit;font-size:12px;font-weight:600;color:#64748b;cursor:pointer;transition:.2s}.kzt-admin .im-tab:hover{background:#fff3;color:#334155}.kzt-admin .im-tab.active{background:#14b8a62e;border-color:#2dd4bf66;color:#0f766e;box-shadow:0 4px 12px #14b8a61a}.kzt-admin .im-back{flex-shrink:0;border:1px solid rgba(255,255,255,.4);background:#ffffff38;backdrop-filter:blur(6px);border-radius:10px;padding:7px 12px;font:inherit;font-size:13px;font-weight:600;color:#0f766e;cursor:pointer;transition:background .15s,transform .15s}.kzt-admin .im-back:hover{background:#ffffff61;transform:translate(-1px)}.kzt-admin .im-list-head{display:flex;gap:8px;padding:10px;border-bottom:1px solid rgba(255,255,255,.25);background:#ffffff14}.kzt-admin .im-list-head input{flex:1;min-width:0;border:1px solid rgba(255,255,255,.4);background:#fff3;backdrop-filter:blur(6px);border-radius:12px;padding:8px 10px;font:inherit;font-size:13px;color:#334155}.kzt-admin .im-list-head input::placeholder{color:#94a3b8}.kzt-admin .im-sessions{flex:1;overflow:auto;min-height:0;padding:10px;display:flex;flex-direction:column;gap:10px}.kzt-admin .im-session{display:grid;grid-template-columns:44px 1fr;gap:10px;align-items:center;padding:12px;cursor:pointer;border-radius:14px;border:1px solid rgba(255,255,255,.42);background:#ffffff2e;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 4px 14px #94a3b81a;transition:background .2s,border-color .2s,box-shadow .2s}.kzt-admin .im-session:hover{background:#ffffff47;border-color:#ffffff94;box-shadow:0 8px 20px #94a3b829}.kzt-admin .im-session.active{background:#ffffff42;border-color:#2dd4bf73;box-shadow:0 6px 18px #14b8a61f}.kzt-admin .im-session.pinned{border-color:#2dd4bf80;background:#ffffff38;box-shadow:inset 3px 0 #0d9488a6,0 4px 14px #94a3b81a}.kzt-admin .im-session img{width:44px;height:44px;border-radius:14px;object-fit:cover;background:#e2e8f08c;border:1px solid rgba(255,255,255,.35)}.kzt-admin .im-session-body{min-width:0;display:flex;flex-direction:column;gap:4px}.kzt-admin .im-session-top{display:flex;align-items:center;gap:6px;min-width:0}.kzt-admin .im-session-title{flex:1;min-width:0;font-size:13px;font-weight:700;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kzt-admin .im-session-bottom{display:flex;align-items:center;gap:8px;min-width:0}.kzt-admin .im-session-preview{flex:1;min-width:0;margin-top:0;font-size:12px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kzt-admin .im-session-meta{display:none}.kzt-admin .im-type,.kzt-admin .im-pane-type{flex-shrink:0;font-size:10px;font-weight:800;padding:2px 7px;border-radius:999px;border:1px solid transparent;letter-spacing:.02em}.kzt-admin .im-type.group,.kzt-admin .im-pane-type.group{background:#bae6fdbf;border-color:#38bdf859;color:#0369a1}.kzt-admin .im-type.private,.kzt-admin .im-pane-type.private{background:#fecdd3bf;border-color:#fb718559;color:#be123c}.kzt-admin .im-pane-type.idle{background:#ffffff38;color:#64748b;border:1px solid rgba(255,255,255,.3)}.kzt-admin .im-session-time{flex-shrink:0;font-size:11px;color:#94a3b8}.kzt-admin .im-pin-btn{flex-shrink:0;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.45);background:#ffffff47;border-radius:9px;padding:0;cursor:pointer;font-size:14px;line-height:1;color:#94a3b8;backdrop-filter:blur(4px);transition:background .15s,color .15s,border-color .15s}.kzt-admin .im-pin-btn:hover{background:#ffffff6b;color:#0d9488}.kzt-admin .im-pin-btn.on{color:#0d9488;background:#0d948829;border-color:#2dd4bf73}.kzt-admin .im-pane{display:flex;flex-direction:column;min-width:0;min-height:0;flex:1;background:#fff3;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}.kzt-admin .im-pane-head{min-height:56px;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid rgba(255,255,255,.3);background:#ffffff1f;backdrop-filter:blur(10px)}.kzt-admin .im-pane-title{font-weight:700;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kzt-admin .im-pane-sub{font-size:12px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kzt-admin .im-messages{flex:1;min-height:0;overflow:auto;padding:16px 18px;display:flex;flex-direction:column;gap:14px;background:transparent}.kzt-admin .im-empty{margin:auto;padding:12px 20px;color:#94a3b8;font-size:13px;text-align:center;background:#ffffff26;border:1px solid rgba(255,255,255,.25);border-radius:12px;backdrop-filter:blur(6px)}.kzt-admin .im-msg{display:grid;grid-template-columns:36px 1fr;gap:10px;max-width:78%;align-self:flex-start}.kzt-admin .im-msg.out{grid-template-columns:1fr 36px;align-self:flex-end}.kzt-admin .im-msg img{width:36px;height:36px;border-radius:999px;object-fit:cover;background:#e2e8f08c}.kzt-admin .im-msg img.im-avatar-at{cursor:pointer;transition:box-shadow .15s,transform .15s}.kzt-admin .im-msg img.im-avatar-at:hover{transform:scale(1.06);box-shadow:0 0 0 2px #14b8a68c}.kzt-admin .im-msg.out img{order:2}.kzt-admin .im-msg.out .im-msg-body{order:1;text-align:right}.kzt-admin .im-msg-head{display:flex;gap:8px;flex-wrap:wrap;align-items:baseline;margin-bottom:4px}.kzt-admin .im-msg.out .im-msg-head{justify-content:flex-end}.kzt-admin .im-msg-name{font-size:13px;font-weight:600;color:#475569}.kzt-admin .im-msg-time{font-size:10px;color:#94a3b8}.kzt-admin .im-bubble{margin-top:0;display:inline-block;max-width:100%;background:#ffffff4d;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.5);border-radius:1rem;border-top-left-radius:4px;padding:10px 14px;font-size:13px;line-height:1.55;text-align:left;color:#1e293b;overflow-wrap:anywhere;word-break:break-word;box-shadow:0 4px 14px #94a3b81f;position:relative;overflow:hidden;user-select:none;touch-action:manipulation}.kzt-admin .im-bubble.recallable{cursor:pointer}.kzt-admin .im-bubble.holding:after{content:"";position:absolute;left:0;bottom:0;height:3px;width:calc(var(--hold, 0) * 100%);background:#14b8a6f2;pointer-events:none}.kzt-admin .im-msg.out .im-bubble{background:#14b8a6cc;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.3);border-radius:1rem;border-top-right-radius:4px;color:#fff;box-shadow:0 10px 24px #14b8a638}.kzt-admin .im-bubble.md p{margin:0 0 .5em}.kzt-admin .im-bubble.md p:last-child{margin-bottom:0}.kzt-admin .im-bubble.md img,.kzt-admin .im-bubble img.im-zoom-img{max-width:min(100%,720px);width:auto;height:auto;max-height:min(70vh,960px);border-radius:10px;display:block;margin:.4em 0;cursor:zoom-in;object-fit:contain;background:#0f172a0a}.kzt-admin .im-bubble.md code,.kzt-admin .im-btn-chip{display:inline-block;margin:2px 0;padding:6px 12px;border-radius:8px;background:#fff3;border:1px solid rgba(255,255,255,.3);color:#334155;font-family:inherit;font-size:12px;font-weight:600;transition:background .15s}.kzt-admin .im-msg.out .im-bubble.md code,.kzt-admin .im-msg.out .im-btn-chip{background:#ffffff2e;border-color:#ffffff47;color:#fff}.kzt-admin .im-dock{border-top:1px solid rgba(255,255,255,.3);background:#ffffff1a;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.kzt-admin .im-compose{border-top:0;padding:12px 14px;display:flex;flex-direction:row;gap:12px;align-items:flex-end;background:transparent}.kzt-admin .im-compose textarea{flex:1 1 0;min-width:0;width:auto;height:48px;min-height:48px;max-height:120px;resize:none;border:1px solid rgba(255,255,255,.4);border-radius:12px;padding:13px 12px;font:inherit;font-size:13px;line-height:1.4;color:#334155;background:#fff3;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);outline:none;transition:background .2s,box-shadow .2s;overflow-y:auto;box-sizing:border-box}.kzt-admin .im-compose textarea::placeholder{color:#94a3b8}.kzt-admin .im-compose textarea:focus{background:#ffffff4d;box-shadow:0 0 0 2px #14b8a647}.kzt-admin .im-compose textarea:disabled{opacity:.55}.kzt-admin .im-compose .btn-send{flex:0 0 auto;flex-shrink:0;align-self:flex-end;position:relative;width:auto;max-width:5.5rem;height:48px;min-height:48px;min-width:4.5rem;padding:0 18px;border-radius:12px;border:1px solid rgba(255,255,255,.3);background:#14b8a6cc;backdrop-filter:blur(6px);color:#fff;font:inherit;font-size:13px;font-weight:700;line-height:1;cursor:pointer;user-select:none;touch-action:none;box-shadow:0 10px 24px #14b8a638;transition:background .2s,transform .15s,opacity .15s;overflow:hidden}.kzt-admin .im-compose .btn-send.md-on{background:#0e7490e0;box-shadow:0 10px 24px #0e749040}.kzt-admin .im-compose .btn-send.is-empty:not(.holding):not(:disabled){opacity:.55}.kzt-admin .im-compose .btn-send.holding{transform:scale(.97)}.kzt-admin .im-compose .btn-send.holding:after{content:"";position:absolute;left:0;bottom:0;height:3px;width:calc(var(--hold, 0) * 100%);background:#fffffff2;pointer-events:none}.kzt-admin .im-compose .btn-send:hover:not(:disabled){background:#14b8a6;transform:translateY(-1px)}.kzt-admin .im-compose .btn-send.md-on:hover:not(:disabled){background:#0e7490}.kzt-admin .im-compose .btn-send:disabled{opacity:.5;cursor:not-allowed;transform:none}.kzt-admin .im-send-cfg-mask{position:absolute;inset:0;z-index:40;display:flex;align-items:flex-end;justify-content:center;padding:16px;background:#0f172a47;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}.kzt-admin .im-send-cfg{width:min(360px,100%);border-radius:16px;border:1px solid rgba(255,255,255,.45);background:#ffffffd1;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 18px 40px #0f172a2e;padding:16px 16px 14px;margin-bottom:8px}.kzt-admin .im-send-cfg-title{font-size:15px;font-weight:800;color:#0f172a;margin-bottom:6px}.kzt-admin .im-send-cfg-hint{margin:0 0 12px;font-size:12px;line-height:1.45;color:#64748b}.kzt-admin .im-send-cfg-opt{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:12px;border:1px solid rgba(148,163,184,.35);background:#ffffff73;margin-bottom:8px;cursor:pointer;transition:border-color .15s,background .15s}.kzt-admin .im-send-cfg-opt.on{border-color:#14b8a68c;background:#14b8a61f}.kzt-admin .im-send-cfg-opt input{margin-top:3px;accent-color:#14b8a6}.kzt-admin .im-send-cfg-opt span{display:flex;flex-direction:column;gap:2px;min-width:0}.kzt-admin .im-send-cfg-opt strong{font-size:13px;color:#0f172a}.kzt-admin .im-send-cfg-opt em{font-style:normal;font-size:11px;color:#64748b}.kzt-admin .im-send-cfg-close{width:100%;margin-top:4px;height:40px;border-radius:11px;border:1px solid rgba(255,255,255,.35);background:#14b8a6d9;color:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer}.kzt-admin .im-send-cfg-close.ghost{background:#ffffff73;color:#334155;border-color:#94a3b859}.kzt-admin .im-send-cfg-close.danger{background:#dc2626d9;box-shadow:0 8px 18px #dc262633}.kzt-admin .im-send-cfg-close:disabled{opacity:.55;cursor:not-allowed}.kzt-admin .im-recall-preview{margin:0 0 12px;padding:10px 12px;border-radius:10px;background:#0f172a0f;border:1px solid rgba(148,163,184,.28);font-size:12px;line-height:1.45;color:#475569;white-space:pre-wrap;word-break:break-word;max-height:96px;overflow:auto}.kzt-admin .im-recall-actions{display:flex;gap:8px}.kzt-admin .im-recall-actions .im-send-cfg-close{flex:1;margin-top:0}.kzt-admin .im-lightbox{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:16px;background:#020617c7;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);cursor:zoom-out}.kzt-admin .im-lightbox img{max-width:min(96vw,1400px);max-height:92vh;width:auto;height:auto;object-fit:contain;border-radius:12px;box-shadow:0 24px 64px #00000073;background:#0b1220;cursor:default}.kzt-admin .im-lightbox-close{position:absolute;top:max(12px,env(safe-area-inset-top,0px));right:max(12px,env(safe-area-inset-right,0px));height:40px;min-width:40px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:#ffffff24;color:#fff;font:inherit;font-size:14px;font-weight:700;cursor:pointer}.kzt-admin .im-scroll-anchor{width:100%;height:1px;flex-shrink:0}.kzt-admin .mobile-tabbar{display:none}.kzt-admin .log-table{width:100%;border-collapse:collapse;font-size:13px}.kzt-admin .log-table th,.kzt-admin .log-table td{text-align:left;padding:10px 8px;border-bottom:1px solid rgba(15,23,42,.06);vertical-align:top}.kzt-admin .log-table th{color:var(--muted);font-size:12px;font-weight:700}.kzt-admin .chip{display:inline-block;padding:2px 7px;border-radius:6px;font-size:11px;font-weight:700}.kzt-admin .chip.group{background:var(--chip-group);color:var(--chip-group-t)}.kzt-admin .chip.private{background:var(--chip-priv);color:var(--chip-priv-t)}.kzt-admin .mono{font-family:var(--mono);font-size:12px;color:var(--muted)}.kzt-admin .content-cell{max-width:420px;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}.kzt-admin .pager{display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:10px;font-size:13px;color:var(--muted)}.kzt-admin .pager button{font:inherit;font-size:13px;font-weight:600;border:1px solid rgba(255,255,255,.4);background:#fff3;border-radius:var(--radius-sm);padding:7px 11px;cursor:pointer}.kzt-admin .pager button:disabled{opacity:.45;cursor:not-allowed}.kzt-admin .badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:8px;font-size:12px;font-weight:700;background:var(--accent-soft);color:var(--accent-2)}.kzt-admin .badge.ok{background:#0596691f;color:var(--ok)}.kzt-admin .badge.run{background:#b453091f;color:var(--warn)}.kzt-admin .badge.fail{background:#dc26261f;color:var(--fail)}.kzt-admin .setting-desc{margin:8px 0 0;font-size:13px;color:var(--muted);line-height:1.55}.kzt-admin .switch-row{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:12px;padding:12px 14px;border-radius:12px;background:#ffffff29;border:1px solid rgba(255,255,255,.35)}.kzt-admin .switch-row .label{font-size:14px;font-weight:700;color:var(--heading)}.kzt-admin .switch-row .hint{margin-top:4px;font-size:12px;color:var(--muted)}.kzt-admin .switch{position:relative;width:46px;height:26px;flex-shrink:0;border-radius:999px;border:none;cursor:pointer;background:#cbd5e1}.kzt-admin .switch.on{background:var(--accent)}.kzt-admin .switch:after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 2px 6px #0000002e}.kzt-admin .switch.on:after{transform:translate(20px)}.kzt-admin .status{white-space:pre-wrap;font-size:13px;line-height:1.5;margin-top:10px;background:#ffffff2e;border:1px solid rgba(255,255,255,.35);border-radius:12px;padding:10px 12px}.kzt-admin .progress{display:none;margin-top:10px;height:8px;background:#ffffff40;border-radius:999px;overflow:hidden}.kzt-admin .progress>i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--accent),#2dd4bf);transition:width .25s}.kzt-admin .progress.show{display:block}.kzt-admin .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:12px}.kzt-admin .toast{position:fixed;left:50%;top:max(16px,env(safe-area-inset-top,0px));bottom:auto;right:auto;z-index:80;transform:translate(-50%) translateY(-8px);background:#0b1220c7;color:#fff;padding:10px 16px;border-radius:12px;font-size:13px;font-weight:600;opacity:0;pointer-events:none;transition:opacity .22s,transform .22s;border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);max-width:min(90vw,320px);text-align:center;box-shadow:0 10px 28px #0f172a2e}.kzt-admin .toast.show{opacity:1;transform:translate(-50%) translateY(0)}.kzt-admin .search{min-width:180px;border:1px solid rgba(255,255,255,.4);background:#fff3;border-radius:var(--radius-sm);padding:9px 13px;font:inherit;font-size:13px;backdrop-filter:blur(6px)}@media(max-width:980px){.kzt-admin .stats{grid-template-columns:repeat(2,1fr)}.kzt-admin .split{grid-template-columns:1fr}}@media(max-width:820px){.kzt-admin{flex-direction:column;max-height:none}.kzt-admin .sidebar{display:none}.kzt-admin .main{padding:14px 12px calc(var(--mobile-nav-h) + var(--safe-bottom) + 1.75rem)}.kzt-admin .main.chat-open{padding:0;flex:1;min-height:0;overflow:hidden}.kzt-admin .main.chat-open>section{flex:1;min-height:0;height:100%}.kzt-admin .main.chat-open .im-shell{border-radius:0;border:none;box-shadow:none;min-height:100%;height:100%}.kzt-admin .main.chat-open .im-compose{padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px))}.kzt-admin .mobile-tabbar{position:fixed;left:1rem;right:1rem;bottom:calc(.75rem + var(--safe-bottom));z-index:40;display:flex;width:auto;max-width:none;transform:none;border-radius:1.25rem;padding:.45rem;gap:.25rem;justify-content:space-around;align-items:center;background:#ffffff47;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.42);box-shadow:0 16px 40px #0f172a29}.kzt-admin .mobile-tabbar.is-hidden{display:none}.kzt-admin .mobile-tab{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border:1px solid transparent;background:transparent;border-radius:.9rem;padding:.55rem .35rem;font:inherit;font-size:10px;font-weight:600;color:#64748b;cursor:pointer;transition:color .25s,background .25s,border-color .25s,box-shadow .25s}.kzt-admin .mobile-tab:hover{color:#334155;background:#fff3}.kzt-admin .mobile-tab.active{color:#0f766e;background:#14b8a633;border-color:#2dd4bf66;box-shadow:0 4px 12px #14b8a61f}.kzt-admin .mobile-tab-label{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kzt-admin .im-shell{height:auto;min-height:calc(100dvh - var(--mobile-nav-h) - 3.5rem)}.kzt-admin .main.chat-open .im-shell{min-height:100dvh;height:100dvh}.kzt-admin .im-pane{min-height:48vh}.kzt-admin .main.chat-open .im-pane{min-height:0;height:100%}.kzt-admin .im-pane-head{flex-wrap:wrap}.kzt-admin .stats{grid-template-columns:1fr}}';
const 额外样式 = '.kzt-admin .kzt-warn-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;padding:12px 14px;border-radius:12px;border:1px solid #f59e0b66;background:#fef3c7b8;color:#92400e;font-size:13px;line-height:1.5;flex-wrap:wrap}.kzt-admin .kzt-warn-bar strong{color:#b45309}.kzt-admin .kzt-warn-bar .btn{padding:6px 12px;font-size:12px}.kzt-admin .kzt-warn-code{font-family:ui-monospace,Consolas,monospace;font-size:13px;font-weight:800;letter-spacing:.1em;color:#92400e;background:#fffbeb;border:1px dashed #d97706;border-radius:6px;padding:1px 8px;margin:0 2px}.kzt-admin .kzt-danger-panel{border-color:#fca5a580;background:#fee2e2a6}.kzt-admin .kzt-danger-panel h3{color:#b91c1c}.kzt-admin .kzt-select{min-width:140px;border:1px solid rgba(255,255,255,.5);background:#fff5;color:#334155;font:inherit;font-size:13px;font-weight:600;border-radius:10px;padding:8px 10px;outline:none}.kzt-admin .kzt-num{width:170px;border:1px solid rgba(255,255,255,.5);background:#fff5;color:#334155;font:inherit;font-size:13px;border-radius:10px;padding:8px 10px;outline:none}.kzt-admin .kzt-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:12px}.kzt-admin .kzt-form label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700;color:#475569}.kzt-admin .kzt-form input{border:1px solid rgba(255,255,255,.5);background:#fff5;color:#0f172a;font:inherit;font-size:13px;border-radius:10px;padding:9px 11px;outline:none}.kzt-admin .kzt-form input:focus{box-shadow:0 0 0 2px #14b8a647}.kzt-admin .kzt-rules{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.kzt-admin .kzt-rules span{font-size:11px;font-weight:700;color:#94a3b8;background:#ffffff3d;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:4px 10px}.kzt-admin .kzt-rules span.ok{color:#047857;background:#d1fae5b3;border-color:#6ee7b773}.kzt-admin .kzt-locks{display:flex;flex-direction:column;gap:8px;margin-top:12px}.kzt-admin .kzt-lock-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;background:#ffffff29;border:1px solid rgba(255,255,255,.35);font-size:12px;flex-wrap:wrap}.kzt-admin .kzt-lock-row code{font-family:var(--mono);font-size:12px;color:#0f172a;background:#ffffff5c;border-radius:6px;padding:2px 7px}.kzt-admin .kzt-lock-row .hint{flex:1;min-width:120px;color:#64748b}.kzt-admin .kzt-lock-row .btn{padding:5px 10px;font-size:12px}.kzt-login{display:flex;flex:1 1 auto;align-items:center;justify-content:center;min-height:100vh;padding:24px;background:radial-gradient(900px 520px at 8% -6%,rgba(45,212,191,.3),transparent 55%),radial-gradient(780px 480px at 96% 4%,rgba(56,189,248,.22),transparent 52%),linear-gradient(155deg,#e0f2fe,#ecfeff 42%,#e0f7f4);font-family:"Manrope","PingFang SC","Microsoft YaHei",sans-serif}.kzt-login-card{width:min(380px,100%);background:#ffffffb8;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.6);border-radius:20px;box-shadow:0 18px 46px #94a3b840;padding:26px 24px 20px}.kzt-login-card .brand{font-weight:800;font-size:1.35rem;line-height:1.1;margin-bottom:14px}.kzt-login-card .brand .mark{background:linear-gradient(120deg,#0f766e 10%,#0d9488,#38bdf8);-webkit-background-clip:text;background-clip:text;color:transparent}.kzt-login-card .brand small{display:block;margin-top:6px;font-size:10px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:#475569a6}.kzt-login-card h1{margin:0 0 6px;font-size:1.1rem;color:#1e293b}.kzt-login-tip{margin:0 0 16px;font-size:12px;line-height:1.55;color:#64748b}.kzt-field{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700;color:#475569}.kzt-pw{display:flex;gap:8px}.kzt-pw input{flex:1;min-width:0;border:1px solid rgba(148,163,184,.5);background:#fff9;border-radius:11px;padding:10px 12px;font:inherit;font-size:14px;color:#0f172a;outline:none}.kzt-pw input:focus{box-shadow:0 0 0 2px #14b8a647}.kzt-pw-eye{border:1px solid rgba(148,163,184,.45);background:#fff8;border-radius:11px;padding:0 12px;font:inherit;font-size:12px;font-weight:700;color:#0f766e;cursor:pointer}.kzt-login-btn{width:100%;margin-top:14px;height:44px;border-radius:12px;border:0;background:linear-gradient(135deg,#0f766e,#0d9488);color:#fff;font:inherit;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 10px 24px #0f766e40}.kzt-login-btn:disabled{opacity:.5;cursor:not-allowed}.kzt-login-foot{margin-top:12px;font-size:11px;color:#94a3b8;text-align:center;line-height:1.5}.kzt-login .err{margin-top:10px;color:#dc2626;font-size:12px;font-weight:700;line-height:1.5}.kzt-pw-hint{margin:0 0 14px;padding:12px 14px;border-radius:14px;border:1.5px solid #f59e0b;background:linear-gradient(135deg,#fef3c7,#fde68a);box-shadow:0 6px 18px #f59e0b33}.kzt-pw-hint-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.kzt-pw-hint-label{font-size:12px;font-weight:800;color:#92400e;letter-spacing:.04em}.kzt-pw-hint-code{flex:1;min-width:0;font-family:ui-monospace,Consolas,monospace;font-size:20px;font-weight:800;letter-spacing:.14em;color:#7c2d12;background:#fffbeb;border:1px dashed #d97706;border-radius:10px;padding:6px 12px;text-align:center;user-select:all}.kzt-pw-hint-fill{flex-shrink:0;border:0;border-radius:10px;padding:8px 14px;font:inherit;font-size:13px;font-weight:800;background:#b45309;color:#fff;cursor:pointer;box-shadow:0 4px 12px #b4530940}.kzt-pw-hint-fill:hover{background:#92400e}.kzt-pw-hint-tip{margin-top:8px;font-size:11px;line-height:1.5;color:#92400e}';
function on(a) {
  M(() => {
    const i = document.createElement("style");
    return i.setAttribute("data-kzt-admin", "1"), i.textContent = a, document.head.appendChild(i), () => {
      i.remove();
    };
  }, [a]);
}
function 登录页({
  api: a,
  状态: 初始状态,
  on成功: 成功回调
}) {
  const [密码, 设密码] = k("");
  const [显示, 设显示] = k(!1);
  const [错, 设错] = k("");
  const [忙, 设忙] = k(!1);
  const [剩, 设剩] = k(Math.max(0, Number(初始状态 && 初始状态.锁定剩余毫秒) || 0));
  const 初始密码值 = String(初始状态 && 初始状态.初始密码 || "");
  const 锁定中 = 剩 > 0;
  M(() => {
    if (!锁定中) return;
    const i2 = window.setInterval(() => 设剩((v) => Math.max(0, v - 1e3)), 1e3);
    return () => window.clearInterval(i2);
  }, [锁定中]);
  const 提交 = async () => {
    if (忙 || 锁定中 || !密码.trim()) return;
    设忙(!0), 设错("");
    try {
      const t = await a.post("/auth/login", { password: 密码 }, { 场景: "登录" });
      const 令牌 = t && t.data && t.data.token;
      if (!令牌) throw new Error("登录响应异常，请重试");
      存令牌(令牌), 成功回调 && 成功回调(t.data || {});
    } catch (t) {
      const o = t instanceof Error ? t.message : String(t);
      设错(o);
      try {
        const s = await a.get("/auth/status"), d = s && s.data || {};
        设剩(Math.max(0, Number(d.锁定剩余毫秒) || 0));
      } catch {
      }
    } finally {
      设忙(!1);
    }
  };
  return /* @__PURE__ */ e("div", { className: "kzt-login", children: /* @__PURE__ */ r("form", {
    className: "kzt-login-card",
    onSubmit: (t) => {
      t.preventDefault(), void 提交();
    },
    children: [
      /* @__PURE__ */ r("div", { className: "brand", children: [
        /* @__PURE__ */ e("span", { className: "mark", children: "kzt" }),
        /* @__PURE__ */ e("small", { children: "console" })
      ] }),
      /* @__PURE__ */ e("h1", { children: "登录控制台" }),
      /* @__PURE__ */ e("p", { className: "kzt-login-tip", children: "请输入控制台密码。登录后请立刻在「系统设置 → 登录与安全」里改成你自己的密码。" }),
      初始密码值 ? /* @__PURE__ */ r("div", { className: "kzt-pw-hint", children: [
        /* @__PURE__ */ r("div", { className: "kzt-pw-hint-row", children: [
          /* @__PURE__ */ e("span", { className: "kzt-pw-hint-label", children: "初始密码" }),
          /* @__PURE__ */ e("code", { className: "kzt-pw-hint-code", title: "点击「填入」即可直接使用", children: 初始密码值 }),
          /* @__PURE__ */ e("button", {
            type: "button",
            className: "kzt-pw-hint-fill",
            onClick: () => {
              设密码(初始密码值), 设错("");
            },
            children: "填入"
          })
        ] }),
        /* @__PURE__ */ e("div", { className: "kzt-pw-hint-tip", children: "当前仍是初始密码（任何人打开这个页面都能看到）。改掉之后这行提示会自动消失。" })
      ] }) : null,
      /* @__PURE__ */ r("label", { className: "kzt-field", children: [
        /* @__PURE__ */ e("span", { children: "密码" }),
        /* @__PURE__ */ r("div", { className: "kzt-pw", children: [
          /* @__PURE__ */ e("input", {
            type: 显示 ? "text" : "password",
            autoFocus: !0,
            autoComplete: "current-password",
            placeholder: "请输入密码",
            value: 密码,
            disabled: 忙 || 锁定中,
            onChange: (t) => 设密码(t.target.value)
          }),
          /* @__PURE__ */ e("button", { type: "button", className: "kzt-pw-eye", onClick: () => 设显示(!显示), children: 显示 ? "隐藏" : "显示" })
        ] })
      ] }),
      锁定中 ? /* @__PURE__ */ e("div", { className: "err", children: `该 IP 已被锁定，约 ${Math.ceil(剩 / 6e4)} 分钟后可重试；也可以在插件配置里手动解除。` }) : 错 ? /* @__PURE__ */ e("div", { className: "err", children: 错 }) : null,
      /* @__PURE__ */ e("button", { type: "submit", className: "kzt-login-btn", disabled: 忙 || 锁定中 || !密码.trim(), children: 忙 ? "登录中…" : "登录" }),
      /* @__PURE__ */ e("div", { className: "kzt-login-foot", children: "同一 IP 连续 3 次密码错误会被锁定 24 小时" })
    ]
  }) });
}

function sn() {
  const [a, i] = k(""), [t, o] = k(!1);
  return M(() => {
    if (!t) return;
    const s = window.setTimeout(() => o(!1), 2200);
    return () => window.clearTimeout(s);
  }, [t, a]), {
    node: /* @__PURE__ */ e("div", { className: `toast${t ? " show" : ""}`, children: a }),
    toast: (s) => {
      i(s), o(!0);
    }
  };
}
function cn(a) {
  on(rn + 额外样式);
  const 接口 = je(() => We(a.apiBase, a.fetch), [a.apiBase, a.fetch]), { node: t, toast: o } = sn();
  const [状态, 设状态] = k(null), [需登录, 设需登录] = k(!1);
  const 刷新状态 = H(async () => {
    try {
      const s = await 接口.get("/auth/status");
      设状态(s.data || {});
    } catch {
      设状态({ 已登录: !1, 默认密码: !1, 锁定剩余毫秒: 0 });
    }
  }, [接口]);
  M(() => {
    void 刷新状态();
  }, [刷新状态]), M(() => {
    设登录失效回调(() => {
      存令牌(""), 设状态((s) => ({ ...(s || {}), 已登录: !1 })), 设需登录(!0);
    });
    return () => 设登录失效回调(null);
  }, []);
  let 主体;
  if (!状态)
    主体 = /* @__PURE__ */ e("div", { className: "kzt-login", children: /* @__PURE__ */ e("div", { className: "kzt-login-card", children: /* @__PURE__ */ e("p", { className: "kzt-login-tip", children: "正在检查登录状态…" }) }) });
  else if (!状态.已登录 || 需登录)
    主体 = /* @__PURE__ */ e(登录页, {
      api: 接口,
      状态,
      on成功: async (s) => {
        设需登录(!1), await 刷新状态(), o(s && s.默认密码 ? "登录成功，请尽快修改初始密码" : "登录成功");
      }
    });
  else
    主体 = /* @__PURE__ */ e(Ze, {
      api: 接口,
      toast: o,
      默认密码: !!状态.默认密码,
      初始密码: String(状态.初始密码 || ""),
      on密码已改: async () => {
        await 刷新状态(), o("密码已更新");
      },
      on退出登录: async () => {
        try {
          await 接口.post("/auth/logout", {});
        } catch {
        }
        存令牌(""), 设状态((s) => ({ ...(s || {}), 已登录: !1 })), 设需登录(!0), o("已退出登录");
      }
    });
  return /* @__PURE__ */ r("div", { className: "kzt-admin", style: { position: "relative", height: "100%", minHeight: "100%" }, children: [主体, t] });
}

export {
  cn as default
};
