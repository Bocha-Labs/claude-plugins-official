# Bocha Web Search

Bocha Web Search brings Bocha's live web search API into Claude Code as a native plugin tool.

## Features

- Exposes a `bocha_web_search` MCP tool for live web search
- Reads credentials from `BOCHA_API_KEY`
- Supports `query`, `freshness`, `count`, `summary`, `include`, and `exclude`
- Retries Bocha `429` responses with exponential backoff
- Returns structured web results with numbered references
- Includes a model-invoked `bocha-web-search` skill for real-time research tasks

## Setup

### 1. Get a Bocha API key

Create an account and get an API key from [open.bocha.cn](https://open.bocha.cn).

### 2. Export the API key

```bash
export BOCHA_API_KEY="your-api-key"
```

### 3. Test locally

Run Claude Code with the plugin directory:

```bash
claude --plugin-dir /absolute/path/to/external_plugins/bocha-web-search
```

In the `Bocha-Labs/claude-plugins-official` fork, this plugin lives at:

```text
external_plugins/bocha-web-search
```

If this plugin is later split into its own repository, point `--plugin-dir` at that repository root.

Or install it from a marketplace after the plugin is published there:

```bash
/plugin install bocha-web-search@your-marketplace
```

If Claude Code is configured to use the `Bocha-Labs/claude-plugins-official` marketplace fork, this plugin can be installed from that marketplace entry once published there.

### 4. Update or reinstall after a new version

If the plugin was installed from a marketplace:

```bash
/plugin update bocha-web-search
/reload-plugins
```

If the update does not take effect, reinstall it:

```bash
/plugin uninstall bocha-web-search
/plugin install bocha-web-search@bocha-plugins
/reload-plugins
```

If you run the plugin with `--plugin-dir`, update your local repository and reload plugins:

```bash
git pull
/reload-plugins
```

## Tool

### `bocha_web_search`

Search the live web for recent information, news, and fact-checking.

#### Parameters

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `query` | `string` | Yes | Search keyword or natural-language question |
| `freshness` | `string` | No | `noLimit`, `oneDay`, `oneWeek`, `oneMonth`, `oneYear` |
| `count` | `integer` | No | Number of results to return, from `1` to `50` |
| `summary` | `boolean` | No | Request Bocha summaries when `true` |
| `include` | `string` | No | Allowed domains separated by `|` or `,` |
| `exclude` | `string` | No | Blocked domains separated by `|` or `,` |

#### Output

The tool returns:

- Text output with numbered results `[1]`, `[2]`, ...
- Structured output with:
  - `query`
  - `logId`
  - `totalEstimatedMatches`
  - `results[]` containing `name`, `url`, `snippet`, `summary`, `siteName`, and related metadata

## Development

Start the MCP server directly:

```bash
node ./server.js
```

Run tests:

```bash
npm test
```

Validate the plugin structure:

```bash
claude plugin validate /absolute/path/to/bocha-web-search
```

Run the optional live integration test:

```bash
BOCHA_API_KEY=your-api-key node --test test/bocha.test.js --test-name-pattern="live"
```

Run the optional live MCP end-to-end test:

```bash
BOCHA_API_KEY=your-api-key node --test test/mcp.e2e.test.js --test-name-pattern="live"
```

## Publishing Notes

- Keep `.claude-plugin/plugin.json` at the repository root under `.claude-plugin/`
- Keep `.mcp.json`, `skills/`, `README.md`, and `LICENSE` at the plugin root
- Bump the plugin `version` in `.claude-plugin/plugin.json` for releases
- In the current monorepo layout, keep `repository` pointed at `https://github.com/Bocha-Labs/claude-plugins-official`
- If the plugin is split into a dedicated repository later, update `repository` and installation examples accordingly
