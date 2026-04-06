# CONFIGURE — 容器启动后的配置阶段

> **你是一个 AI agent，正在阅读本文件以完成 AstrBot 插件配置。**
> 本文件在 DEPLOY.md Step 6 被引用，前提是 NapCat + AstrBot 容器已运行且 QQ 已登录。

---

## Step 1：安装 astrbot-QQtoLocal 插件

插件仓库：https://github.com/guiguisocute/astrbot-QQtoLocal

**方式 A — 控制台安装（推荐）**：

1. 打开 `http://localhost:6185`
2. 进入「插件市场」
3. 搜索 `astrbot-QQtoLocal` 或 `qq2local`
4. 点击安装

**方式 B — 手动安装**：

```bash
docker exec astrbot ls /AstrBot/data/plugins/

# 手动 clone
docker exec astrbot git clone https://github.com/guiguisocute/astrbot-QQtoLocal.git /AstrBot/data/plugins/astrbot-QQtoLocal
```

安装后重启 AstrBot：

```bash
docker restart astrbot
```

验证插件已加载：

```bash
docker logs astrbot 2>&1 | grep -i -E "QQtoLocal|qq2local|plugin.*load" | tail -10
```

---

## Step 2：配置插件参数（必填）

插件配置通过 AstrBot 控制台完成：`http://localhost:6185` → 「插件管理」→ `astrbot-QQtoLocal` → 「配置」。

### A. QQ 群监听（需向用户索取）

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `banshi_group_list` | `list[str]` | `[]` | 需要监听的 QQ 群号列表，例如 `["123456789"]` |
| `qq_block_prefixes` | `list[str]` | `["!!"]` | 消息前缀屏蔽词，匹配到的消息不会触发跨平台转发（但本地归档不受影响） |
| `block_source_messages` | `bool` | `false` | 是否屏蔽来源消息以防止重复 bot 回复 |

**向用户索取**：
> 请提供需要监听的 QQ 群号列表（`banshi_group_list`）。

### B. 本地归档配置（agent 自动完成）

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enable_markdown_archive` | `bool` | `true` | 启用本地 Markdown 归档 |
| `archive_root` | `str` | `/AstrBot/data/qq2tg_archive` | 归档根目录，**必须改为 `/AstrBot/data/archive`** |
| `archive_save_assets` | `bool` | `true` | 保存图片和文件附件 |
| `archive_asset_max_mb` | `int` | `20` | 单个资源文件大小上限（MB） |

**agent 应自动设置以下值**，无需询问用户：

- `enable_markdown_archive` → `true`
- `archive_root` → `/AstrBot/data/archive`（与 compose 挂载路径对应）
- `archive_save_assets` → `true`
- `archive_asset_max_mb` → `20`

> **重要**：`archive_root` 默认值是 `/AstrBot/data/qq2tg_archive`，必须改为 `/AstrBot/data/archive` 才能与 `docker-compose.yml` 中的 `./archive:/AstrBot/data/archive` 挂载对应。

### C. 消息节流配置（可选，使用默认值即可）

| 字段 | 类型 | 说明 |
|------|------|------|
| `banshi_waiting_time` | `int` | 转发前缓冲等待秒数 |
| `banshi_cache_seconds` | `int` | 消息缓存最大保留时间 |
| `banshi_cooldown_day_seconds` | `int` | 白天转发间隔 |
| `banshi_cooldown_night_seconds` | `int` | 夜间转发间隔 |
| `banshi_cooldown_day_start` | `str` | 白天开始时间（HH:MM） |
| `banshi_cooldown_night_start` | `str` | 夜间开始时间（HH:MM） |

一般无需调整，使用插件默认值即可。

---

## Step 3：配置跨平台转发（可选）

> 以下为可选功能。如果用户不需要将 QQ 消息转发到其他平台，跳过本步骤。

**询问用户**：
> 是否需要将 QQ 群消息转发到 Telegram 或 Discord？如果不需要，可以跳过此步骤，仅使用本地归档功能。

### 选项 A：Telegram 转发

前置条件：AstrBot 已配置 Telegram 适配器（控制台「平台设置」→ Telegram）。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enable_telegram_forward` | `bool` | `true` | 启用 Telegram 转发 |
| `telegram_target_unified_origins` | `list[str]` | `[]` | Telegram 目标频道/群组标识符 |
| `telegram_upload_files` | `bool` | `true` | 上传文件到 Telegram |
| `telegram_upload_max_mb` | `int` | `10` | 超过此大小的文件改为发送链接 |

**获取目标标识符**：

1. 在 AstrBot 控制台配置 Telegram Bot Token
2. 在目标 Telegram 群组/频道中向 Bot 发送 `/qq2tg_show_umo`
3. Bot 返回 unified message origin 标识符
4. 或使用 `/qq2tg_bind_target` 直接绑定当前聊天为转发目标

**如果不启用**，设置 `enable_telegram_forward` → `false`。

### 选项 B：Discord 转发

前置条件：AstrBot 已配置 Discord 适配器。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enable_discord_forward` | `bool` | `true` | 启用 Discord 转发 |
| `discord_target_unified_origins` | `list[str]` | `[]` | Discord 目标频道标识符 |

**获取目标标识符**：

1. 在目标 Discord 频道中向 Bot 发送 `/qq2dc_bind_target`
2. 或使用 `/qq2tg_show_umo` 查看当前频道的 unified message origin

**如果不启用**，设置 `enable_discord_forward` → `false`。

---

## Step 4：验证归档目录挂载

```bash
# 确认容器内归档目录可写
docker exec astrbot mkdir -p /AstrBot/data/archive/test && \
docker exec astrbot touch /AstrBot/data/archive/test/probe.txt && \
echo "容器内写入成功"

# 确认宿主机可见
ls -la archive/test/probe.txt && echo "宿主机可见"

# 清理探针
rm -rf archive/test
docker exec astrbot rm -rf /AstrBot/data/archive/test
```

如果宿主机看不到文件，说明 `docker-compose.yml` 中的 `./archive:/AstrBot/data/archive` 挂载未生效，需检查 compose 配置并重新启动。

---

## Step 5：验证 NapCat → AstrBot WebSocket 通信

> `MODE=astrbot` 模式下，NapCat 会自动配置 WebSocket 连接到 AstrBot。

```bash
# 检查 NapCat 是否已连接
docker logs napcat 2>&1 | grep -i -E "connect|ws|websocket" | tail -10

# 检查 AstrBot 是否收到连接
docker logs astrbot 2>&1 | grep -i -E "connect|adapter|aiocqhttp|onebot" | tail -10
```

如果连接失败，可能需要手动配置：

1. NapCat 配置：`http://localhost:6099` → WebSocket 设置
   - 反向 WebSocket 地址：`ws://astrbot:6185/ws`（容器间用容器名）
2. AstrBot 配置：`http://localhost:6185` → 「平台设置」→ OneBot 适配器
   - 确保 OneBot v11 适配器已启用

---

## 插件辅助命令速查

| 命令 | 说明 |
|------|------|
| `/qq2tg_show_umo` | 显示当前会话的 unified message origin 标识符 |
| `/qq2tg_show_archive` | 显示当前频道状态和归档位置 |
| `/qq2tg_bind_target` | 将当前 Telegram 聊天注册为转发目标 |
| `/qq2dc_bind_target` | 将当前 Discord 频道注册为转发目标 |

---

## 配置完成后

继续执行 `VERIFY.md` 中的联调验收步骤。
