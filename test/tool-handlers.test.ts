import { describe, it, expect } from 'vitest';
import { handleTool } from '../src/tool-handlers.js';

describe('handleTool — compare_device_peers', () => {
    it('returns object with company_a and company_b', async () => {
        const result = await handleTool('compare_device_peers', {
            company_a: 'Medtronic',
            company_b: 'Abbott',
            product_code: 'MVN'
        });
        expect(result).toHaveProperty('company_a');
        expect(result).toHaveProperty('company_b');
    });

    it('company_a has composite_score', async () => {
        const result = await handleTool('compare_device_peers', {
            company_a: 'Medtronic',
            company_b: 'Boston Scientific',
            product_code: 'MVN'
        });
        expect(typeof result.company_a.composite_score).toBe('number');
        expect(result.company_a.composite_score).toBeGreaterThan(0);
        expect(result.company_a.composite_score).toBeLessThanOrEqual(100);
    });
});

describe('handleTool — score_manufacturer', () => {
    it('returns manufacturer score and risk_level', async () => {
        const result = await handleTool('score_manufacturer', {
            manufacturer: 'Medtronic'
        });
        expect(result).toHaveProperty('overall_score');
        expect(result).toHaveProperty('risk_level');
        expect(result).toHaveProperty('device_categories');
    });
});

describe('handleTool — search_adverse_events', () => {
    it('returns events array', async () => {
        const result = await handleTool('search_adverse_events', {
            device_name: 'pacemaker',
            max_results: 5
        });
        expect(result).toHaveProperty('events');
        expect(Array.isArray(result.events)).toBe(true);
    });
});

describe('handleTool — get_recall_details', () => {
    it('returns recalls array', async () => {
        const result = await handleTool('get_recall_details', {
            recalling_firm: 'zimmer',
            max_results: 5
        });
        expect(result).toHaveProperty('recalls');
        expect(Array.isArray(result.recalls)).toBe(true);
    });
});