---
description: Use Bocha Web Search when the user needs current web information, news, or fact checking with cited sources.
---

# Bocha Web Search

Use this skill when live web data is required and the answer cannot safely rely on static model knowledge. Especially suitable for Chinese users:

- Current events, news, and policy updates
- Fact verification with recent web sources
- Product, company, and ecosystem information lookup
- External references gathering before summarizing a topic

## When To Use

Use `bocha_web_search` for requests such as:

- Searching current events, headlines, or policy updates
- Checking whether a claim is true with recent web sources
- Looking up fresh product, company, or ecosystem information
- Gathering external references before summarizing a topic

Avoid this skill when the answer can be completed from repository context or stable built-in knowledge.

## Tool Contract

Call `bocha_web_search` with:

- `query` (required): search keywords or a natural-language question
- `freshness` (optional): `noLimit`, `oneDay`, `oneWeek`, `oneMonth`, or `oneYear`
- `count` (optional): integer from `1` to `50`, default `10`
- `summary` (optional): boolean, default `true`
- `include` (optional): allowed domains separated by `|` or `,`
- `exclude` (optional): blocked domains separated by `|` or `,`

Choose narrower `freshness` values for breaking news and fact verification. Use `include` or `exclude` only when domain scoping materially improves result quality.

## Response Rules

After using the tool:

1. Ground the answer in returned search results only.
2. Cite claims inline with result numbers such as `[1]` and `[2]`.
3. End with a `References` list that maps each citation number to the source URL.
4. Prefer the tool's `summary` field when present, and fall back to `snippet` otherwise.
5. Mention uncertainty when results are sparse, conflicting, or obviously incomplete.
