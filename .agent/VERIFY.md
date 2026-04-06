# VERIFY — 联调验收步骤

> **你是一个 AI agent，正在阅读本文件以完成部署后的验收。**
> 本文件在 DEPLOY.md Step 7 被引用，前提是 CONFIGURE.md 已完成。

---

## Step 1：容器状态检查

```bash
docker compose ps
```

预期输出：两个容器均为 `running` / `Up` 状态。

| 容器 | 端口 | 状态 |
|------|------|------|
| napcat | 6099 | running |
| astrbot | 6185 | running |

如果有容器未运行：

```bash
docker compose logs napcat --tail 50
docker compose logs astrbot --tail 50
```

---

## Step 2：NapCat 登录状态

```bash
docker logs napcat 2>&1 | grep -i -E "login|account|uin|qq" | tail -10
```

- 成功标志：出现 `login success`、账号 UIN 号、或 `Bot started` 类信息
- 失败标志：仍在等待扫码、token 过期、网络错误

如果未登录，回到 DEPLOY.md Step 4 重新扫码。

---

## Step 3：WebSocket 连接状态

```bash
# NapCat 侧
docker logs napcat 2>&1 | grep -i -E "ws|websocket|connect" | tail -10

# AstrBot 侧
docker logs astrbot 2>&1 | grep -i -E "connect|adapter|onebot|aiocqhttp" | tail -10
```

- 成功标志：`connected`、`adapter loaded`、`websocket established`
- 失败标志：`connection refused`、`timeout`、`reconnect`

如果连接失败：

```bash
# 确认两个容器在同一网络
docker network inspect astrbot_network | grep -A5 "Containers"

# 确认端口监听
docker exec napcat ss -tlnp | grep 6099
docker exec astrbot ss -tlnp | grep 6185
```

---

## Step 4：插件加载状态

```bash
docker logs astrbot 2>&1 | grep -i -E "plugin|QQtoLocal|qq2local|loaded" | tail -10
```

- 成功标志：`plugin loaded`、`QQtoLocal` 出现在加载列表中
- 失败标志：`plugin error`、`import error`、`not found`

确认插件文件存在：

```bash
docker exec astrbot ls /AstrBot/data/plugins/ | grep -i -E "QQtoLocal|qq2local"
```

---

## Step 5：归档目录可用性

```bash
# 确认挂载正常
docker exec astrbot ls -la /AstrBot/data/archive/

# 确认宿主机侧目录存在
ls -la archive/
```

预期：两边能看到相同的目录内容。

归档目录结构预期：

```
archive/
  YYYY-MM-DD/
    messages.md        # 当日消息记录
    files/             # 文件附件
    photos/            # 图片附件
  index/
    message_ids.json   # 去重索引
```

---

## Step 6：端到端消息测试

**告诉用户**：

> 请在已配置监听的 QQ 群中发送 2-3 条测试消息，例如：
> - "测试消息 1：部署验证"
> - "测试消息 2：归档测试"

发送后，依次检查：

### 6a. NapCat 收到消息

```bash
docker logs napcat --since 2m 2>&1 | grep -i -E "message|recv|group" | tail -20
```

- 成功标志：能看到群号和消息内容
- 失败标志：无新日志 → QQ 登录或群配置有问题

### 6b. AstrBot 处理消息

```bash
docker logs astrbot --since 2m 2>&1 | grep -i -E "message|event|recv|handler" | tail -20
```

- 成功标志：能看到事件处理日志
- 失败标志：无日志 → WebSocket 连接有问题

### 6c. 本地归档落盘

```bash
# 检查今天的归档目录
TODAY=$(date +%Y-%m-%d)
ls -la archive/$TODAY/ 2>/dev/null || echo "今日归档目录尚未创建"

# 如果目录存在，查看内容
cat archive/$TODAY/messages.md 2>/dev/null | tail -20
```

- 成功标志：`archive/YYYY-MM-DD/` 目录出现，`messages.md` 包含测试消息
- 失败标志：目录未创建 → 插件 `archive_root` 配置错误或 `enable_markdown_archive` 未开启

### 6d. 跨平台转发（仅在启用时检查）

如果用户配置了 Telegram 或 Discord 转发：

```bash
# Telegram
docker logs astrbot --since 2m 2>&1 | grep -i -E "telegram|forward|send" | tail -10

# Discord
docker logs astrbot --since 2m 2>&1 | grep -i -E "discord|forward|send" | tail -10
```

如果未启用跨平台转发，跳过此步，本地归档正常即为验收通过。

---

## Step 7：输出验收结论

根据以上检查结果，向用户输出结论，格式如下：

```
## 部署验收结论

### 核心链路（必须通过）
- [ ] NapCat 容器运行中
- [ ] AstrBot 容器运行中
- [ ] QQ 登录成功
- [ ] WebSocket 通信正常
- [ ] astrbot-QQtoLocal 插件已加载
- [ ] 归档目录挂载正常
- [ ] 消息可从 QQ 群 → NapCat → AstrBot
- [ ] 本地归档落盘到 archive/YYYY-MM-DD/

### 可选功能
- [ ] Telegram 转发正常（未启用则标注"未配置"）
- [ ] Discord 转发正常（未启用则标注"未配置"）

### 未完成 / 需用户补充
- （列出未通过的项目及原因）

### 常用运维命令
- 查看日志：docker compose logs -f
- 重启服务：docker compose restart
- 停止服务：docker compose down
- 更新镜像：docker compose pull && docker compose up -d
- 查看归档：ls archive/$(date +%Y-%m-%d)/
```

---

## 故障定位速查

| 故障段 | 检查命令 | 常见原因 |
|--------|----------|----------|
| QQ 登录 | `docker logs napcat \| grep login` | token 过期，需重新扫码 |
| 容器启动 | `docker compose ps` | 镜像拉取失败、端口占用 |
| 端口监听 | `ss -tlnp \| grep -E "6099\|6185"` | 端口被其他进程占用 |
| WebSocket | `docker logs astrbot \| grep connect` | 容器网络隔离、地址配错 |
| 插件加载 | `docker logs astrbot \| grep plugin` | 插件未安装、依赖缺失 |
| 归档挂载 | `docker exec astrbot ls /AstrBot/data/archive/` | compose 挂载路径错误 |
| Telegram | `docker logs astrbot \| grep telegram` | Bot Token 错误、目标 ID 错误（未启用则忽略） |
| Discord | `docker logs astrbot \| grep discord` | Bot Token 错误、频道 ID 错误（未启用则忽略） |
