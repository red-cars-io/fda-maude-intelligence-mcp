// src/main.ts — FDA MAUDE Intelligence MCP Server
// Medtech peer benchmarking via FDA MAUDE/510(k)/Enforcement APIs

import http from 'http';
import Apify, { Actor } from 'apify';
import { handleTool } from './tool-handlers.js';

// MCP manifest
const MCP_MANIFEST = {
    schema_version: '1.0',
    name: 'fda-maude-intelligence-mcp',
    version: '1.0.0',
    description: 'Medtech peer benchmarking intelligence for AI agents. Compare device manufacturers safety profiles against product-code peers using FDA MAUDE, 510(k), and enforcement data.',
    tools: [
        {
            name: 'compare_device_peers',
            description: 'Compare two companies device families by product code. Risk-normalized composite scores + AI narrative. The primary tool for medtech due diligence peer analysis.',
            input_schema: {
                type: 'object',
                properties: {
                    company_a: { type: 'string', description: 'First company name (e.g., "Medtronic")', required: true },
                    company_b: { type: 'string', description: 'Second company name (e.g., "Abbott")', required: true },
                    product_code: { type: 'string', description: 'FDA product code (e.g., "MVN" for pacemakers)' },
                    device_name: { type: 'string', description: 'Device name filter (used if no product_code)' },
                    date_from: { type: 'string', description: 'Start date YYYYMMDD' },
                    date_to: { type: 'string', description: 'End date YYYYMMDD' }
                },
                required: ['company_a', 'company_b']
            },
            output_schema: {
                type: 'object',
                properties: {
                    product_code: { type: 'string' },
                    device_name: { type: 'string' },
                    company_a: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            clearance_count: { type: 'integer' },
                            adverse_events: { type: 'integer' },
                            class_i_recalls: { type: 'integer' },
                            class_ii_recalls: { type: 'integer' },
                            events_per_clearance: { type: 'number' },
                            events_per_clearance_pctile: { type: 'number' },
                            recall_rate_pctile: { type: 'number' },
                            clearance_velocity_pctile: { type: 'number' },
                            composite_score: { type: 'number' },
                            risk_level: { type: 'string' },
                            peer_count: { type: 'integer' }
                        }
                    },
                    company_b: { type: 'object' },
                    winner: { type: 'string' },
                    delta: { type: 'string' },
                    verdict: { type: 'string' },
                    queried_at: { type: 'string' },
                    source: { type: 'string' }
                }
            },
            price: 0.15
        },
        {
            name: 'analyze_recall_chain',
            description: 'Trace component recalls and their cascade to finished devices. Note: true supply chain cascade requires proprietary component data — this approximates via product code hierarchy.',
            input_schema: {
                type: 'object',
                properties: {
                    product_code: { type: 'string', description: 'FDA product code of component device', required: true },
                    recalling_firm: { type: 'string', description: 'Recalling firm name' },
                    date_from: { type: 'string', description: 'Start date YYYYMMDD' },
                    date_to: { type: 'string', description: 'End date YYYYMMDD' }
                },
                required: ['product_code']
            },
            output_schema: {
                type: 'object',
                properties: {
                    product_code: { type: 'string' },
                    component_recalls: { type: 'array' },
                    cascade_summary: { type: 'string' },
                    total_recalls: { type: 'integer' },
                    source: { type: 'string' }
                }
            },
            price: 0.10
        },
        {
            name: 'score_manufacturer',
            description: 'Single-company compliance score + risk surface across all device categories. Returns composite score, per-category breakdown, and risk signals.',
            input_schema: {
                type: 'object',
                properties: {
                    manufacturer: { type: 'string', description: 'Manufacturer name', required: true },
                    date_from: { type: 'string', description: 'Start date YYYYMMDD' },
                    date_to: { type: 'string', description: 'End date YYYYMMDD' }
                },
                required: ['manufacturer']
            },
            output_schema: {
                type: 'object',
                properties: {
                    manufacturer: { type: 'string' },
                    overall_score: { type: 'number' },
                    risk_level: { type: 'string' },
                    total_clearances: { type: 'integer' },
                    total_adverse_events: { type: 'integer' },
                    total_recalls: { type: 'integer' },
                    class_i_recalls: { type: 'integer' },
                    device_categories: { type: 'array' },
                    signals: { type: 'object' },
                    verdict: { type: 'string' },
                    source: { type: 'string' }
                }
            },
            price: 0.08
        },
        {
            name: 'track_adverse_event_trends',
            description: 'Monitor a device adverse event volume over time with QoQ deltas. Identifies spike quarters and trend direction.',
            input_schema: {
                type: 'object',
                properties: {
                    device_name: { type: 'string', description: 'Device name (e.g., "pacemaker")', required: true },
                    manufacturer: { type: 'string', description: 'Manufacturer name' },
                    product_code: { type: 'string', description: 'FDA product code' },
                    quarters: { type: 'integer', description: 'Number of quarters to analyze (default: 8)', default: 8 }
                },
                required: ['device_name']
            },
            output_schema: {
                type: 'object',
                properties: {
                    device_name: { type: 'string' },
                    product_code: { type: 'string' },
                    manufacturer: { type: 'string' },
                    quarters_analyzed: { type: 'integer' },
                    trend: { type: 'array' },
                    trend_direction: { type: 'string' },
                    spike_quarters: { type: 'array' },
                    verdict: { type: 'string' },
                    source: { type: 'string' }
                }
            },
            price: 0.08
        },
        {
            name: 'get_device_clearance_history',
            description: 'Full 510(k) clearance chronology for a device or company. Returns K-numbers, decision dates, and device names.',
            input_schema: {
                type: 'object',
                properties: {
                    device_name: { type: 'string', description: 'Device name' },
                    manufacturer: { type: 'string', description: 'Applicant/manufacturer name' },
                    product_code: { type: 'string', description: 'FDA product code' },
                    date_from: { type: 'string', description: 'Start date YYYYMMDD' },
                    date_to: { type: 'string', description: 'End date YYYYMMDD' },
                    max_results: { type: 'integer', description: 'Maximum results (default: 25)', default: 25 }
                }
            },
            output_schema: {
                type: 'object',
                properties: {
                    query: { type: 'object' },
                    total_clearances: { type: 'integer' },
                    clearances: { type: 'array' },
                    source: { type: 'string' }
                }
            },
            price: 0.05
        },
        {
            name: 'get_recall_details',
            description: 'Deep dive on specific recall by recall ID or firm. Returns full recall metadata including classification, status, and consequences.',
            input_schema: {
                type: 'object',
                properties: {
                    recall_id: { type: 'string', description: 'FDA recall identifier' },
                    recalling_firm: { type: 'string', description: 'Recalling firm name' },
                    product_code: { type: 'string', description: 'FDA product code' },
                    max_results: { type: 'integer', description: 'Maximum results (default: 10)', default: 10 }
                }
            },
            output_schema: {
                type: 'object',
                properties: {
                    query: { type: 'object' },
                    total_recalls: { type: 'integer' },
                    recalls: { type: 'array' },
                    source: { type: 'string' }
                }
            },
            price: 0.05
        },
        {
            name: 'search_adverse_events',
            description: 'Search FDA MAUDE database for medical device adverse event reports with rich filtering by device, manufacturer, and date range.',
            input_schema: {
                type: 'object',
                properties: {
                    device_name: { type: 'string', description: 'Device name (e.g., "pacemaker")' },
                    manufacturer: { type: 'string', description: 'Manufacturer name' },
                    product_code: { type: 'string', description: 'FDA product code' },
                    date_from: { type: 'string', description: 'Start date YYYYMMDD' },
                    date_to: { type: 'string', description: 'End date YYYYMMDD' },
                    max_results: { type: 'integer', description: 'Maximum results (default: 25)', default: 25 }
                }
            },
            output_schema: {
                type: 'object',
                properties: {
                    query: { type: 'object' },
                    total_events: { type: 'integer' },
                    events: { type: 'array' },
                    source: { type: 'string' }
                }
            },
            price: 0.05
        }
    ]
};

// ─── ACTOR INITIALIZATION — ts-standby template pattern ──────────────────────────────────

await Actor.init();

const isStandby = process.env.APIFY_META_ORIGIN === 'STANDBY';
const PORT = Actor.config.get('standbyPort') || 3000;

if (isStandby) {
    const server = http.createServer(async (req, res) => {
        // Readiness probe
        if (req.headers['x-apify-container-server-readiness-probe']) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('OK');
            return;
        }

        // MCP requests
        if (req.method === 'POST' && req.url === '/mcp') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    const jsonBody = JSON.parse(body);
                    const id = jsonBody.id ?? null;

                    const reply = (result: unknown) => {
                        const resp = id !== null
                            ? { jsonrpc: '2.0', id, result }
                            : result;
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(resp));
                    };

                    const replyError = (code: number, message: string) => {
                        const resp = id !== null
                            ? { jsonrpc: '2.0', id, error: { code, message } }
                            : { status: 'error', error: message };
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(resp));
                    };

                    const method = jsonBody.method;

                    if (method === 'initialize') {
                        return reply({
                            protocolVersion: '2024-11-05',
                            capabilities: { tools: {} },
                            serverInfo: { name: 'fda-maude-intelligence-mcp', version: '1.0.0' }
                        });
                    }

                    if (method === 'tools/list' || (!method && jsonBody.tool === 'list')) {
                        return reply({ tools: MCP_MANIFEST.tools });
                    }

                    if (method === 'tools/call') {
                        const toolName = jsonBody.params?.name;
                        const toolArgs = jsonBody.params?.arguments || {};
                        if (!toolName) return replyError(-32602, 'Missing params.name');
                        const toolResult = await handleTool(toolName, toolArgs);
                        return reply({ content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }] });
                    }

                    if (method && method.startsWith('tools/')) {
                        const toolName = method.slice(6);
                        const toolArgs = jsonBody.params || {};
                        const toolResult = await handleTool(toolName, toolArgs);
                        return reply({ content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }] });
                    }

                    if (jsonBody.tool) {
                        const toolResult = await handleTool(jsonBody.tool, jsonBody.params || {});
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: 'success', result: toolResult }));
                        return;
                    }

                    replyError(-32601, `Method not found: ${method}`);
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : String(error);
                    console.error('MCP error:', message);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'error', error: message }));
                }
            });
            return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    });

    await new Promise<void>((resolve, reject) => {
        server.on('error', reject);
        server.listen(PORT, () => {
            console.log(`FDA MAUDE Intelligence MCP listening on port ${PORT}`);
            resolve();
        });
    });

    process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
} else {
    // Batch mode
    const input = await Actor.getInput() as { tool?: string; params?: Record<string, unknown> } | null;
    if (input) {
        const { tool, params = {} } = input;
        if (tool) {
            console.log(`Running tool: ${tool}`);
            const result = await handleTool(tool, params);
            await Actor.setValue('OUTPUT', result);
        }
    }
    await Actor.exit();
}

// Export handleRequest for MCP gateway compatibility
export default {
    handleRequest: async ({ request, log }: { request: { body: unknown }; log: { info: (msg: string) => void; error: (msg: string) => void } }) => {
        log.info('FDA MAUDE Intelligence MCP received request');
        try {
            const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body as { tool?: string; params?: Record<string, unknown> };
            const { tool, params = {} } = body as { tool?: string; params?: Record<string, unknown> };
            const result = await handleTool(tool || '', params || {});
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            log.error(`Error: ${message}`);
            return { content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: message }, null, 2) }] };
        }
    }
};
