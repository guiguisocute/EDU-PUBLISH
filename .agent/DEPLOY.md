# DEPLOY — Agent 可执行部署指引

> **你是一个 AI agent，正在阅读本文件以完成 EDU-PUBLISH 项目的自动化部署。**
> 按下面的步骤顺序执行。遇到需要用户输入的地方，停下来等用户回复。

## 前置条件

- 当前工作目录必须是 EDU-PUBLISH 项目根目录（含 `config/`、`content/`、`scripts/` 等）
- 宿主机为 Linux（推荐 Ubuntu/Debian）或 macOS

---

## Step 1：环境探测

依次检查，逐项报告结果：

```bash
# 检查 Docker
docker --version

# 检查 Docker Compose（v2 插件形式）
docker compose version

# 检查当前用户是否能运行 docker（不需要 sudo）
docker info > /dev/null 2>&1 && echo "OK" || echo "NEED_PERMISSION"

# 检查项目目录结构
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

## Step 2：准备目录与编排文件

```bash
# 创建容器运行所需目录
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

## Step 3：拉取镜像并启动容器

```bash
docker compose pull
docker compose up -d
```

等待两个容器都 running：

```bash
docker compose ps
```

预期：`napcat` 和 `astrbot` 状态均为 `running` 或 `Up`。

---

## Step 4：NapCat QQ 登录

NapCat 启动后会在日志中输出 QQ 登录二维码。

```bash
# 持续查看 NapCat 日志，等待二维码出现
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

## Step 5：配置 NapCat 与 AstrBot 的 WebSocket 通信

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

**验证通信**：在 AstrBot 日志中查找适配器连接成功的信息：

```bash
docker logs astrbot 2>&1 | grep -i -E "connect|adapter|websocket|napcat" | tail -10
```

如果连接失败，参阅：
- NapCat 文档：https://napneko.github.io/
- AstrBot 文档：https://astrbot.app/

---

## Step 6：安装并配置插件

继续执行 `CONFIGURE.md` 中的步骤。

```
阅读同目录下的 CONFIGURE.md 并继续执行。
```

---

## Step 7：联调验收

继续执行 `VERIFY.md` 中的步骤。

```
阅读同目录下的 VERIFY.md 并继续执行。
```

---

## 故障排查速查

| 症状 | 排查 |
|------|------|
| 容器启动失败 | `docker compose logs napcat` / `docker compose logs astrbot` |
| 二维码不出现 | `docker restart napcat` 后重新查看日志 |
| WebSocket 连不上 | 确认两个容器在同一网络：`docker network inspect astrbot_network` |
| 端口冲突 | `ss -tlnp \| grep -E "6099\|6185"`，修改 compose 的端口映射 |
| archive/ 无内容 | 检查挂载：`docker exec astrbot ls /AstrBot/data/archive/` |
