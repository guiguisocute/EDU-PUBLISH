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
docker --version
docker compose version
docker info > /dev/null 2>&1 && echo "OK" || echo "NEED_PERMISSION"
ls config/site.yaml config/subscriptions.yaml config/widgets.yaml
```

**如果 Docker 不存在**，执行安装：

```bash
# Debian/Ubuntu
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 提醒用户：需要重新登录 shell 以生效，或执行 newgrp docker
```

**如果 docker compose 不可用**，检查是否有独立的 `docker-compose`（V1）：

```bash
docker-compose version
```

> 后续命令统一使用 `docker compose`。如果宿主机只有 V1，替换为 `docker-compose`。

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

NapCat 启动后会在日志中输出 QQ 登录二维码。

```bash
docker logs -f napcat 2>&1 | head -100
```

**告诉用户**：
> 请用手机 QQ 扫描上面日志中的二维码完成登录。登录成功后日志会显示账号信息。

扫码成功后，确认登录状态：

```bash
docker logs napcat 2>&1 | tail -20
```

查找包含 `login success` 或账号信息的日志行。

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
> NapCat 使用 `MODE=astrbot` 启动，WebSocket 通信应已自动配置。
> 如果需要手动配置，NapCat 的 WebSocket 地址为 `ws://napcat:6099`（容器间通信用容器名）。

**验证通信**：

```bash
docker logs astrbot 2>&1 | grep -i -E "connect|adapter|websocket|napcat" | tail -10
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

插件配置通过 AstrBot 控制台完成：`http://localhost:6185` → 「插件管理」→ `astrbot-QQtoLocal` → 「配置」。

**需要向用户索取**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `banshi_group_list` | `list[str]` | 需要监听的 QQ 群号列表，例如 `["123456789"]` |

> 请提供需要监听的 QQ 群号列表。

**agent 应自动设置以下值**，无需询问用户：

| 字段 | 设置值 | 说明 |
|------|--------|------|
| `enable_markdown_archive` | `true` | 启用本地 Markdown 归档 |
| `archive_root` | `/AstrBot/data/archive` | **必须改**，默认值是 `/AstrBot/data/qq2tg_archive` |
| `archive_save_assets` | `true` | 保存图片和文件附件 |
| `archive_asset_max_mb` | `20` | 单个资源文件大小上限（MB） |

> **重要**：`archive_root` 默认值是 `/AstrBot/data/qq2tg_archive`，必须改为 `/AstrBot/data/archive` 才能与 `docker-compose.yml` 中的挂载路径对应。

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

> 请在已配置监听的 QQ 群中发送 2-3 条测试消息，例如：
> - "测试消息 1：部署验证"
> - "测试消息 2：归档测试"

发送后，依次检查：

### 8a. NapCat 收到消息

```bash
docker logs napcat --since 2m 2>&1 | grep -i -E "message|recv|group" | tail -20
```

### 8b. AstrBot 处理消息

```bash
docker logs astrbot --since 2m 2>&1 | grep -i -E "message|event|recv|handler" | tail -20
```

### 8c. 本地归档落盘

```bash
TODAY=$(date +%Y-%m-%d)
ls -la archive/$TODAY/ 2>/dev/null || echo "Today's archive directory not yet created"
cat archive/$TODAY/messages.md 2>/dev/null | tail -20
```

- 成功标志：`archive/YYYY-MM-DD/` 目录出现，`messages.md` 包含测试消息
- 失败标志：目录未创建 → 插件 `archive_root` 配置错误或 `enable_markdown_archive` 未开启

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

## Step 10：询问是否继续部署网页

当验收通过后，不要默认继续网站发布。先询问用户：

> NapCat、AstrBot、插件的本地链路已经跑通。是否继续把站点部署为可访问的网页？

如果用户确认，继续阅读同目录下的 `PUBLISH.md`。

---

## 故障排查速查

| 症状 | 排查 |
|------|------|
| 容器启动失败 | `docker compose logs napcat` / `docker compose logs astrbot` |
| 二维码不出现 | `docker restart napcat` 后重新查看日志 |
| WebSocket 连不上 | 确认两个容器在同一网络：`docker network inspect astrbot_network` |
| 端口冲突 | `ss -tlnp \| grep -E "6099\|6185"`，修改 compose 的端口映射 |
| archive/ 无内容 | 检查挂载：`docker exec astrbot ls /AstrBot/data/archive/` |
| 插件未加载 | `docker logs astrbot \| grep plugin`，确认插件目录存在 |
