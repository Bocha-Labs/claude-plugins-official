# Bocha Claude Code Plugins

[![English](https://img.shields.io/badge/English-README-555555)](./README.md)
[![简体中文](https://img.shields.io/badge/简体中文-README-0A66C2)](./README.zh-CN.md)

Bocha 的 Claude Code 插件仓库。仓库目前发布一个 external plugin：`bocha-web-search`。

> 重要：只安装你信任的插件。插件可能运行 MCP server、访问本地文件并调用外部 API。

## 仓库内容

- 一个轻量级 Claude Code marketplace manifest：`.claude-plugin/marketplace.json`
- Bocha Web Search 插件：`external_plugins/bocha-web-search`
- 中文 README：`README.zh-CN.md`

这个仓库不再保留 Anthropic 内置插件或无关的第三方示例。目标是让仓库更容易审计、更容易维护，也更方便 Claude Code 用户安装使用。

## 快速开始

### 方式一：直接本地加载

克隆仓库后，直接从插件目录加载：

```bash
git clone https://github.com/Bocha-Labs/claude-plugins-official.git
cd claude-plugins-official
export BOCHA_API_KEY="your-api-key"
claude --plugin-dir ./external_plugins/bocha-web-search
```

这是本地开发和手动验证的最快路径。

### 方式二：通过 Claude Code marketplace 安装

先把这个仓库添加为自定义 marketplace：

```bash
/plugin marketplace add Bocha-Labs/claude-plugins-official
```

再安装插件：

```bash
/plugin install bocha-web-search@bocha-plugins
```

安装后，重启 Claude Code 或执行：

```bash
/reload-plugins
```

## 仓库结构

```text
claude-plugins-official/
├── .claude-plugin/
│   └── marketplace.json
├── external_plugins/
│   └── bocha-web-search/
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── .mcp.json
│       ├── skills/
│       ├── lib/
│       ├── test/
│       ├── server.js
│       ├── package.json
│       ├── LICENSE
│       └── README.md
```

## 插件校验

校验插件结构：

```bash
claude plugin validate ./external_plugins/bocha-web-search
```

运行插件测试：

```bash
cd external_plugins/bocha-web-search
npm test
```

## 用户文档

- 插件 README：`external_plugins/bocha-web-search/README.md`
- 中文 README：`README.zh-CN.md`

## 说明

- 必须通过环境变量提供 `BOCHA_API_KEY`
- `bocha_web_search` 以 MCP tool 形式暴露
- 内置 Skill 会在用户需要实时网页信息、新闻或事实核查时引导 Claude 调用 Bocha
