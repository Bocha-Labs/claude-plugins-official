import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(__dirname, '..', 'server.js')

function encodeMessage(message) {
  const json = JSON.stringify(message)
  return `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`
}

function createMcpClient(child) {
  let buffer = Buffer.alloc(0)
  let contentLength = null
  const pending = new Map()

  child.stdout.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk])

    while (true) {
      if (contentLength == null) {
        const headerEnd = buffer.indexOf('\r\n\r\n')
        if (headerEnd === -1) return

        const headerText = buffer.subarray(0, headerEnd).toString('utf8')
        const match = headerText.match(/Content-Length:\s*(\d+)/i)
        if (!match) throw new Error(`Missing Content-Length header: ${headerText}`)
        contentLength = Number(match[1])
        buffer = buffer.subarray(headerEnd + 4)
      }

      if (buffer.length < contentLength) return

      const payload = buffer.subarray(0, contentLength).toString('utf8')
      buffer = buffer.subarray(contentLength)
      contentLength = null

      const message = JSON.parse(payload)
      const resolver = pending.get(message.id)
      if (resolver) {
        pending.delete(message.id)
        resolver(message)
      }
    }
  })

  return {
    request(id, method, params) {
      const promise = new Promise(resolve => pending.set(id, resolve))
      child.stdin.write(encodeMessage({ jsonrpc: '2.0', id, method, params }))
      return promise
    },
    notify(method, params) {
      child.stdin.write(encodeMessage({ jsonrpc: '2.0', method, params }))
    },
  }
}

test('MCP server lists bocha_web_search and returns a missing-key error without credentials', async () => {
  const child = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      BOCHA_API_KEY: '',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  const client = createMcpClient(child)

  try {
    const initialize = await client.request(1, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'node-test',
        version: '0.0.0',
      },
    })

    assert.equal(initialize.result.serverInfo.name, 'bocha-web-search')
    client.notify('notifications/initialized', {})

    const tools = await client.request(2, 'tools/list', {})
    assert.ok(Array.isArray(tools.result.tools))
    assert.equal(tools.result.tools[0].name, 'bocha_web_search')

    const call = await client.request(3, 'tools/call', {
      name: 'bocha_web_search',
      arguments: {
        query: 'Bocha open platform',
      },
    })

    assert.equal(call.result.isError, true)
    assert.match(call.result.content[0].text, /BOCHA_API_KEY/)
  } finally {
    child.stdin.end()
    child.kill('SIGTERM')
    await once(child, 'exit')
  }
})
