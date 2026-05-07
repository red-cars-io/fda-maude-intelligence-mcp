# FDA MAUDE Intelligence MCP

AI agent MCP server for medtech peer benchmarking. Compare device manufacturers' safety profiles against product-code peers using FDA MAUDE adverse event data, 510(k) clearance records, and FDA enforcement actions.

**MCP Endpoint:** https://fda-maude-intelligence-mcp.apify.actor/mcp
**GitHub:** [red-cars-io/fda-maude-intelligence-mcp](https://github.com/red-cars-io/fda-maude-intelligence-mcp)
**No API key required.**

---

## 1. Quick Start

Add this MCP server to Claude Desktop, Cursor, or Windsurf:

```json
{
  "mcpServers": {
    "fda-maude-intelligence": {
      "command": "npx",
      "args": ["-y", "@apify/fda-maude-intelligence-mcp"]
    }
  }
}
```

Or connect via remote MCP endpoint:

```json
{
  "mcpServers": {
    "fda-maude-intelligence": {
      "url": "https://fda-maude-intelligence-mcp.apify.actor/mcp"
    }
  }
}
```

---

## 2. What Data Can You Access?

| FDA Data Source | Endpoint | Covers |
|-----------------|----------|--------|
| MAUDE (Manufacturer and User Facility Device Experience) | `api.fda.gov/device/event.json` | Adverse event reports, device failures, injuries, deaths |
| 510(k) Premarket Notifications | `api.fda.gov/device/510k.json` | Device clearance history, predicate devices, submission dates |
| Medical Device Enforcement Reports | `api.fda.gov/device/enforcement.json` | Recalls, corrections, removals |

All three APIs are public and require no API key.

---

## 3. Why Use FDA MAUDE Intelligence MCP?

- **Peer benchmarking** — compare any two device manufacturers against their product-code cohort using risk-adjusted percentile scoring. No other actor in the Apify store does this.
- **No API key required** — FDA public APIs are open. Zero credentials to manage.
- **LLM-optimized JSON output** — every tool returns structured data designed for AI agent consumption, not raw FDA dumps.
- **Medtech due diligence** — VCs, acquirers, and analysts get safety-profile context in seconds, not hours of manual FDA database navigation.
- **Combined MAUDE + 510(k) + enforcement** — cross-reference adverse events with clearance history and recall records in a single session.
- **Pay-per-event pricing** — $0.05 to $0.15 per tool call. No subscription, no minimum spend.

---

## 4. Features

- Compare two device manufacturers by product code with risk-adjusted composite scores
- Trace how component-level recalls cascade to finished device lines
- Score a single manufacturer across compliance, adverse event volume, and recall frequency
- Monitor quarterly adverse event trends for a device or product code
- Pull full 510(k) clearance chronology for any cleared device
- Deep-dive into specific recall records including classification, scope, and firm response
- Search MAUDE adverse event reports with product code, date range, and event type filters
- LLM agent-ready output format — structured JSON with confidence flags
- No authentication — FDA public API calls handled server-side
- Standalone MCP server — connects to any MCP-compatible AI agent client
- Deployed on Apify with standby mode — responds in milliseconds

---

## 5. Use Cases

### Medtech VC Due Diligence

Compare two cardiac device manufacturers in a single agent session.

```json
{
  "tool": "compare_device_peers",
  "parameters": {
    "company_a": "Medtronic",
    "company_b": "Abbott",
    "product_code": "MDI",
    "date_range": "2020-01-01 to 2024-12-31"
  }
}
```

### Recall Risk Analysis

Track adverse event trends for a pacemaker product line before an acquisition review.

```json
{
  "tool": "track_adverse_event_trends",
  "parameters": {
    "device_name": "Cardiac Pacemaker",
    "product_code": "LTO",
    "quarters": 8
  }
}
```

### Competitive Intelligence

Benchmark safety profiles across peer companies in the orthopedic implant space.

```json
{
  "tool": "score_manufacturer",
  "parameters": {
    "company_name": "Stryker",
    "product_code": "HSD",
    "date_range": "2022-01-01 to 2024-12-31"
  }
}
```

### Component Recall Tracing

Trace how a supplier recall cascades to OEM finished device lines.

```json
{
  "tool": "analyze_recall_chain",
  "parameters": {
    "component_recall_id": "BK-2020-12345",
    "finish_device_manufacturer": "Boston Scientific"
  }
}
```

---

## 6. How to Connect

**Step 1:** Add the MCP server configuration to your AI agent client (Claude Desktop, Cursor, or Windsurf).

**Step 2:** Use the remote endpoint `https://fda-maude-intelligence-mcp.apify.actor/mcp` for zero-setup connectivity, or install via `npx @apify/fda-maude-intelligence-mcp`.

**Step 3:** Verify connectivity by calling `search_adverse_events` with a test product code.

**Step 4:** Call any of the 7 tools to pull FDA data. No API key needed.

---

## 7. MCP Tools Reference

| Tool | Price | Best for |
|------|-------|----------|
| `compare_device_peers` | $0.15 | Comparing two companies by product code, risk-adjusted |
| `analyze_recall_chain` | $0.10 | Tracing component recall cascade to finished devices |
| `score_manufacturer` | $0.08 | Single-company compliance score and risk surface |
| `track_adverse_event_trends` | $0.08 | QoQ adverse event trend with deltas |
| `get_device_clearance_history` | $0.05 | 510(k) clearance chronology |
| `get_recall_details` | $0.05 | Deep dive on a specific recall |
| `search_adverse_events` | $0.05 | MAUDE event search with filters |

---

## 8. Tool Parameters

### compare_device_peers
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `company_a` | string | Yes | First company name |
| `company_b` | string | Yes | Second company name |
| `product_code` | string | Yes | FDA product code (e.g., `MDI`, `LTO`, `HSD`) |
| `date_range` | string | No | Date range in `YYYY-MM-DD to YYYY-MM-DD` format |

### analyze_recall_chain
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `component_recall_id` | string | Yes | FDA enforcement report ID |
| `finish_device_manufacturer` | string | No | Filter to a specific OEM manufacturer |

### score_manufacturer
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `company_name` | string | Yes | Full legal company name |
| `product_code` | string | No | Filter to a specific product code |
| `date_range` | string | No | Date range in `YYYY-MM-DD to YYYY-MM-DD` format |

### track_adverse_event_trends
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `device_name` | string | No | Device name or brand name |
| `product_code` | string | No | FDA product code |
| `quarters` | integer | Yes | Number of quarters to analyze (max 20) |

### get_device_clearance_history
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `device_name` | string | Yes | Device name as it appears in 510(k) database |

### get_recall_details
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recall_id` | string | Yes | FDA recall identifier |

### search_adverse_events
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `device_name` | string | No | Device name |
| `product_code` | string | No | FDA product code |
| `date_range` | string | No | Date range in `YYYY-MM-DD to YYYY-MM-DD` format |
| `event_type` | string | No | Filter by event type (e.g., `death`, `injury`, `malfunction`) |

---

## 9. Connection Examples

### Claude Desktop

```json
{
  "mcpServers": {
    "fda-maude-intelligence": {
      "url": "https://fda-maude-intelligence-mcp.apify.actor/mcp"
    }
  }
}
```

### cURL (MCP protocol)

```bash
curl -X POST https://fda-maude-intelligence-mcp.apify.actor/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_adverse_events","arguments":{"product_code":"MDI","date_range":"2023-01-01 to 2024-12-31"}},"id":1}'
```

### Cursor

Add to Cursor AI settings under MCP Servers using the remote endpoint URL.

### Windsurf

Add to Windsurf MCP settings using the same remote endpoint configuration.

---

## 10. Output Example — compare_device_peers

```json
{
  "peer_comparison": {
    "company_a": {
      "name": "Medtronic",
      "product_code": "MDI",
      "adverse_event_count": 1847,
      "recall_count": 3,
      "risk_percentile": 72,
      "compliance_score": 68
    },
    "company_b": {
      "name": "Abbott",
      "product_code": "MDI",
      "adverse_event_count": 1204,
      "recall_count": 1,
      "risk_percentile": 41,
      "compliance_score": 81
    },
    "comparator": {
      "product_code_peers": 23,
      "cohort_avg_adverse_events": 1350,
      "cohort_avg_recall_count": 1.8,
      "winner": "Abbott",
      "delta": {
        "risk_percentile_a_vs_b": 31,
        "compliance_score_delta": 13
      }
    }
  }
}
```

---

## 11. Output Fields Explained

| Field | Description |
|-------|-------------|
| `risk_percentile` | Where this manufacturer falls in its product-code cohort. Higher = worse safety profile. |
| `compliance_score` | Composite 0-100 score combining event rate, recall frequency, and enforcement history. |
| `adverse_event_count` | Total MAUDE reports filtered to company + product code + date range. |
| `recall_count` | Number of distinct FDA enforcement actions in the period. |
| `cohort_avg_*` | Benchmark values for all companies sharing the same product code. |
| `delta` | Difference between the two peer companies on risk percentile and compliance score. |
| `winner` | The better-performing company based on risk-adjusted composite scoring. |

---

## 12. Pricing

All tools use Apify Pay-Per-Event (PPE) pricing. No monthly fee, no subscription, no minimum spend.

| Tool | Price per call |
|------|---------------|
| `compare_device_peers` | $0.15 |
| `analyze_recall_chain` | $0.10 |
| `score_manufacturer` | $0.08 |
| `track_adverse_event_trends` | $0.08 |
| `get_device_clearance_history` | $0.05 |
| `get_recall_details` | $0.05 |
| `search_adverse_events` | $0.05 |

View on Apify Store: [FDA MAUDE Intelligence MCP](https://apify.com/store/mcp/fda-maude-intelligence-mcp)

---

## 13. How It Works

The FDA MAUDE Intelligence MCP runs as an Apify Standby Actor with a full MCP protocol interface. When an AI agent calls a tool:

1. **Request received** — MCP JSON-RPC call hits the standby endpoint
2. **FDA API query** — actor queries the relevant api.fda.gov endpoint (MAUDE, 510(k), or enforcement) with the tool parameters
3. **Risk calculation** — adverse event counts are normalized against product-code cohort size and weighted by event severity
4. **Composite scoring** — percentile rank and compliance score computed from normalized metrics
5. **JSON response** — structured output returned to the AI agent via MCP protocol

Data flows directly from FDA public APIs through the actor to the AI agent. No data is stored. No API key required — the actor handles all FDA API communication server-side.

---

## 14. Tips for Best Results

- **Use product codes** — `product_code` filters are the most precise way to isolate device types. Use FDA product code lookups when possible.
- **Scope with date ranges** — filter to the relevant review period (e.g., last 2-3 years) for fresher adverse event data.
- **Combine for due diligence** — run `score_manufacturer` first for a single-company summary, then `compare_device_peers` for a head-to-head.
- **Check 510(k) history** — use `get_device_clearance_history` when evaluating pre-market status of a target's device portfolio.
- **Run recall chain early** — `analyze_recall_chain` surfaces supplier-level risk before component issues hit finished device lines.
- **Use event_type filter** — when researching device safety, filter to `death` or `injury` events to cut through low-severity noise.

---

## 15. Combine with Other Actors

FDA MAUDE Intelligence MCP pairs with related actors for deeper due diligence:

**Healthcare Compliance MCP** — expands device-level findings into full regulatory compliance audits covering FDA 483 observations, warning letters, and import alerts.

**Company Intelligence MCP** — cross-references the same company against sanctions lists (OFAC, BIS), debarment records, and adverse media.

**Patent Search MCP** — looks up 510(k) numbers to find associated patent filings. K-numbers from the clearance history map directly to patent search queries.

Run all three in a single agent session for a complete medtech acquisition target profile.

---

## 16. Related Actors

- [Healthcare Compliance MCP](https://apify.com/store/mcp/healthcare-compliance-mcp) — FDA regulatory compliance for device manufacturers
- [Company Intelligence MCP](https://apify.com/store/mcp/company-intelligence-mcp) — sanctions screening and adverse media for medtech companies
- [Patent Search MCP](https://apify.com/store/mcp/patent-search-mcp) — patent lookup by 510(k) K-number

---

## 17. Troubleshooting

**MCP connection fails**
Verify the remote endpoint URL is correct: `https://fda-maude-intelligence-mcp.apify.actor/mcp`. Check that your AI agent client supports remote MCP servers.

**No data returned**
FDA public APIs occasionally return empty result sets for obscure product codes. Try broadening the date range or using a more common device name.

**Tool returns unexpected fields**
The actor normalizes FDA API responses into a consistent schema. Field names may differ from raw FDA API output. See Section 11 for field definitions.

**Rate limiting**
FDA API has internal rate limits. The actor handles retries automatically. If you need higher throughput, consider batching requests.

---

## 18. SEO and LLM Optimization

**Meta description:** AI agent MCP server for medtech peer benchmarking. Compare device manufacturers' safety profiles using FDA MAUDE, 510(k), and enforcement data. No API key required.

**Keywords:** AI agent, LLM, MCP server, medtech due diligence, FDA MAUDE, medical device benchmarking, adverse event analysis, 510(k) lookup, recall chain analysis, device compliance score, peer comparison, medtech VC tools, no API key needed,医疗器械, 医疗设备合规, FDA认证

**JSON-LD Schema:**

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "FDA MAUDE Intelligence MCP",
  "description": "AI agent MCP server for medtech peer benchmarking. Compare device manufacturers safety profiles using FDA MAUDE, 510(k), and enforcement data.",
  "url": "https://apify.com/store/mcp/fda-maude-intelligence-mcp",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Any",
  "offers": {
    "@type": "Offer",
    "price": "0.05",
    "priceCurrency": "USD",
    "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "unitCode": "EACH"
    }
  },
  "provider": {
    "@type": "Organization",
    "name": "red-cars-io",
    "url": "https://github.com/red-cars-io"
  }
}
```

**GitHub topics:** `mcp-server` `medtech` `fda` `maude` `medical-devices` `due-diligence` `ai-agent` `llm-tools` `apify` `healthcare` `510k` `adverse-events`

---