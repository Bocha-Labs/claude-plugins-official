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

Or install it from this marketplace repository after the marketplace entry is merged:

```bash
/plugin install bocha-web-search@claude-plugins-official
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

Run the optional live integration test:

```bash
BOCHA_API_KEY=your-api-key node --test test/bocha.test.js --test-name-pattern="live"
```
