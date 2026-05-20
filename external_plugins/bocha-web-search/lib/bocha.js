const BOCHA_API_URL = 'https://api.bocha.cn/v1/web-search'
const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_RETRY_DELAYS_MS = [250, 500, 1000]

export const VALID_FRESHNESS_VALUES = [
  'noLimit',
  'oneDay',
  'oneWeek',
  'oneMonth',
  'oneYear',
]

export class BochaError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'BochaError'
    this.status = options.status
    this.code = options.code
    this.logId = options.logId
    this.retryable = options.retryable ?? false
    this.cause = options.cause
  }
}

export function normalizeSearchInput(input = {}) {
  const query = typeof input.query === 'string' ? input.query.trim() : ''
  if (!query) {
    throw new BochaError('`query` is required and must be a non-empty string.', {
      status: 400,
      code: 'INVALID_QUERY',
    })
  }

  const freshness = input.freshness ?? 'noLimit'
  if (!VALID_FRESHNESS_VALUES.includes(freshness)) {
    throw new BochaError(
      `\`freshness\` must be one of: ${VALID_FRESHNESS_VALUES.join(', ')}.`,
      { status: 400, code: 'INVALID_FRESHNESS' },
    )
  }

  const count = input.count ?? 10
  if (!Number.isInteger(count) || count < 1 || count > 50) {
    throw new BochaError('`count` must be an integer between 1 and 50.', {
      status: 400,
      code: 'INVALID_COUNT',
    })
  }

  if (input.summary !== undefined && typeof input.summary !== 'boolean') {
    throw new BochaError('`summary` must be a boolean when provided.', {
      status: 400,
      code: 'INVALID_SUMMARY',
    })
  }

  for (const field of ['include', 'exclude']) {
    if (input[field] !== undefined && typeof input[field] !== 'string') {
      throw new BochaError(`\`${field}\` must be a string when provided.`, {
        status: 400,
        code: `INVALID_${field.toUpperCase()}`,
      })
    }
  }

  const payload = {
    query,
    freshness,
    count,
    summary: input.summary ?? true,
  }

  if (input.include?.trim()) payload.include = input.include.trim()
  if (input.exclude?.trim()) payload.exclude = input.exclude.trim()

  return payload
}

export function parseSearchResults(responseBody) {
  const webPages = responseBody?.data?.webPages
  const items = Array.isArray(webPages?.value) ? webPages.value : []

  return {
    logId: responseBody?.log_id ?? null,
    totalEstimatedMatches: Number.isFinite(webPages?.totalEstimatedMatches)
      ? webPages.totalEstimatedMatches
      : 0,
    results: items.map(item => ({
      name: item?.name ?? '',
      url: item?.url ?? '',
      displayUrl: item?.displayUrl ?? '',
      snippet: item?.snippet ?? '',
      summary: item?.summary ?? '',
      siteName: item?.siteName ?? '',
      siteIcon: item?.siteIcon ?? '',
      dateLastCrawled: item?.dateLastCrawled ?? '',
      language: item?.language ?? null,
    })),
  }
}

export function formatSearchResults(result) {
  const lines = [
    `Bocha web search results for "${result.query}"`,
    `log_id: ${result.logId ?? 'n/a'}`,
    `total_estimated_matches: ${result.totalEstimatedMatches}`,
  ]

  if (result.results.length === 0) {
    lines.push('No web results returned.')
    return lines.join('\n')
  }

  lines.push('', 'Results:')
  for (const [index, item] of result.results.entries()) {
    lines.push(`[${index + 1}] ${item.name || '(untitled)'}`)
    lines.push(`URL: ${item.url || 'n/a'}`)
    if (item.siteName) lines.push(`Site: ${item.siteName}`)
    if (item.snippet) lines.push(`Snippet: ${item.snippet}`)
    if (item.summary) lines.push(`Summary: ${item.summary}`)
    lines.push('')
  }

  lines.push('References:')
  for (const [index, item] of result.results.entries()) {
    lines.push(`[${index + 1}] ${item.url || '(missing url)'}`)
  }

  return lines.join('\n')
}

export function buildToolResult(query, parsed) {
  const structuredContent = {
    query,
    logId: parsed.logId,
    totalEstimatedMatches: parsed.totalEstimatedMatches,
    results: parsed.results,
  }

  return {
    content: [
      {
        type: 'text',
        text: formatSearchResults({ query, ...parsed }),
      },
    ],
    structuredContent,
  }
}

async function readResponseBody(response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return { msg: text || null }
  }
}

function buildHttpError(response, body) {
  const logId = body?.log_id ?? null
  const apiMessage = body?.msg || body?.message || `HTTP ${response.status}`
  switch (response.status) {
    case 401:
      return new BochaError(
        `Bocha API authentication failed (401). Check the BOCHA_API_KEY environment variable. ${apiMessage}`,
        { status: 401, code: 'UNAUTHORIZED', logId },
      )
    case 403:
      return new BochaError(
        `Bocha API rejected the request (403). Check your Bocha account balance or resource package. ${apiMessage}`,
        { status: 403, code: 'FORBIDDEN', logId },
      )
    case 429:
      return new BochaError(
        `Bocha API rate limit exceeded (429). ${apiMessage}`,
        { status: 429, code: 'RATE_LIMITED', logId, retryable: true },
      )
    default:
      if (response.status >= 500) {
        return new BochaError(
          `Bocha API server error (${response.status}). ${apiMessage}`,
          { status: response.status, code: 'SERVER_ERROR', logId },
        )
      }

      return new BochaError(
        `Bocha API request failed (${response.status}). ${apiMessage}`,
        { status: response.status, code: 'REQUEST_FAILED', logId },
      )
  }
}

function buildResponseCodeError(body) {
  const apiCode = body?.code
  const logId = body?.log_id ?? null
  const apiMessage = body?.msg || `Bocha API returned code ${apiCode}.`
  return new BochaError(`Bocha API error: ${apiMessage}`, {
    status: apiCode,
    code: 'API_ERROR',
    logId,
    retryable: apiCode === 429,
  })
}

export async function bochaWebSearch(
  input,
  {
    fetchImpl = globalThis.fetch,
    sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
    logger = console,
    apiKey = process.env.BOCHA_API_KEY,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
  } = {},
) {
  if (!apiKey) {
    throw new BochaError(
      'BOCHA_API_KEY is not set. Export BOCHA_API_KEY before using the bocha_web_search tool.',
      { status: 401, code: 'MISSING_API_KEY' },
    )
  }

  if (typeof fetchImpl !== 'function') {
    throw new BochaError('Fetch is not available in this runtime.', {
      code: 'FETCH_UNAVAILABLE',
    })
  }

  const payload = normalizeSearchInput(input)

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    const response = await fetchImpl(BOCHA_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    }).catch(error => {
      throw new BochaError(`Bocha API request failed before receiving a response. ${error}`, {
        code: 'NETWORK_ERROR',
        retryable: false,
        cause: error,
      })
    })

    const body = await readResponseBody(response)
    const logId = body?.log_id ?? null

    if (response.ok && (body?.code === undefined || body.code === 200)) {
      logger.error?.(
        `[bocha-web-search] query="${payload.query}" log_id=${logId ?? 'n/a'} count=${payload.count}`,
      )
      return {
        query: payload.query,
        ...parseSearchResults(body),
      }
    }

    const error =
      response.ok && body?.code !== 200
        ? buildResponseCodeError(body)
        : buildHttpError(response, body)

    logger.error?.(
      `[bocha-web-search] request failed status=${error.status ?? 'n/a'} log_id=${error.logId ?? 'n/a'} message=${error.message}`,
    )

    if (error.retryable && attempt < retryDelaysMs.length) {
      await sleep(retryDelaysMs[attempt])
      continue
    }

    throw error
  }

  throw new BochaError('Bocha API request exhausted all retries.', {
    code: 'RETRY_EXHAUSTED',
  })
}
