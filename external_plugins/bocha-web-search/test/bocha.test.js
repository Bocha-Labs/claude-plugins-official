import test from 'node:test'
import assert from 'node:assert/strict'

import {
  bochaWebSearch,
  buildToolResult,
  normalizeSearchInput,
  parseSearchResults,
  BochaError,
} from '../lib/bocha.js'

function createJsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

test('normalizeSearchInput applies defaults and trims optional filters', () => {
  const input = normalizeSearchInput({
    query: '  claude code plugins  ',
    include: ' docs.anthropic.com | open.bocha.cn ',
    exclude: 'example.com ',
  })

  assert.deepEqual(input, {
    query: 'claude code plugins',
    freshness: 'noLimit',
    count: 10,
    summary: true,
    include: 'docs.anthropic.com | open.bocha.cn',
    exclude: 'example.com',
  })
})

test('parseSearchResults extracts normalized web page results', () => {
  const parsed = parseSearchResults({
    log_id: 'log-123',
    data: {
      webPages: {
        totalEstimatedMatches: 42,
        value: [
          {
            name: 'Bocha',
            url: 'https://open.bocha.cn',
            displayUrl: 'open.bocha.cn',
            snippet: 'Search platform',
            summary: 'Bocha summary',
            siteName: 'Bocha',
            siteIcon: 'https://open.bocha.cn/icon.png',
            dateLastCrawled: '2024-07-22T00:00:00Z',
            language: 'zh-CN',
          },
        ],
      },
    },
  })

  assert.equal(parsed.logId, 'log-123')
  assert.equal(parsed.totalEstimatedMatches, 42)
  assert.equal(parsed.results.length, 1)
  assert.deepEqual(parsed.results[0], {
    name: 'Bocha',
    url: 'https://open.bocha.cn',
    displayUrl: 'open.bocha.cn',
    snippet: 'Search platform',
    summary: 'Bocha summary',
    siteName: 'Bocha',
    siteIcon: 'https://open.bocha.cn/icon.png',
    dateLastCrawled: '2024-07-22T00:00:00Z',
    language: 'zh-CN',
  })
})

test('buildToolResult includes text fallback and structured content', () => {
  const result = buildToolResult('bocha', {
    logId: 'abc',
    totalEstimatedMatches: 1,
    results: [
      {
        name: 'Bocha',
        url: 'https://open.bocha.cn',
        displayUrl: 'open.bocha.cn',
        snippet: 'snippet',
        summary: 'summary',
        siteName: 'Bocha',
        siteIcon: '',
        dateLastCrawled: '',
        language: null,
      },
    ],
  })

  assert.equal(result.structuredContent.query, 'bocha')
  assert.match(result.content[0].text, /\[1\] Bocha/)
  assert.match(result.content[0].text, /References:/)
})

test('bochaWebSearch retries 429 responses and succeeds on the next attempt', async () => {
  const sleepCalls = []
  let calls = 0

  const fetchImpl = async () => {
    calls += 1
    if (calls === 1) {
      return createJsonResponse(429, {
        code: 429,
        log_id: 'retry-1',
        msg: 'too many requests',
      })
    }

    return createJsonResponse(200, {
      code: 200,
      log_id: 'ok-1',
      data: {
        webPages: {
          totalEstimatedMatches: 1,
          value: [
            {
              name: 'Bocha Open Platform',
              url: 'https://open.bocha.cn',
              displayUrl: 'open.bocha.cn',
              snippet: 'Bocha open platform',
              summary: 'Bocha open platform summary',
              siteName: 'Bocha',
              siteIcon: '',
              dateLastCrawled: '2024-07-22T00:00:00Z',
              language: null,
            },
          ],
        },
      },
    })
  }

  const result = await bochaWebSearch(
    { query: 'bocha' },
    {
      apiKey: 'test-key',
      fetchImpl,
      sleep: async ms => {
        sleepCalls.push(ms)
      },
      logger: { error() {} },
    },
  )

  assert.equal(calls, 2)
  assert.deepEqual(sleepCalls, [250])
  assert.equal(result.logId, 'ok-1')
  assert.equal(result.results[0].url, 'https://open.bocha.cn')
})

test('bochaWebSearch surfaces 401 authentication failures clearly', async () => {
  await assert.rejects(
    () =>
      bochaWebSearch(
        { query: 'bocha' },
        {
          apiKey: 'bad-key',
          fetchImpl: async () =>
            createJsonResponse(401, {
              code: 401,
              log_id: 'unauth-1',
              msg: 'invalid key',
            }),
          logger: { error() {} },
        },
      ),
    error => {
      assert.equal(error instanceof BochaError, true)
      assert.equal(error.status, 401)
      assert.match(error.message, /BOCHA_API_KEY/)
      assert.equal(error.logId, 'unauth-1')
      return true
    },
  )
})

test('bochaWebSearch surfaces 403 balance failures clearly', async () => {
  await assert.rejects(
    () =>
      bochaWebSearch(
        { query: 'bocha' },
        {
          apiKey: 'test-key',
          fetchImpl: async () =>
            createJsonResponse(403, {
              code: 403,
              log_id: 'forbidden-1',
              msg: 'insufficient balance',
            }),
          logger: { error() {} },
        },
      ),
    error => {
      assert.equal(error instanceof BochaError, true)
      assert.equal(error.status, 403)
      assert.match(error.message, /balance|resource package/i)
      return true
    },
  )
})

test('bochaWebSearch surfaces 500 server failures clearly', async () => {
  await assert.rejects(
    () =>
      bochaWebSearch(
        { query: 'bocha' },
        {
          apiKey: 'test-key',
          fetchImpl: async () =>
            createJsonResponse(500, {
              code: 500,
              log_id: 'server-1',
              msg: 'internal error',
            }),
          logger: { error() {} },
        },
      ),
    error => {
      assert.equal(error instanceof BochaError, true)
      assert.equal(error.status, 500)
      assert.match(error.message, /server error/i)
      return true
    },
  )
})

test('live Bocha API integration works when BOCHA_API_KEY is set', { skip: !process.env.BOCHA_API_KEY }, async () => {
  const result = await bochaWebSearch(
    {
      query: 'Bocha open platform',
      count: 3,
      freshness: 'noLimit',
      summary: true,
    },
    {
      apiKey: process.env.BOCHA_API_KEY,
      logger: { error() {} },
    },
  )

  assert.equal(typeof result.logId, 'string')
  assert.ok(result.results.length > 0)
  assert.equal(typeof result.results[0].url, 'string')
})
