# 博查 Web Search 集成指南

## 概述

博查 Web Search 是一个高质量的联网搜索 API，覆盖近千亿网页和生态内容源（新闻、图片、百科、文库等），专为 AI 应用优化。本文档介绍如何在 `claude-plugins-official` 中使用博查联网搜索能力。

本集成以 Claude Code 官方原生 plugin 目录结构实现，形态为一个本地 `external_plugins/bocha-web-search` 插件，其中包含：

- 一个零依赖的 stdio MCP server
- 一个 `bocha_web_search` 工具
- 一个 `bocha-web-search` Skill

## 前置条件

1. 注册博查账号并获取 API Key：`https://open.bocha.cn`
2. 设置环境变量：

```bash
export BOCHA_API_KEY="你的API_KEY"
```

3. 本机已安装 `node`

## 安装

### 本地开发测试

在仓库根目录执行：

```bash
claude --plugin-dir /绝对路径/claude-plugins-official/external_plugins/bocha-web-search
```

### Marketplace 安装

当该插件条目合入仓库 marketplace 后，可执行：

```bash
/plugin install bocha-web-search@claude-plugins-official
```

## 使用方式

### 作为 Tool 调用

插件暴露 `bocha_web_search` MCP 工具，Claude 在需要实时信息、最新新闻、事实核查时可自动调用。

本地命令行测试示例：

```bash
claude -p \
  --plugin-dir /绝对路径/claude-plugins-official/external_plugins/bocha-web-search \
  --permission-mode bypassPermissions \
  "使用 bocha_web_search 搜索最近一周 Claude Code 插件更新，并给出引用。"
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | string | 是 | 搜索关键字或语句 |
| `freshness` | string | 否 | 时效性：`noLimit` / `oneDay` / `oneWeek` / `oneMonth` / `oneYear`，默认 `noLimit` |
| `count` | integer | 否 | 返回结果数量，`1-50`，默认 `10` |
| `summary` | boolean | 否 | 是否返回内容摘要，默认 `true` |
| `include` | string | 否 | 限定搜索域名，多个域名可用 `|` 或 `,` 分隔 |
| `exclude` | string | 否 | 排除搜索域名，格式同 `include` |

### 返回结果

工具会将 `data.webPages.value` 解析为统一结构化结果，每条结果包含：

- `name`：网页标题
- `url`：网页链接
- `displayUrl`：展示链接
- `snippet`：内容摘要
- `summary`：AI 生成的文本摘要
- `siteName`：来源网站名称
- `siteIcon`：网站图标 URL
- `dateLastCrawled`：抓取时间
- `language`：语言信息

同时，工具还会返回：

- `logId`：博查请求日志 ID
- `totalEstimatedMatches`：预估匹配总数

### Skill 使用规则

插件包含 `bocha-web-search` Skill，用于提示 Claude 在以下场景优先调用搜索工具：

- 需要实时信息
- 需要新闻或时效性内容
- 需要事实核查
- 需要面向外部网页的研究任务

Skill 约束 Claude：

- 结果引用必须使用来源编号 `[1][2]...`
- 回答末尾必须附 `References` 列表
- 优先使用返回结果中的 `summary` 字段，没有时退回 `snippet`

## 测试

### 单元测试

在插件目录执行：

```bash
npm test
```

覆盖内容包括：

- 参数构建与默认值
- 响应解析
- 401 错误处理
- 403 错误处理
- 429 指数退避重试
- 500 错误处理

### 集成测试

当环境变量 `BOCHA_API_KEY` 已设置时，测试会额外执行真实 API 调用；未设置时自动跳过，避免在公开环境暴露密钥。

## 注意事项

- API Key 通过环境变量 `BOCHA_API_KEY` 注入，请勿硬编码
- 请求频率有限制，插件已对 `429` 实现最多 3 次指数退避重试
- 如遇到 `403` 错误，请检查账户余额或资源包
- 本插件当前只解析 `data.webPages.value` 作为搜索结果；图片字段保留待后续扩展
- 涉及 Bocha API 的行为以当前提示中的接口规范为准；其他行为若未在代码或文档中验证，均应视为待验证

## 相关链接

- 博查开放平台：`https://open.bocha.cn`
- API 文档：`https://bocha-ai.feishu.cn/wiki/HmtOw1z6vik14Fkdu5uc9VaInBb`
- 技术支持：待补充
