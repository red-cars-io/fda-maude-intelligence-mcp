const FDA_BASE = 'https://api.fda.gov/device';

export async function fetchFDA(endpoint: string, opts: { search?: string; limit?: number; count?: string } = {}): Promise<any> {
    const params = new URLSearchParams();
    if (opts.search) params.set('search', opts.search);
    if (opts.limit) params.set('limit', opts.limit.toString());
    if (opts.count) params.set('count', opts.count);

    const url = `${FDA_BASE}/${endpoint}.json?${params}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`FDA API error ${resp.status}: ${url}`);
    return resp.json();
}

export interface SearchEventsParams {
    device_name?: string;
    manufacturer?: string;
    product_code?: string;
    date_from?: string;
    date_to?: string;
    max_results?: number;
}

export interface SearchClearancesParams {
    applicant?: string;
    product_code?: string;
    device_name?: string;
    date_from?: string;
    date_to?: string;
    max_results?: number;
}

export interface SearchEnforcementParams {
    recalling_firm?: string;
    product_code?: string;
    classification?: string;
    date_from?: string;
    date_to?: string;
    max_results?: number;
}

export interface EventResult {
    query: SearchEventsParams;
    total_events: number;
    events: Array<{
        event_id: string;
        device_name: string;
        manufacturer: string;
        product_code: string;
        date_of_event: string;
        adverse_event_description: string;
    }>;
    source: string;
}

export interface ClearanceResult {
    query: SearchClearancesParams;
    total_clearances: number;
    clearances: Array<{
        k_number: string;
        device_name: string;
        applicant: string;
        product_code: string;
        decision_date: string;
        decision_code: string;
        submission_type: string;
    }>;
    source: string;
}

export interface EnforcementResult {
    query: SearchEnforcementParams;
    total_recalls: number;
    recalls: Array<{
        recall_id: string;
        device_description: string;
        recalling_firm: string;
        classification: string;
        recall_initiation_date: string;
        product_code: string;
        status: string;
    }>;
    source: string;
}

export async function searchEvents(params: SearchEventsParams = {}): Promise<EventResult> {
    const { device_name, manufacturer, product_code, date_from, date_to, max_results = 25 } = params;
    const searchParts: string[] = [];
    if (device_name) searchParts.push(`device.generic_name:${device_name}`);
    if (manufacturer) searchParts.push(`device.manufacturer_d_name:${manufacturer}`);
    if (product_code) searchParts.push(`device.device_report_product_code:${product_code}`);
    if (date_from && date_to) searchParts.push(`date_of_event:[${date_from}+TO+${date_to}]`);
    const search = searchParts.join('+');

    const result = await fetchFDA('event', { search, limit: max_results });
    const events = (result.results || []).map((e: any) => {
        const dev = Array.isArray(e.device) ? e.device[0] : e.device;
        return {
            event_id: e.event_id || '',
            device_name: dev?.generic_name || '',
            manufacturer: dev?.manufacturer_d_name || '',
            product_code: dev?.device_report_product_code || '',
            date_of_event: e.date_of_event || '',
            adverse_event_description: e.manufacturer_submission_number || ''
        };
    });

    return {
        query: params,
        total_events: result.meta?.results?.total || events.length,
        events,
        source: 'FDA MAUDE'
    };
}

export async function searchClearances(params: SearchClearancesParams = {}): Promise<ClearanceResult> {
    const { applicant, product_code, device_name, date_from, date_to, max_results = 25 } = params;
    const searchParts: string[] = [];
    if (applicant) searchParts.push(`applicant:${applicant}`);
    if (product_code) searchParts.push(`product_code:${product_code}`);
    if (device_name) searchParts.push(`device_name:${device_name}`);
    if (date_from && date_to) searchParts.push(`decision_date:[${date_from}+TO+${date_to}]`);
    const search = searchParts.join('+');

    const result = await fetchFDA('510k', { search, limit: max_results });
    const clearances = (result.results || []).map((c: any) => ({
        k_number: c.k_number || '',
        device_name: c.device_name || '',
        applicant: c.applicant || '',
        product_code: c.product_code || '',
        decision_date: c.decision_date || '',
        decision_code: c.decision_code || '',
        submission_type: c.submission_type || ''
    }));

    return {
        query: params,
        total_clearances: result.meta?.results?.total || clearances.length,
        clearances,
        source: 'FDA 510(k)'
    };
}

export async function searchEnforcement(params: SearchEnforcementParams = {}): Promise<EnforcementResult> {
    const { recalling_firm, product_code, classification, date_from, date_to, max_results = 25 } = params;
    const searchParts: string[] = [];
    if (recalling_firm) searchParts.push(`recalling_firm:${recalling_firm}`);
    if (product_code) searchParts.push(`product_code:${product_code}`);
    if (classification) searchParts.push(`classification:${classification}`);
    if (date_from && date_to) searchParts.push(`recall_initiation_date:[${date_from}+TO+${date_to}]`);
    const search = searchParts.join('+');

    const result = await fetchFDA('enforcement', { search, limit: max_results });
    const recalls = (result.results || []).map((r: any) => ({
        recall_id: r.recall_number || '',
        device_description: r.product_description || '',
        recalling_firm: r.recalling_firm || '',
        classification: r.classification || '',
        recall_initiation_date: r.recall_initiation_date || '',
        product_code: r.product_code || '',
        status: r.status || ''
    }));

    return {
        query: params,
        total_recalls: result.meta?.results?.total || recalls.length,
        recalls,
        source: 'FDA Enforcement'
    };
}

export async function countEventsByQuarter(
    device_name?: string,
    manufacturer?: string,
    product_code?: string,
    quarters = 8
): Promise<Record<string, number>> {
    const searchParts: string[] = [];
    if (device_name) searchParts.push(`device.generic_name:${device_name}`);
    if (manufacturer) searchParts.push(`device.manufacturer_d_name:${manufacturer}`);
    if (product_code) searchParts.push(`device.device_report_product_code:${product_code}`);
    const search = searchParts.join('+');

    const result = await fetchFDA('event', {
        search,
        limit: 1,
        count: 'date_of_event'
    });

    const byQuarter: Record<string, number> = {};
    const countItems = result.results || [];
    countItems.forEach((item: any) => {
        const dateStr = item.date_of_event || '';
        if (dateStr.length >= 4) {
            const year = dateStr.substring(0, 4);
            const month = parseInt(dateStr.substring(4, 6), 10);
            const quarter = `Q${Math.ceil(month / 3)} ${year}`;
            byQuarter[quarter] = (byQuarter[quarter] || 0) + (item.count || 0);
        }
    });

    return byQuarter;
}