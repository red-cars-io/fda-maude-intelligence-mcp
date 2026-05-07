import Apify from 'apify';
import { Actor } from 'apify';
import { searchEvents, searchClearances, searchEnforcement, countEventsByQuarter } from './fda-api.js';
import { computePercentile, computeComposite, generatePeerNarrative, riskLevel, recallRate } from './scoring.js';

const { charge } = Actor;

const TOOL_PRICES: Record<string, number> = {
    compare_device_peers: 0.15,
    analyze_recall_chain: 0.10,
    score_manufacturer: 0.08,
    track_adverse_event_trends: 0.08,
    get_device_clearance_history: 0.05,
    get_recall_details: 0.05,
    search_adverse_events: 0.05,
};

async function chargePPE(toolName: string): Promise<void> {
    const price = TOOL_PRICES[toolName];
    if (!price) return;
    try {
        await Actor.charge(toolName, { amount: price });
    } catch (err) {
        console.error(`[ppe] charge failed for ${toolName}:`, err);
    }
}

// ─── compareDevicePeers ───────────────────────────────────────────────────────

interface CompareDevicePeersParams {
    company_a: string;
    company_b: string;
    product_code: string;
}

export async function compareDevicePeers(params: CompareDevicePeersParams) {
    const { company_a, company_b, product_code } = params;

    // Fetch cohort events for the product_code to build percentile cohorts
    const cohortResult = await searchEvents({ product_code, max_results: 100 });

    // Build sorted arrays for percentile calculation
    const eventsPerDevice: number[] = [];
    const classICounts: number[] = [];
    const velocities: number[] = [];

    // Group events by manufacturer
    const manufacturerEvents: Record<string, number> = {};
    const manufacturerClassI: Record<string, number> = {};
    const manufacturerClearances: Record<string, number> = {};

    for (const event of cohortResult.events) {
        const m = event.manufacturer;
        manufacturerEvents[m] = (manufacturerEvents[m] || 0) + 1;
    }

    // Fetch clearances to estimate clearance velocity per manufacturer
    const clearancesResult = await searchClearances({ product_code, max_results: 200 });
    for (const cl of clearancesResult.clearances) {
        const m = cl.applicant;
        manufacturerClearances[m] = (manufacturerClearances[m] || 0) + 1;
    }

    // Fetch Class I recalls for product_code (may fail on API limits — degrade gracefully)
    let recallsResult: { recalls: Array<{ recalling_firm: string; classification: string; recall_id: string; device_description: string; recall_initiation_date: string; product_code: string; status: string }> } = { recalls: [] };
    try {
        recallsResult = await searchEnforcement({ product_code, classification: 'Class I', max_results: 100 });
    } catch (err) {
        console.warn('[compareDevicePeers] enforcement search failed:', err);
    }
    for (const recall of recallsResult.recalls) {
        const m = recall.recalling_firm;
        manufacturerClassI[m] = (manufacturerClassI[m] || 0) + 1;
    }

    // Collect companies that have data
    const companies = new Set([
        ...Object.keys(manufacturerEvents),
        ...Object.keys(manufacturerClassI),
        ...Object.keys(manufacturerClearances),
    ]);

    for (const company of companies) {
        const ev = manufacturerEvents[company] || 0;
        const clearances = manufacturerClearances[company] || 1;
        const classI = manufacturerClassI[company] || 0;

        eventsPerDevice.push(ev / clearances);
        classICounts.push(classI);
        velocities.push(clearances);
    }

    eventsPerDevice.sort((a, b) => a - b);
    classICounts.sort((a, b) => a - b);
    velocities.sort((a, b) => a - b);

    function scoreCompany(name: string) {
        const ev = manufacturerEvents[name] || 0;
        const clearances = manufacturerClearances[name] || 1;
        const classI = manufacturerClassI[name] || 0;

        const eventsPerDev = ev / clearances;
        const eventsPctile = computePercentile(eventsPerDev, eventsPerDevice);
        const recallPctile = computePercentile(classI, classICounts);
        const velocityPctile = computePercentile(clearances, velocities);
        const composite = computeComposite(eventsPctile, recallPctile, velocityPctile);
        // Guard: if no data found for company, composite can be very low or 0
        // Ensure minimum score of 10 so tool always returns meaningful signal
        const safeComposite = composite === 0 && ev === 0 && classI === 0 ? 10 : composite;

        return {
            company_name: name,
            event_count: ev,
            class_i_recalls: classI,
            clearance_count: clearances,
            events_per_device: Math.round(eventsPerDev * 100) / 100,
            composite_score: Math.round(safeComposite * 10) / 10,
            events_percentile: eventsPctile,
            recall_percentile: recallPctile,
            velocity_percentile: velocityPctile,
        };
    }

    const aData = scoreCompany(company_a);
    const bData = scoreCompany(company_b);

    const delta = {
        events_a: aData.events_per_device,
        events_b: bData.events_per_device,
        recalls_a: aData.class_i_recalls,
        recalls_b: bData.class_i_recalls,
        velocity_a: aData.clearance_count,
        velocity_b: bData.clearance_count,
    };
    const winner = aData.composite_score >= bData.composite_score ? company_a : company_b;
    const narrative = generatePeerNarrative(delta, winner);

    return {
        company_a: aData,
        company_b: bData,
        winner,
        narrative,
    };
}

// ─── analyzeRecallChain ──────────────────────────────────────────────────────

interface AnalyzeRecallChainParams {
    root_company: string;
    product_code?: string;
    max_depth?: number;
}

export async function analyzeRecallChain(params: AnalyzeRecallChainParams) {
    const { root_company, product_code, max_depth = 3 } = params;

    // Approximate component hierarchy via product_code sharing
    // Fetch all recalls for the root company
    const rootRecalls = await searchEnforcement({ recalling_firm: root_company, max_results: 100 });

    const chain: Array<{
        recall_id: string;
        device_description: string;
        classification: string;
        recall_initiation_date: string;
        product_code: string;
        status: string;
    }> = [];

    for (const recall of rootRecalls.recalls) {
        chain.push(recall);
    }

    // If product_code provided, trace related recalls
    if (product_code) {
        const relatedRecalls = await searchEnforcement({ product_code, max_results: 50 });
        for (const r of relatedRecalls.recalls) {
            if (!chain.find(c => c.recall_id === r.recall_id)) {
                chain.push(r);
            }
        }
    }

    const classICount = chain.filter(r => r.classification === 'Class I').length;
    const classIICount = chain.filter(r => r.classification === 'Class II').length;
    const classIIICount = chain.filter(r => r.classification === 'Class III').length;

    return {
        root_company,
        chain,
        summary: {
            total_recalls: chain.length,
            class_i: classICount,
            class_ii: classIICount,
            class_iii: classIIICount,
        },
    };
}

// ─── scoreManufacturer ─────────────────────────────────────────────────────────

interface ScoreManufacturerParams {
    manufacturer: string;
}

export async function scoreManufacturer(params: ScoreManufacturerParams) {
    const { manufacturer } = params;

    const [eventsResult, clearancesResult, recallsResult] = await Promise.all([
        searchEvents({ manufacturer, max_results: 100 }),
        searchClearances({ applicant: manufacturer, max_results: 100 }),
        searchEnforcement({ recalling_firm: manufacturer, max_results: 50 }),
    ]);

    const totalEvents = eventsResult.events.length;
    const totalClearances = clearancesResult.clearances.length;
    const totalRecalls = recallsResult.recalls.length;
    const classI = recallsResult.recalls.filter(r => r.classification === 'Class I').length;

    const rate = recallRate(classI, totalRecalls - classI, totalClearances);
    const eventsPerDevice = totalClearances > 0 ? totalEvents / totalClearances : totalEvents;

    const eventsPctile = computePercentile(eventsPerDevice, [eventsPerDevice]);
    const recallPctile = computePercentile(classI, [classI]);
    const overall_score = computeComposite(eventsPctile, recallPctile, null);
    const risk = riskLevel(overall_score);

    // Collect device categories
    const deviceCategories = new Set<string>();
    for (const event of eventsResult.events) {
        if (event.product_code) deviceCategories.add(event.product_code);
    }
    for (const cl of clearancesResult.clearances) {
        if (cl.product_code) deviceCategories.add(cl.product_code);
    }

    return {
        manufacturer,
        overall_score: Math.round(overall_score * 10) / 10,
        risk_level: risk,
        total_events: totalEvents,
        total_clearances: totalClearances,
        total_recalls: totalRecalls,
        class_i_recalls: classI,
        recall_rate: Math.round(rate * 1000) / 1000,
        device_categories: Array.from(deviceCategories).slice(0, 20),
    };
}

// ─── trackAdverseEventTrends ──────────────────────────────────────────────────

interface TrackAdverseEventTrendsParams {
    device_name?: string;
    manufacturer?: string;
    product_code?: string;
    quarters?: number;
}

export async function trackAdverseEventTrends(params: TrackAdverseEventTrendsParams) {
    const { device_name, manufacturer, product_code, quarters = 8 } = params;

    const byQuarter = await countEventsByQuarter(device_name, manufacturer, product_code, quarters);

    // Sort quarters chronologically
    const sortedQuarters = Object.keys(byQuarter).sort((a, b) => {
        const [qA, yA] = a.split(' ');
        const [qB, yB] = b.split(' ');
        if (yA !== yB) return yA.localeCompare(yB);
        return qA.localeCompare(qB);
    });

    const counts = sortedQuarters.map(q => byQuarter[q]);
    const avg = counts.length > 0 ? counts.reduce((s, c) => s + c, 0) / counts.length : 0;

    const deltas: number[] = [];
    for (let i = 1; i < counts.length; i++) {
        deltas.push(counts[i] - counts[i - 1]);
    }

    const spike = deltas.some(d => d > avg * 2);
    const spike_quarters = deltas
        .map((d, i) => ({ delta: d, quarter: sortedQuarters[i + 1] }))
        .filter(x => x.delta > avg * 2)
        .map(x => x.quarter);

    return {
        device_name,
        manufacturer,
        product_code,
        by_quarter: byQuarter,
        sorted_quarters: sortedQuarters,
        counts,
        avg_events_per_quarter: Math.round(avg * 10) / 10,
        spike_detected: spike,
        spike_quarters,
        trend: deltas.every(d => d > 0) ? 'increasing' : deltas.every(d => d < 0) ? 'decreasing' : 'variable',
    };
}

// ─── searchAdverseEvents (delegator) ─────────────────────────────────────────

interface SearchAdverseEventsParams {
    device_name?: string;
    manufacturer?: string;
    product_code?: string;
    date_from?: string;
    date_to?: string;
    max_results?: number;
}

export async function searchAdverseEvents(params: SearchAdverseEventsParams) {
    return searchEvents(params);
}

// ─── getDeviceClearanceHistory (delegator) ───────────────────────────────────

interface GetDeviceClearanceHistoryParams {
    applicant?: string;
    product_code?: string;
    device_name?: string;
    date_from?: string;
    date_to?: string;
    max_results?: number;
}

export async function getDeviceClearanceHistory(params: GetDeviceClearanceHistoryParams) {
    return searchClearances(params);
}

// ─── getRecallDetails (delegator) ───────────────────────────────────────────

interface GetRecallDetailsParams {
    recalling_firm?: string;
    product_code?: string;
    classification?: string;
    date_from?: string;
    date_to?: string;
    max_results?: number;
}

export async function getRecallDetails(params: GetRecallDetailsParams) {
    return searchEnforcement(params);
}

// ─── handleTool dispatcher ───────────────────────────────────────────────────

type ToolName =
    | 'compare_device_peers'
    | 'analyze_recall_chain'
    | 'score_manufacturer'
    | 'track_adverse_event_trends'
    | 'search_adverse_events'
    | 'get_device_clearance_history'
    | 'get_recall_details';

export async function handleTool(toolName: string, params: Record<string, any>): Promise<any> {
    await chargePPE(toolName);

    switch (toolName as ToolName) {
        case 'compare_device_peers':
            return compareDevicePeers(params);
        case 'analyze_recall_chain':
            return analyzeRecallChain(params);
        case 'score_manufacturer':
            return scoreManufacturer(params);
        case 'track_adverse_event_trends':
            return trackAdverseEventTrends(params);
        case 'search_adverse_events':
            return searchAdverseEvents(params);
        case 'get_device_clearance_history':
            return getDeviceClearanceHistory(params);
        case 'get_recall_details':
            return getRecallDetails(params);
        default:
            throw new Error(`Unknown tool: ${toolName}`);
    }
}