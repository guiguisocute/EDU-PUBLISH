网站 UI 设计基于 @Sallyn0225 的 [gemini-rss-app](https://github.com/Sallyn0225/gemini-rss-app)，谢谢佬的无私开源！

# EDU-PUBLISH

EDU-PUBLISH 是一个依赖 AstrBot 插件 [astrbot-QQtoLocal](https://github.com/guiguisocute/astrbot-QQtoLocal) 以及各类 Agent（Claude Code、OpenClaw、Hermes）自动分析整理的**通用高校通知聚合站模板**。致力于解放高校班委的转发压力，以及打破学院之间的信息差。

![]( https://r2.guiguisocute.cloud/PicGo/2026/04/12/4288a3284ce6d197d3e13e449306d179.png)
---

## 部署与使用
参考本项目的文档站：[点击这里](https://doc.edu-publish.site)
（建设中）

## 整体架构

```mermaid
flowchart LR
  subgraph bridge["步骤1：消息桥接"]
    direction TB
    QQ["QQ 群消息"] --> NapCat["NapCat"]
    NapCat --> AstrBot["AstrBot + 归档插件"]
    AstrBot --> archive["archive/YYYY-MM-DD/"]
  end

  subgraph agent["步骤2：Agent 内容生产"]
    direction TB
    read["读取 archive/"] --> parse["解析 + 去重 + 合并"]
    parse --> card["content/card/*.md"]
    card --> push["git push test"]
  end

  subgraph deploy["步骤3：站点部署"]
    direction TB
    build["pnpm run build"] --> dist["dist/ 静态站点"]
    dist --> host["Cloudflare Pages / Vercel<br/>Netlify / 任意静态服务器"]
  end

  bridge --> agent --> deploy
```

## License

[MIT](./LICENSE)
