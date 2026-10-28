# kzt · QQ 官方机器人网页控制台

![版本](https://img.shields.io/badge/version-1.6.2-blue.svg)
![框架](https://img.shields.io/badge/框架-咔咔珂%20kakake-0f766e.svg)
![平台](https://img.shields.io/badge/platform-QQ%20Official%20Bot-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

**kzt**（插件 ID `GF-kzt`）是一个运行在 **[咔咔珂（kakake）](https://github.com/tc-404/kakake)** 上的 **QQ 官方机器人网页控制台插件**：
不响应任何聊天指令，只负责记录消息、提供统计，并在控制台里给出可视化管理界面。

> 运行框架：**咔咔珂 kakake** — <https://github.com/tc-404/kakake>
> 本插件按它的插件规范开发：目录前缀 `GF-`（QQ 官方机器人）、`package.json` + `plugin.json` + ESM 入口 + 文档，
> 后台页面用 `ctx.router.page` 以远程 React 模块（`webuiModule`）形式挂载。

## 📦 下载与安装

**方式一：发布包（推荐）**

到 [Releases](https://github.com/3671656786/GF-kzt/releases) 下载 `GF-kzt-1.6.2.zip`，解压后得到一个 `GF-kzt/` 文件夹，整个放进框架根目录的 `plugins/` 下：

```
kakake/plugins/GF-kzt/
├── index.mjs
├── package.json
├── plugin.json
├── README.md
└── webui/
```

然后在控制台完成三步：

1. **插件管理**里打开 `kzt` 的总开关；
2. 在对应的 **QQ 官方连接**上打开它的连接开关（框架会按账号生成运行副本 `plugins_two/<AppID>/GF-kzt/`）；
3. 打开它的后台页面，用初始密码 `12345678` 登录，**立刻到「系统设置 → 登录与安全」改掉**。

**方式二：克隆源码**

```bash
git clone https://github.com/3671656786/GF-kzt.git kakake/plugins/GF-kzt
```

> 目录名**必须**是 `GF-kzt`：框架按前缀识别插件类型（`GF-` = QQ 官方机器人，`kakake-` = OneBot，`WX-` = 微信，`ss-plugin-` = KOOK），
> 而目录名就是插件 ID，同时决定数据目录 `data/<AppID>/GF-kzt/` —— 改名会让已有日志、密码、置顶数据全部对不上。

## ✅ 兼容性

| 项 | 要求 |
| --- | --- |
| 运行框架 | [咔咔珂 kakake](https://github.com/tc-404/kakake)（插件系统：`plugins/` + `plugins_two/<账号>/`） |
| Node.js | **≥ 20**（推荐 22 LTS，与框架便携包内置运行时一致） |
| 连接类型 | QQ 官方机器人（Gateway WebSocket / HTTPS Webhook） |
| 插件类型前缀 | `GF-` |
| 运行时依赖 | 无强制依赖；`sharp` 由「系统设置 → 安装 Sharp 依赖」按需装到 `data/<AppID>/GF-kzt/runtime-deps/` |

## ✨ 功能

### 登录控制台

打开控制台先要输密码，密码保存在插件配置里（`data/<AppID>/GF-kzt/auth.json`，只存 scrypt 加盐哈希，不存明文）。

- **初始密码 `12345678`**，且登录页会把它**醒目地显示出来**（大号等宽字 + 一键「填入」），登录后顶部也一直提醒
- **新密码规则**：≥ 8 位，且同时包含**大写字母、小写字母、阿拉伯数字、特殊符号**，不能含空格、不能沿用初始密码
- **连续错误锁定**：同一 IP 连续 3 次密码错误 → 锁定该 IP **24 小时**，写入 `auth-security.log`；
  控制台「登录锁定」里可逐个或一键**手动解除**，插件配置里也能解除
- 登录凭证是随机令牌（服务端只存 sha256），默认 7 天有效；改密码后**其他设备立即掉线**
- 侧栏底部「退出登录」可立即注销当前令牌

### 仪表盘
- 按日期查看群聊 / 私聊消息量、消息时段分布曲线
- 群聊使用排行 Top5、用户使用排行 Top5
- Bot 名称、头像、AppID、运行状态

### 使用排行
- 按日期看完整的群聊 / 用户使用排行
- 口径：私聊消息、群里 @机器人 的消息、按钮互动；群里普通闲聊不计入

### 查看消息
- 按会话浏览历史消息，支持关键字搜索、群聊/私聊筛选、会话星标置顶
- **消息渲染**（默认开启）：
  - **实时渲染 Markdown**：标题、加粗/斜体/删除线、行内代码与代码块、列表、引用、分割线、链接、图片、表格，换行原样保留
  - **内嵌按钮还原**：消息附带的键盘会渲染成蓝色按钮，点击行为与 QQ 一致——
    指令按钮**填入输入框**（可改再发）、链接按钮**直接打开**、回调按钮需真实用户点击（控制台会提示无法模拟）
  - **其他机器人的按钮**：这类"蓝色文字"是 markdown 里的 `mqqapi://aio/inlinecmd` 内联指令链接，
    或 `<qqbot-cmd-input text="…" show="…" />` 标签，两种都会还原成可点击的蓝色文字，
    点一下就把指令填进输入框（参数支持 `cmd=` / `command=` / `text=`）
  - ⚠️ **限制**：QQ 客户端底部那排「按钮网格」来自消息的 `keyboard` 字段，而开放平台**不会**把其他机器人消息的
    `keyboard` 下发给事件（已核对原始事件的全部字段），所以控制台无法还原那排网格；好在按钮对应的指令通常也以蓝色文字写在正文里，
    现在都能点。
- **发文字**：输入框上方「文本 / Markdown」分段开关（选择会被记忆）；`Enter` 发送、`Shift + Enter` 换行
- **发按钮**：点「按钮」展开编辑区，一行一个 `文字|指令`；带按钮的消息自动按 Markdown 发送
  （官方限制：按钮只在 Markdown 消息里生效，文字最多 10 字、每行 3 个、最多 5 行，超出会被裁剪）
- **发图片 / 文件**：同一行的「图片」「文件」按钮，选文件即发；
  输入框里已写的文字会作为这条媒体的说明文字，发完自动清空
  - 单次上限 **7MB**（受框架 10MB 请求体限制），超限会直接提示
  - 图片按 `file_type=1`、文件按 `file_type=4` 上传；群聊与私聊各走自己的上传接口
- **撤回**：长按消息气泡 3 秒，确认后撤回（需要机器人有对应权限；自己发出的消息限 2 分钟内）

### 系统设置
- **消息渲染**：实时渲染 Markdown / 内嵌按钮可点击，默认开启
- **消息记录保留**：默认**永久保留**；可选 7 / 30 / 90 / 180 / 365 天或自定义天数。
  设了天数后，超出范围的日志文件在写入新消息时自动删除（每小时最多清理一次），也可「立即清理过期记录」；
  面板上实时显示现有文件数、占用体积与日期范围
- **登录与安全**：修改密码（带五条规则即时校验）、已锁定 IP 列表与手动解锁
- **Sharp 运行时依赖**：检测、一键安装与安装进度轮询

## ⚙️ 插件配置弹窗

控制台插件列表里点「插件配置」，可以直接改这几项（保存即生效，不需要重载）：

| 配置项 | 作用 |
| --- | --- |
| 渲染 Markdown / 内嵌按钮可点击 | 同控制台「系统设置」里的两个开关 |
| 消息记录保留天数 | `0` = 永久；大于 0 时保存即清理过期日志 |
| **解除登录锁定** | 填 IP 解锁单个；填 `*` 解锁全部；保存后该栏自动清空 |
| **重置控制台密码** | 留空不修改；填写则按强度规则校验后立即重置，所有已登录设备掉线 |

## 🔐 忘记密码 / 被锁死了怎么办

1. **首选**：控制台插件列表 →「插件配置」，用「重置控制台密码」或「解除登录锁定」（不需要进控制台）。
2. **忘记密码且进不去配置**：删掉 `data/<AppID>/GF-kzt/auth.json`，重启插件后会恢复初始密码 `12345678`（同时所有登录失效）。
3. **IP 被锁**：控制台「系统设置 → 登录锁定」点「解除」；或删 `data/<AppID>/GF-kzt/auth-locks.json` 再重载插件。
4. 锁定与登录事件都写在 `data/<AppID>/GF-kzt/auth-security.log`，可直接查看。

## 📊 数据与日志

| 路径 | 内容 |
| --- | --- |
| `log/gf/group/<YYYY-MM-DD>.jsonl` | 群聊消息日志（按天追加） |
| `log/gf/private/<YYYY-MM-DD>.jsonl` | 私聊消息日志（按天追加） |
| `log/gf/nicknames.json` | 昵称缓存 |
| `data/<AppID>/GF-kzt/auth.json` | 控制台密码（scrypt 哈希 + 盐） |
| `data/<AppID>/GF-kzt/auth-sessions.json` | 登录令牌（只存 sha256） |
| `data/<AppID>/GF-kzt/auth-locks.json` | 各 IP 的失败次数与锁定截止时间 |
| `data/<AppID>/GF-kzt/auth-security.log` | 登录 / 锁定 / 改密 / 解锁审计日志 |
| `data/<AppID>/GF-kzt/chat-pins.json` | 会话置顶状态 |
| `data/<AppID>/GF-kzt/settings.json` | 渲染开关、消息保留天数、设置版本 |
| `data/<AppID>/GF-kzt/昵称记录/` | 每个用户的昵称记录 |
| `data/<AppID>/GF-kzt/runtime-deps/` | Sharp 运行时依赖 |

`log/gf/` 是控制台唯一的数据源：删掉日志，仪表盘、排行、查看消息都会变空。设了「保留天数」后，旧日志会被自动清理，**这是不可恢复的**。

## 🔌 后端接口

全部挂在 `/kzt` 前缀下（由 `ctx.router` 注册，走框架的 `/api/Plugin/ext/<id>/...` 链路）。
除 `/kzt/auth/status` 与 `/kzt/auth/login` 外，**所有接口都要求登录令牌**
（请求头 `X-Kzt-Token`，或查询参数 `?token=`），否则返回 `401 { needLogin: true }`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/kzt/auth/status` | 登录状态（`{已登录, 默认密码, 初始密码, 可尝试次数, 锁定剩余毫秒, ip}`） |
| POST | `/kzt/auth/login` | 登录（`{password}` → `{token}`） |
| POST | `/kzt/auth/logout` | 注销当前令牌 |
| POST | `/kzt/auth/password` | 改密（`{oldPassword,newPassword}` → 新 `token`） |
| GET | `/kzt/auth/locks` | 被锁定的 IP 列表 |
| POST | `/kzt/auth/unlock` | 解除锁定（`{ip}`，传 `*` 解除全部） |
| GET | `/kzt/dashboard` | 仪表盘数据（`?date=YYYY-MM-DD`） |
| GET | `/kzt/rankings` | 使用排行（`?date=`） |
| GET | `/kzt/chats` | 会话列表（`?days=&q=`） |
| GET | `/kzt/chats/messages` | 会话消息（`?scope=group\|private&id=&days=&limit=&offset=`） |
| POST | `/kzt/chats/send` | 发文字（`{scope,id,content,format:'text'\|'md',keyboard?}`，带 keyboard 时强制 md） |
| POST | `/kzt/chats/send-media` | 发图片/文件（`{scope,id,kind:'image'\|'file',name,dataBase64\|url,caption?}`） |
| POST | `/kzt/chats/recall` | 撤回消息（`{scope,id,msgId}`） |
| POST | `/kzt/chats/pin` | 切换置顶（`{key}` 或 `{scope,id}`） |
| GET | `/kzt/settings` | 读取设置（`{Markdown渲染, 按钮可点击, 保留天数}`） |
| POST | `/kzt/settings` | 保存设置（布尔开关 + `保留天数`，0 表示永久） |
| GET | `/kzt/storage` | 日志体积统计（`{文件数, 字节, 最早, 最晚, 保留天数}`） |
| POST | `/kzt/storage/clean` | 立即按保留天数清理 |
| GET | `/kzt/sharp-deps/status` | Sharp 依赖状态 |
| POST | `/kzt/sharp-deps/install` | 触发安装 |

`send-media` 也可以直接传公网 `url`（`file_data` 与 `url` 二选一）。失败时统一返回 `{ code: -1, message: "…" }`，前端会直接把 `message` 展示出来。

## 🧩 代码结构

- `index.mjs`：插件入口。导出 `plugin_init` / `plugin_onmessage` / `plugin_cleanup`，以及宿主插件配置用的
  `plugin_config_ui` / `plugin_get_config` / `plugin_set_config`；`plugin_onmessage` 仅做「把消息写进日志」一件事。
- `webui/remote.js`：控制台前端（React 远程模块，`kind: module`），内含登录页、仪表盘、排行、消息、设置四个页面。
- `webui/static/`：静态资源目录。

## 🔄 更新记录

见 [CHANGELOG.md](CHANGELOG.md)。所有发布包都在 [Releases](https://github.com/3671656786/GF-kzt/releases)，
每个资产附 SHA-256 校验值。

## 📄 开源协议

MIT。请在遵循 [QQ 官方机器人开发规范](https://bot.q.qq.com/wiki/) 与 [咔咔珂](https://github.com/tc-404/kakake) 插件规范的前提下使用和修改。
