import { describe, expect, it } from 'vitest';
import { fetchFDA, searchEvents, searchClearances, searchEnforcement } from '../src/fda-api.js';

describe('FDA API', () => {
    it('fetchFDA returns valid structure for event endpoint', async () => {
        const result = await fetchFDA('event', { limit: 2 });
        expect(result).toHaveProperty('results');
        expect(result).toHaveProperty('meta');
    });

    it('searchEvents returns events array', async () => {
        const result = await searchEvents({ device_name: 'pacemaker', max_results: 5 });
        expect(result).toHaveProperty('events');
        expect(Array.isArray(result.events)).toBe(true);
        expect(result).toHaveProperty('source', 'FDA MAUDE');
    });

    it('searchClearances returns clearances array', async () => {
        const result = await searchClearances({ applicant: 'medtronic', max_results: 5 });
        expect(result).toHaveProperty('clearances');
        expect(Array.isArray(result.clearances)).toBe(true);
        expect(result).toHaveProperty('source', 'FDA 510(k)');
    });

    it('searchEnforcement returns recalls array', async () => {
        const result = await searchEnforcement({ recalling_firm: 'zimmer', max_results: 5 });
        expect(result).toHaveProperty('recalls');
        expect(Array.isArray(result.recalls)).toBe(true);
        expect(result).toHaveProperty('source', 'FDA Enforcement');
    });

    it('searchEvents with product_code filter', async () => {
        const result = await searchEvents({ product_code: 'DQD', max_results: 5 });
        result.events.forEach((e: any) => {
            expect(e.product_code).toBe('DQD');
        });
    });

    it('searchEvents aggregates total correctly', async () => {
        const result = await searchEvents({ device_name: 'pacemaker' });
        expect(result).toHaveProperty('total_events');
        expect(typeof result.total_events).toBe('number');
    });
});