# SETUP — Agent 可执行部署指引

> **你是一个 AI agent，正在阅读本文件以完成 EDU-PUBLISH 项目的自动化部署。**
> 按下面的步骤顺序执行。遇到需要用户输入的地方，停下来等用户回复。

## 前置条件

- 用户已经在 GitHub 网页端 fork 了 `guiguisocute/EDU-PUBLISH`
- 当前工作目录已经是用户 fork 下来的 `EDU-PUBLISH` 项目根目录（含 `config/`、`content/`、`scripts/` 等）
- 宿主机为 Linux（推荐 Ubuntu/Debian）、macOS 或 Windows（通过 WSL）
- 宿主机已安装 `git` 与 `bash`（Windows 用户需在 WSL 环境中操作）

---

## Step 0：确认当前目录与 fork 状态

先确认当前目录就是用户 fork 下来的仓库根目录，且远端指向用户自己的仓库：

```bash
git rev-parse --show-toplevel
git branch --show-current
git remote -v
ls config/site.yaml config/subscriptions.yaml config/widgets.yaml
```

应满足：

- 当前目录为 `EDU-PUBLISH` 项目根目录
- `origin` 指向用户自己的 fork（不是 `guiguisocute/EDU-PUBLISH`）

> 如果用户还没有 fork 或 clone，到此停止，先让用户去 GitHub 网页端 fork，再把 fork clone 到本地。

---

## Step 1：安装项目 skill

本项目的 agent 运行链路依赖项目级 skills。先阅读同目录下的 `SKILLS.md`，然后将所需 skills 安装到 `./skills/`。

安装完成后校验 8 个 skill 都已就绪：

```bash
ls \
  skills/edup-reconcile/SKILL.md \
  skills/edup-incremental-process/SKILL.md \
  skills/edup-map-source/SKILL.md \
  skills/edup-merge-supplement/SKILL.md \
  skills/edup-parse-and-create-cards/SKILL.md \
  skills/edup-validate-and-push/SKILL.md \
  skills/edup-write-conclusion/SKILL.md \
  skills/edup-write-worklog/SKILL.md
```

> 如果缺少任何 required skill，不要继续后续部署步骤。

---

## Step 2：环境探测

依次检查，逐项报告结果：

```bash
# 2a. 检查 docker 命令是否存在
command -v docker > /dev/null 2>&1 && echo "DOCKER_INSTALLED" || echo "DOCKER_NOT_FOUND"

# 2b. 检查 Docker daemon 权限是否可用（仅当 docker 已安装时执行）
docker info > /dev/null 2>&1 && echo "DAEMON_OK" || echo "NEED_PERMISSION"

# 2c. 检查 docker compose
docker compose version

# 2d. 检查项目配置文件
ls config/site.yaml config/subscriptions.yaml config/widgets.yaml
```

> ⚠️ 注意区分"Docker 未安装"和"Docker 已安装但无权限"两种情况，处理方式不同。

**如果 Docker 未安装**（`DOCKER_NOT_FOUND`），执行安装：

```bash
# Debian/Ubuntu
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 提醒用户：需要重新登录 shell 以生效，或执行 newgrp docker
```

**如果 Docker 已安装但无权限**（`NEED_PERMISSION`），将当前用户加入 docker 组：

```bash
sudo usermod -aG docker $USER
# 提醒用户：需要重新登录 shell 或执行 newgrp docker
```

**如果 docker compose 不可用**，检查是否有独立的 `docker-compose`（V1）：

```bash
docker-compose version
```

> 后续命令统一使用 `docker compose`。如果宿主机只有 V1，替换为 `docker-compose`。

### Windows 环境额外检查

如果宿主机是 Windows，需要区分 Docker 运行环境：

```bash
# 检查是否在 WSL 内
uname -r 2>/dev/null | grep -qi microsoft && echo "IN_WSL" || echo "NOT_WSL"

# 检查 Docker 来源
docker version --format '{{.Server.Os}}' 2>/dev/null
```

**情况 A — Docker Desktop（Windows 原生）**：
- `docker` 命令在 PowerShell/CMD 和 WSL 中都可用
- Docker daemon 由 Docker Desktop 管理，不需要 `sudo usermod`
- WSL 中的 `docker` 实际是 Docker Desktop 的代理
- 注意：Docker Desktop 需要在 Settings → Resources → WSL Integration 中启用对应 WSL 发行版
- bind mount 路径使用 `/mnt/c/...` 或 WSL 原生路径均可，但**推荐在 WSL 文件系统内操作**（如 `~/EDU-PUBLISH`），跨文件系统挂载性能极差

**情况 B — WSL 内独立安装的 Linux Docker**：
- 仅在 WSL 终端中可用，PowerShell/CMD 中不可用
- 需要手动启动 daemon：`sudo service docker start`
- 权限管理与 Linux 一致（`sudo usermod -aG docker $USER`）
- 如果 `docker info` 报 `Cannot connect to the Docker daemon`，先检查 daemon 是否在运行：
  ```bash
  sudo service docker status
  sudo service docker start
  ```

> ⚠️ 两种环境**不要混用**。如果已安装 Docker Desktop 并启用了 WSL Integration，不要在 WSL 内再装一套 Docker。

---

## Step 3：准备目录与编排文件

```bash
mkdir -p data napcat/config ntqq archive
```

在项目根目录创建 `docker-compose.yml`，内容如下：

```yaml
# EDU-PUBLISH 自动化链路：NapCat + AstrBot
# 基于 https://github.com/NapNeko/NapCat-Docker/blob/main/compose/astrbot.yml

services:
  napcat:
    image: mlikiowa/napcat-docker:latest
    container_name: napcat
    restart: always
    environment:
      - NAPCAT_UID=${NAPCAT_UID:-1000}
      - NAPCAT_GID=${NAPCAT_GID:-1000}
      - MODE=astrbot
    ports:
      - "6099:6099"
    volumes:
      - ./data:/AstrBot/data
      - ./napcat/config:/app/napcat/config
      - ./ntqq:/app/.config/QQ
    networks:
      - astrbot_network

  astrbot:
    image: soulter/astrbot:latest
    container_name: astrbot
    restart: always
    environment:
      - TZ=Asia/Shanghai
    ports:
      - "6185:6185"
    volumes:
      - ./data:/AstrBot/data
      - ./archive:/AstrBot/data/archive
    networks:
      - astrbot_network

networks:
  astrbot_network:
    driver: bridge
```

> **关键挂载**：`./archive:/AstrBot/data/archive` 使 AstrBot 插件写入的归档直接落进项目的 `archive/` 目录。

> ⚠️ **权限提醒**：AstrBot 容器以 root 运行，写入 bind mount 后宿主机文件变为 root 所有者。首次启动后建议执行：
> ```bash
> sudo chown -R $USER:$USER data archive
> ```
> 否则后续宿主机上编辑配置文件或读取归档时可能遇到 `EACCES` 权限错误。

---

## Step 4：拉取镜像并启动容器

```bash
docker compose pull
docker compose up -d
docker compose ps
```

预期：`napcat` 和 `astrbot` 状态均为 `running` 或 `Up`。

---

## Step 5：NapCat QQ 登录

NapCat 同时提供**终端二维码**和 **WebUI 网页登录**两条路径。

> ⚠️ **优先使用 WebUI 方式**。你（agent）如果跑在 IDE、桌面 GUI、Web 聊天界面或任何不能正确渲染 Unicode 块字符的终端里，`docker logs` 打出的二维码会变成一片乱码，用户没法扫。WebUI 方式把二维码渲染成浏览器里的图片，适合所有环境。

### 方式 A — WebUI 网页登录（推荐，适合所有 agent 环境）

NapCat 在容器内 6099 端口提供管理 WebUI，登录后页面里会显示可扫码的二维码图片。`docker-compose.yml` 已经把 6099 映射到宿主机，无需改动。

#### 5A-1：获取 WebUI 登录 token 和 URL

先尝试从启动日志里抓已经拼好的带 token 的 URL：

```bash
docker logs napcat 2>&1 | grep -oE "http://[^ ]*webui[^ ]*token=[A-Za-z0-9_\-]+" | tail -1
```

如果有输出，得到形如 `http://127.0.0.1:6099/webui?token=xxxxxxxx` 的完整地址，记录下 token 部分。

如果上面命令没有输出（不同镜像版本日志格式不一致），退而求其次从配置文件里读：

```bash
docker exec napcat cat /app/napcat/config/webui.json 2>/dev/null \
  || cat napcat/config/webui.json 2>/dev/null
```

在 JSON 里找 `token` 字段。

如果配置文件也没有 token 字段（首次启动、尚未生成），使用镜像默认 token：

```
napcat
```

> NapCat-Docker 官方默认 token 就是字符串 `napcat`，首次登录后 WebUI 会强制要求改密。

#### 5A-2：根据用户环境给出可访问的 URL

判断用户 agent 运行环境，分三种情况处理：

**情况 1 — agent 与浏览器在同一台机器（本地开发）**

直接告诉用户：

> 请在浏览器打开：`http://localhost:6099/webui?token=<上一步拿到的 token>`
> 登录后在页面上找到"QQ 登录"或"扫码登录"入口，用手机 QQ 扫描网页里的二维码完成登录。首次登录会要求你设置新密码，按提示改即可。

**情况 2 — 用户通过 SSH 远程连接到服务器（agent 在远端，浏览器在本地）**

需要做端口转发。告诉用户：

> 请在你本地电脑**另开一个终端**执行（保持该终端不关）：
> ```bash
> ssh -L 6099:localhost:6099 <你登服务器用的用户名>@<服务器地址>
> ```
> 然后在本地浏览器打开：`http://localhost:6099/webui?token=<token>`，扫码登录。

如果用户用的是 VS Code Remote-SSH / Cursor Remote 等 IDE，这些工具通常会自动转发端口，可先让用户在 IDE 的「端口」面板里确认 6099 是否已经被自动 forward；没有的话手动 forward 一下，再在本地浏览器打开同样的 URL。

**情况 3 — 宿主机是云服务器 / VPS，且用户希望直接公网访问**

不推荐直接开 6099 到公网，登录 token 在 URL 里明文传。如果一定要这么做：

1. 先登录一次并在 WebUI 中把默认 token `napcat` 改成一个强随机值
2. 再开放云厂商安全组 / 本机防火墙的 6099 端口
3. URL 换成 `http://<公网IP>:6099/webui?token=<新 token>`

更稳妥的做法依然是走情况 2 的 SSH 端口转发。

#### 5A-3：验证 QQ 登录成功

扫码完成后：

```bash
docker logs napcat 2>&1 | tail -30
```

查找包含 `login success`、`登录成功`、或账号 QQ 号 / 昵称的日志行。

### 方式 B — 终端二维码（仅在能正确渲染二维码的终端有效）

仅当你（agent）确认当前终端可以正常渲染 Unicode 二维码（例如用户直接在本机 Terminal / iTerm2 / Windows Terminal 里运行 agent）时使用：

```bash
docker logs --tail 100 napcat
```

> ⚠️ 不要使用 `docker logs -f ... | head`，这种组合对 agent/CI 场景不稳定，容易卡住。优先使用 `--tail` 或 `--since`。

告诉用户用手机 QQ 扫描终端里的二维码。如果二维码看起来像是一片方块 / 乱码 / 被压扁，不要让用户硬扫，回到**方式 A** 走 WebUI。

扫码成功后，确认登录状态：

```bash
docker logs napcat 2>&1 | tail -20
```

---

## Step 6：验证 NapCat 与 AstrBot 的 WebSocket 通信

> 这两个容器在同一个 `astrbot_network` 网络中，可通过容器名互访。

**检查 AstrBot 是否已启动**：

```bash
docker logs astrbot 2>&1 | tail -20
```

**AstrBot 控制台地址**：`http://<宿主机IP>:6185`

告诉用户：

> AstrBot 控制台已就绪：http://localhost:6185

> ⚠️ NapCat 使用 `MODE=astrbot` 启动后会主动连接 `ws://astrbot:6199/ws`，但 **AstrBot 默认并没有启用 OneBot v11 平台配置**，因此 NapCat 会遇到 `ECONNREFUSED`。

**必须手动补充 AstrBot 平台配置**：

检查 `data/cmd_config.json` 中的 `platform` 数组，如果为空，需要添加 OneBot v11 反向 WebSocket 配置：

```bash
# 查看当前配置
docker exec astrbot cat /AstrBot/data/cmd_config.json | python3 -m json.tool 2>/dev/null || \
docker exec astrbot cat /AstrBot/data/cmd_config.json
```

在 `data/cmd_config.json` 的 `platform` 数组中添加以下配置项（如果不存在）：

```json
{
  "id": "default",
  "type": "aiocqhttp",
  "enable": true,
  "ws_reverse_host": "0.0.0.0",
  "ws_reverse_port": 6199,
  "ws_reverse_token": ""
}
```

添加后重启 AstrBot：

```bash
docker restart astrbot
```

**验证通信**：

```bash
docker logs --since 2m astrbot 2>&1 | grep -i -E "connect|adapter|websocket|napcat" | tail -10
```

如果连接失败，参阅：
- NapCat 文档：https://napneko.github.io/
- AstrBot 文档：https://astrbot.app/

---

## Step 7：安装并配置 astrbot-QQtoLocal 插件

插件仓库：https://github.com/guiguisocute/astrbot-QQtoLocal

### 7a. 安装插件

**方式 A — 控制台安装（推荐）**：

1. 打开 `http://localhost:6185`
2. 进入「插件市场」
3. 搜索 `astrbot-QQtoLocal` 或 `qq2local`
4. 点击安装

**方式 B — 手动安装**：

```bash
docker exec astrbot git clone https://github.com/guiguisocute/astrbot-QQtoLocal.git /AstrBot/data/plugins/astrbot-QQtoLocal
docker restart astrbot
```

验证插件已加载：

```bash
docker logs astrbot 2>&1 | grep -i -E "QQtoLocal|qq2local|plugin.*load" | tail -10
```

### 7b. 配置插件参数

插件配置有两种方式：

**方式 A — 控制台配置（适合人类用户）**：

`http://localhost:6185` → 「插件管理」→ `astrbot-QQtoLocal` → 「配置」。

**方式 B — 直接编辑配置文件（适合 agent 自动化）**：

配置文件路径为 `data/config/astrbot-QQtoLocal_config.json`（宿主机）或容器内 `/AstrBot/data/config/astrbot-QQtoLocal_config.json`。

> ⚠️ **权限提醒**：AstrBot 容器写入 `data/` 目录后，宿主机上的文件可能变成 root 所有者。如果编辑配置文件时遇到 `EACCES` 权限错误，需要先修复权限：
> ```bash
> sudo chown -R $USER:$USER data archive
> ```

**需要向用户索取**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `banshi_group_list` | `list[str]` | 需要监听的 QQ 群号列表，例如 `["123456789"]` |

> 请提供需要监听的 QQ 群号列表。

**agent 应自动设置以下值**（配置落点：`data/config/astrbot-QQtoLocal_config.json`），无需询问用户：

| 字段 | 设置值 | 说明 |
|------|--------|------|
| `enable_markdown_archive` | `true` | 启用本地 Markdown 归档 |
| `archive_root` | `/AstrBot/data/archive` | **必须改**，默认值是 `/AstrBot/data/qq2tg_archive` |
| `archive_save_assets` | `true` | 保存图片和文件附件 |
| `archive_asset_max_mb` | `20` | 单个资源文件大小上限（MB） |

> **重要**：`archive_root` 默认值是 `/AstrBot/data/qq2tg_archive`，必须改为 `/AstrBot/data/archive` 才能与 `docker-compose.yml` 中的挂载路径对应。

修改配置文件后重启 AstrBot 使配置生效：

```bash
docker restart astrbot
```

### 7c. 可选：跨平台转发

> 以下为可选功能。如果用户不需要将 QQ 消息转发到其他平台，跳过。

**询问用户**：是否需要将 QQ 群消息转发到 Telegram 或 Discord？

如不需要，设置 `enable_telegram_forward` → `false`，`enable_discord_forward` → `false`。

如需要 Telegram 转发，需在 AstrBot 控制台配置 Telegram 适配器，然后在目标群组中使用 `/qq2tg_bind_target` 绑定。Discord 同理，使用 `/qq2dc_bind_target`。

### 7d. 验证归档目录挂载

```bash
docker exec astrbot mkdir -p /AstrBot/data/archive/test && \
docker exec astrbot touch /AstrBot/data/archive/test/probe.txt && \
echo "Container write OK"

ls -la archive/test/probe.txt && echo "Host visible OK"

# 清理探针
rm -rf archive/test
docker exec astrbot rm -rf /AstrBot/data/archive/test
```

如果宿主机看不到文件，说明 compose 挂载未生效，需检查 `docker-compose.yml` 并重新启动。

---

## Step 8：端到端消息测试

**告诉用户**：

> 请在已配置监听的 QQ 群中发送 2-3 条任意消息（内容不限）。

发送后，依次检查：

### 8a. NapCat 收到消息

```bash
docker logs napcat --since 2m 2>&1 | grep -i -E "message|recv|group" | tail -20
```

### 8b. AstrBot 插件处理消息

```bash
docker logs astrbot --since 2m 2>&1 | grep -i -E "message|event|recv|handler|in_source|归档" | tail -20
```

**验收关键指标**（不依赖具体消息文本）：
- 日志中出现目标群号 → 群号命中成功
- 日志中出现 `in_source=True` → 插件识别到来源群
- 日志中出现 `归档成功` → 归档流程完成

### 8c. 本地归档落盘

```bash
TODAY=$(date +%Y-%m-%d)
ls -la archive/$TODAY/ 2>/dev/null || echo "Today's archive directory not yet created"
cat archive/$TODAY/messages.md 2>/dev/null | tail -20
```

**成功标志**：
- `archive/YYYY-MM-DD/` 目录出现
- `messages.md` 有新增记录（内容与用户发送的消息对应）

**失败标志及排查**：
- 目录未创建 → 检查插件 `archive_root` 配置是否为 `/AstrBot/data/archive`，以及 `enable_markdown_archive` 是否为 `true`
- 目录存在但 `messages.md` 为空 → 检查 `banshi_group_list` 是否包含目标群号

---

## Step 9：输出验收结论

根据以上检查结果，向用户输出结论：

```
## 部署验收结论

### 核心链路
- [ ] NapCat 容器运行中
- [ ] AstrBot 容器运行中
- [ ] QQ 登录成功
- [ ] WebSocket 通信正常
- [ ] astrbot-QQtoLocal 插件已加载
- [ ] 归档目录挂载正常
- [ ] 消息可从 QQ 群 → NapCat → AstrBot
- [ ] 本地归档落盘到 archive/YYYY-MM-DD/

### 可选功能
- [ ] Telegram 转发（未配置则标注"未启用"）
- [ ] Discord 转发（未配置则标注"未启用"）

### 常用运维命令
- 查看日志：docker compose logs -f
- 重启服务：docker compose restart
- 停止服务：docker compose down
- 更新镜像：docker compose pull && docker compose up -d
- 查看归档：ls archive/$(date +%Y-%m-%d)/
```

---

## Step 10：前端构建验证

验收通过后，验证前端项目能否正常构建：

```bash
pnpm install
pnpm run build
```

**如果构建报错**：
- 阅读错误信息，尝试修复
- 常见问题：Node.js 版本不对（需要 22）、缺少依赖、配置文件格式错误
- 修复后重新 `pnpm run build` 直到构建成功

**如果构建成功**，继续下一步。

---

## Step 11：本地预览与清空 Demo 数据

启动开发服务器让用户预览前端效果：

```bash
pnpm run dev
```

**告诉用户**：

> 前端开发服务器已启动，请访问 http://localhost:3000 （或终端输出的实际地址）查看效果。
> 当前展示的是项目自带的 Demo 数据。是否需要清空这些 Demo 内容，切换到"站点结构还在、但列表里没有任何通知卡片"的空内容状态？

### 如果用户选择清空

依次删除以下 Demo 数据：

**1. Demo 卡片**：

```bash
rm -rf content/card/demo/
```

**2. Demo 附件**：

```bash
rm -rf public/attachments/demo/
```

**3. Demo 卡片封面缓存**（如果目录里只有 demo 生成物，可一并清掉；保留 `.gitkeep` 即可）：

```bash
rm -f content/card/covers/*
rm -f public/covers/*
```

> 不要把 `config/subscriptions.yaml` 清空为 `units: []` 或空数组。当前编译脚本要求 `schools` 为非空数组，否则 `pnpm run build` 会直接失败。

> 也不要在这一步删除 `public/img/` 下的 logo 或学院图标。那些是站点品牌/占位资源，不属于 Demo 卡片数据。

**4. 重新构建并预览**：

```bash
pnpm run build
pnpm run dev
```

> 已清空 Demo 卡片、Demo 附件，并重新构建。请刷新 http://localhost:3000 确认当前效果：侧边栏和站点品牌仍然存在，但列表中不再有任何示例通知，页面会显示各组件自己的空状态文案。

**如果用户希望进一步收缩到"最小可编译空内容态"**，可以把 `config/subscriptions.yaml` 改成下面这个最小合法配置：

```yaml
categories:
  - 其它分类

schools:
  - slug: empty-campus
    name: 空白站点
    short_name: 空白
    order: 1
    icon: /img/default-unit-icon.svg
    subscriptions:
      - title: 待接入
        enabled: false
        order: 1
        icon: /img/default-unit-icon.svg
```

说明：

- `schools` 不能为空；当前编译器要求它必须是非空数组。
- 每个 school 的 `subscriptions` 也不能为空；至少保留 1 条占位订阅。
- 这条占位订阅设为 `enabled: false` 后，不会作为正常订阅源出现在侧边栏。
- 编译器仍会自动补一条 `未知来源` 订阅，但在 0 篇内容时会被前端隐藏。

这个状态下，最终页面效果是：

- 站点框架、Logo、主题切换等基础壳子仍然存在。
- 左侧通常只剩 1 个学院汇总入口（如 `空白站点汇总`）。
- 列表区域没有任何通知卡片，会显示"当前源暂无可展示的内容"之类的空态文案。
- 搜索索引为空，RSS 频道仍会生成，但没有任何 item。
- 这是"最小可编译空内容态"，不是完全白屏或完全无结构页面。

### 如果用户选择保留

不做任何清理，直接进入下一步。

---

## Step 12：询问是否继续部署网页

先停止开发服务器（Ctrl+C），然后询问用户：

> NapCat、AstrBot、插件的本地链路已经跑通，前端也已验证。是否继续把站点部署为可访问的网页？

如果用户确认，继续阅读同目录下的 `PUBLISH.md`。

---

## 故障排查速查

| 症状 | 排查 |
|------|------|
| 容器启动失败 | `docker compose logs napcat` / `docker compose logs astrbot` |
| 二维码不出现 / 终端里是乱码 | 走 Step 5 方式 A（WebUI `http://localhost:6099/webui?token=...`），不要依赖终端二维码 |
| WebUI 打不开 / token 无效 | `docker restart napcat` 后重新从日志抓 URL；或直接用默认 token `napcat`；或检查 `napcat/config/webui.json` |
| 远程服务器上开了 WebUI 本地访问不了 | 本地另起终端 `ssh -L 6099:localhost:6099 user@server` 做端口转发，再用 `http://localhost:6099/...` 访问 |
| WebSocket 连不上 | 确认两个容器在同一网络：`docker network inspect astrbot_network` |
| 端口冲突 | `ss -tlnp \| grep -E "6099\|6185"`，修改 compose 的端口映射 |
| archive/ 无内容 | 检查挂载：`docker exec astrbot ls /AstrBot/data/archive/` |
| 插件未加载 | `docker logs astrbot \| grep plugin`，确认插件目录存在 |
