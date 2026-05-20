---
name: bocha-web-search
description: This skill should be used when the user asks for real-time information, latest news, fact checking, or fresh web research. Use it with the bocha_web_search tool and cite results as [1], [2], ... with a references list.
version: 0.1.0
---

# Bocha Web Search

Use this skill when live web data is required and the answer cannot safely rely on static model knowledge.

## When To Use

Use `bocha_web_search` for requests such as:

- Searching current events, headlines, or policy updates
- Checking whether a claim is true with recent web sources
- Looking up fresh product, company, or ecosystem information
- Gathering external references before summarizing a topic

Avoid this skill when the answer can be completed from repository context or from stable built-in knowledge.

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

## Suggested Workflow

1. Write a focused `query`.
2. Set `freshness` based on how current the answer must be.
3. Inspect the numbered results and identify the strongest sources.
4. Synthesize the answer with explicit citations.
5. Append a `References` section with the URLs that were actually used.
