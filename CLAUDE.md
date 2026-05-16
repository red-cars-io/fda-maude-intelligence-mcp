# FDA MAUDE Intelligence

**Type**: Apify MCP Actor (TypeScript)
**Purpose**: Medtech peer benchmarking — compare device manufacturer safety profiles against product-code peers using FDA MAUDE, 510(k), and enforcement data
**Stack**: Apify SDK, CheerioCrawler (HTTP API scraping), MCP protocol, standby mode

## Quick Start

```bash
cd ~/Projects/apify-actors/fda-maude-intelligence-mcp
apify run          # Local development
apify push          # Deploy to Apify
```

## Key Files

- `src/main.ts` — MCP handler entry point with `handleRequest` export
- `.actor/actor.json` — Standby mode enabled (`usesStandbyMode: true`)
- `.actor/input_schema.json` — Tool definitions (tool, manufacturerName, deviceProductCode, dateRange, limit)
- `README.md` — Auto-generated on build

## Architecture

- Standby MCP via `handleRequest` export
- Readiness probe at GET / (checks `x-apify-container-server-readiness-probe` header)
- Uses Apify SDK log package (`apify/log`)
- PPE configured — $0.03–0.15/tool depending on scope
- Data sources: FDA MAUDE adverse events, 510(k) clearances, PMA approvals, enforcement actions

## Tools

| Tool | Description | PPE |
|------|-------------|-----|
| `search_maude` | Search MAUDE adverse event reports by manufacturer/product code | $0.03 |
| `search_510k` | Search 510(k) premarket clearances | $0.05 |
| `manufacturer_profile` | Full safety profile: MAUDE + 510k + enforcement aggregate | $0.15 |

## Notes

- Health check cron: `~/bin/fleet-health.sh`
- Deployed at: `red-cars--fda-maude-intelligence-mcp.apify.actor`
- Uses openFDA API (no auth required) — rate limit aware
- FDA data is public domain; no proxy needed