# Bocha Claude Code Plugins

[![English](https://img.shields.io/badge/English-README-0A66C2)](./README.md)
[![简体中文](https://img.shields.io/badge/简体中文-README-555555)](./README.zh-CN.md)

Bocha's Claude Code plugin repository. This repository currently publishes an external plugin: `bocha-web-search`.

> Important: Only install plugins you trust. Plugins may run MCP servers, access local files, and call external APIs.

## What This Repository Contains

- A lightweight Claude Code marketplace manifest: `.claude-plugin/marketplace.json`
- The Bocha Web Search plugin: `external_plugins/bocha-web-search`
- Chinese README: `README.zh-CN.md`

This repository no longer carries Anthropic's built-in plugins or unrelated third-party examples. The goal is to keep the repository easy to audit, easy to maintain, and easy for Claude Code users to install from.

## Quick Start

### Option 1: Direct local loading

Clone the repository and load the plugin directly:

```bash
git clone https://github.com/Bocha-Labs/claude-plugins-official.git
cd claude-plugins-official
export BOCHA_API_KEY="your-api-key"
claude --plugin-dir ./external_plugins/bocha-web-search
```

This is the fastest path for local development and manual verification.

### Option 2: Install through Claude Code marketplace

Add this repository as a custom marketplace:

```bash
/plugin marketplace add Bocha-Labs/claude-plugins-official
```

Then install the plugin:

```bash
/plugin install bocha-web-search@bocha-plugins
```

After installation, restart Claude Code or run:

```bash
/reload-plugins
```

### Updating After a New Plugin Version

If you installed the plugin from the Bocha marketplace, update it with:

```bash
/plugin update bocha-web-search
/reload-plugins
```

If Claude Code still shows the old behavior after an update, reinstall it:

```bash
/plugin uninstall bocha-web-search
/plugin install bocha-web-search@bocha-plugins
/reload-plugins
```

If you use `--plugin-dir`, Claude loads the plugin directly from your local files. Pull the latest repository changes, then restart Claude Code or reload plugins:

```bash
git pull
/reload-plugins
```

## Repository Layout

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

## Plugin Validation

Validate the plugin structure:

```bash
claude plugin validate ./external_plugins/bocha-web-search
```

Run the plugin test suite:

```bash
cd external_plugins/bocha-web-search
npm test
```

## User Guide

- Plugin README: [external\_plugins/bocha-web-search/README.md](file:///Users/zhangkairui/Bocha/Agent/claude-plugins-official/external_plugins/bocha-web-search/README.md)
- Chinese README: [README.zh-CN.md](file:///Users/zhangkairui/Bocha/Agent/claude-plugins-official/README.zh-CN.md)

## Notes

- `BOCHA_API_KEY` must be provided through environment variables.
- `bocha_web_search` is exposed as an MCP tool.
- The included skill guides Claude to use Bocha when the user needs fresh web information, news, or fact checking.
