# Agent Deploy Docs

这一组文档构成「Agent 一句话部署」的可执行规范。

任意支持终端执行的 AI agent 只需读取入口文件即可完成整条部署链路。

## 文件说明

| 文件 | 说明 |
|------|------|
| `DEPLOY.md` | **主入口**。环境探测 → Docker Compose 编排 → 容器启动 → QQ 扫码登录 → WebSocket 验证 |
| `CONFIGURE.md` | 插件安装与配置。astrbot-QQtoLocal 插件参数、归档目录验证、可选跨平台转发 |
| `VERIFY.md` | 端到端联调验收。容器状态 → 登录 → 通信 → 插件 → 归档 → 消息测试 → 结论输出 |

## 使用方式

给 agent 的提示词：

```text
获取并遵循来自 https://raw.githubusercontent.com/<owner>/<repo>/<branch>/.agent/DEPLOY.md 的安装说明。
```

或本地执行时：

```text
阅读 .agent/DEPLOY.md 并按步骤执行。
```

## 链路概览

```
DEPLOY.md (Step 1-5)
  → 环境检查、Docker 安装、compose 启动、QQ 登录、WebSocket 对接
  → CONFIGURE.md (Step 6)
    → 插件安装、参数配置、归档挂载验证
    → VERIFY.md (Step 7)
      → 端到端消息测试、故障定位、验收结论
```

## 目录结构依赖

部署过程会创建/使用以下目录：

```
EDU-PUBLISH/
├── archive/          # AstrBot 归档落盘（已 gitignore 内容）
├── data/             # AstrBot 运行数据（已 gitignore）
├── napcat/config/    # NapCat 配置（已 gitignore）
├── ntqq/             # QQ 数据目录（已 gitignore）
└── docker-compose.yml  # 由 DEPLOY.md Step 2 创建
```
