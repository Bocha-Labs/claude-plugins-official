#!/usr/bin/env node

import { bochaWebSearch, buildToolResult, BochaError, VALID_FRESHNESS_VALUES } from './lib/bocha.js'

const SERVER_INFO = {
  name: 'bocha-web-search',
  version: '0.1.0',
}

const TOOL_NAME = 'bocha_web_search'

const TOOL_DEFINITION = {
  name: TOOL_NAME,
  description:
    'Search the live web with Bocha for real-time information, recent news, and fact verification. Returns structured web page results with numbered references.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search keyword or sentence.',
      },
      freshness: {
        type: 'string',
        enum: VALID_FRESHNESS_VALUES,
        description: 'Time range filter. Defaults to noLimit.',
      },
      count: {
        type: 'integer',
        minimum: 1,
        maximum: 50,
        description: 'Number of results to return. Defaults to 10.',
      },
      summary: {
        type: 'boolean',
        description: 'Whether to request Bocha summaries. Defaults to true.',
      },
      include: {
        type: 'string',
        description: 'Optional allowed domains joined by "|" or ",".',
      },
      exclude: {
        type: 'string',
        description: 'Optional blocked domains joined by "|" or ",".',
      },
    },
    required: ['query'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      logId: { type: ['string', 'null'] },
      totalEstimatedMatches: { type: 'integer' },
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            url: { type: 'string' },
            displayUrl: { type: 'string' },
            snippet: { type: 'string' },
            summary: { type: 'string' },
            siteName: { type: 'string' },
            siteIcon: { type: 'string' },
            dateLastCrawled: { type: 'string' },
            language: { type: ['string', 'null'] },
          },
          required: ['name', 'url', 'displayUrl', 'snippet', 'summary', 'siteName', 'siteIcon', 'dateLastCrawled', 'language'],
        },
      },
    },
    required: ['query', 'logId', 'totalEstimatedMatches', 'results'],
  },
}

function log(message) {
  process.stderr.write(`[bocha-web-search] ${message}\n`)
}

function encodeContentLengthMessage(message) {
  const json = JSON.stringify(message)
  return `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`
}

function encodeJsonLineMessage(message) {
  return `${JSON.stringify(message)}\n`
}

class StdioJsonRpcServer {
  constructor() {
    this.buffer = Buffer.alloc(0)
    this.contentLength = null
    this.protocol = null
  }

  start() {
    process.stdin.on('data', chunk => {
      this.buffer = Buffer.concat([this.buffer, chunk])
      this.consume()
    })

    process.stdin.on('end', () => process.exit(0))
    process.stdin.on('close', () => process.exit(0))
    process.on('SIGTERM', () => process.exit(0))
    process.on('SIGINT', () => process.exit(0))
  }

  consume() {
    while (true) {
      if (!this.protocol) {
        const prefix = this.buffer.subarray(0, Math.min(this.buffer.length, 32)).toString('utf8').trimStart()
        if (/^Content-Length:/i.test(prefix)) {
          this.protocol = 'content-length'
        } else if (prefix.startsWith('{') || prefix.startsWith('[')) {
          this.protocol = 'json-line'
        } else {
          return
        }
      }

      if (this.protocol === 'content-length') {
        if (this.contentLength == null) {
          const headerEnd = this.buffer.indexOf('\r\n\r\n')
          if (headerEnd === -1) return

          const headerText = this.buffer.subarray(0, headerEnd).toString('utf8')
          const match = headerText.match(/Content-Length:\s*(\d+)/i)
          if (!match) {
            log('received malformed MCP frame without Content-Length')
            this.buffer = this.buffer.subarray(headerEnd + 4)
            continue
          }

          this.contentLength = Number(match[1])
          this.buffer = this.buffer.subarray(headerEnd + 4)
        }

        if (this.buffer.length < this.contentLength) return

        const payload = this.buffer.subarray(0, this.contentLength).toString('utf8')
        this.buffer = this.buffer.subarray(this.contentLength)
        this.contentLength = null
        this.handlePayload(payload)
        continue
      }

      if (this.protocol === 'json-line') {
        const newlineIndex = this.buffer.indexOf('\n')
        if (newlineIndex === -1) return

        const payload = this.buffer.subarray(0, newlineIndex).toString('utf8').trim()
        this.buffer = this.buffer.subarray(newlineIndex + 1)
        if (!payload) {
          continue
        }

        this.handlePayload(payload)
        continue
      }

      return
    }
  }

  handlePayload(payload) {
    let message
    try {
      message = JSON.parse(payload)
    } catch (error) {
      log(`failed to parse JSON-RPC payload: ${error}`)
      return
    }

    void this.handleMessage(message)
  }

  send(message) {
    if (this.protocol === 'json-line') {
      process.stdout.write(encodeJsonLineMessage(message))
      return
    }

    process.stdout.write(encodeContentLengthMessage(message))
  }

  sendResult(id, result) {
    this.send({ jsonrpc: '2.0', id, result })
  }

  sendError(id, code, message, data) {
    this.send({
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        ...(data === undefined ? {} : { data }),
      },
    })
  }

  async handleMessage(message) {
    if (!message || message.jsonrpc !== '2.0') return

    if (message.id === undefined) {
      if (message.method === 'notifications/initialized') {
        log('client initialized notification received')
      }
      return
    }

    try {
      switch (message.method) {
        case 'initialize':
          this.sendResult(message.id, {
            protocolVersion: message.params?.protocolVersion ?? '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: SERVER_INFO,
            instructions:
              'Use bocha_web_search for live web queries, current events, and fact-checking. Results are numbered [1], [2], ... and include URLs for citation.',
          })
          return

        case 'ping':
          this.sendResult(message.id, {})
          return

        case 'tools/list':
          this.sendResult(message.id, {
            tools: [TOOL_DEFINITION],
          })
          return

        case 'tools/call':
          this.sendResult(message.id, await this.handleToolCall(message.params))
          return

        default:
          this.sendError(message.id, -32601, `Method not found: ${message.method}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      log(`unhandled server error: ${errorMessage}`)
      this.sendError(message.id, -32603, errorMessage)
    }
  }

  async handleToolCall(params = {}) {
    if (params.name !== TOOL_NAME) {
      return {
        content: [{ type: 'text', text: `Unknown tool: ${params.name}` }],
        isError: true,
      }
    }

    try {
      const result = await bochaWebSearch(params.arguments ?? {})
      return buildToolResult(result.query, result)
    } catch (error) {
      if (error instanceof BochaError) {
        const details = [
          error.message,
          error.logId ? `log_id: ${error.logId}` : null,
        ].filter(Boolean)

        return {
          content: [{ type: 'text', text: details.join('\n') }],
          isError: true,
        }
      }

      throw error
    }
  }
}

new StdioJsonRpcServer().start()
log('server started')
