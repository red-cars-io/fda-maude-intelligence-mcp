import { describe, it, expect } from 'vitest';
import {
    computePercentile,
    computeComposite,
    generatePeerNarrative,
    riskLevel,
    scoreRiskLevel,
    recallRate
} from '../src/scoring.ts';

describe('computePercentile', () => {
    it('returns 50th percentile when value equals median of cohort', () => {
        const cohort = [10, 20, 30, 40, 50];
        expect(computePercentile(30, cohort)).toBe(50);
    });

    it('returns 100 when value is highest in cohort', () => {
        const cohort = [10, 20, 30, 40, 50];
        expect(computePercentile(50, cohort)).toBe(100);
    });

    it('returns 0 when value is lowest in cohort', () => {
        const cohort = [10, 20, 30, 40, 50];
        expect(computePercentile(10, cohort)).toBe(0);
    });

    it('handles empty cohort', () => {
        expect(computePercentile(50, [])).toBe(50);
    });

    it('handles single-item cohort', () => {
        expect(computePercentile(50, [50])).toBe(50);
    });
});

describe('computeComposite', () => {
    it('averages three percentile scores', () => {
        const score = computeComposite(72, 85, 94);
        expect(score).toBeCloseTo(83.7, 1);
    });

    it('handles missing values', () => {
        const score = computeComposite(72, null, 94);
        expect(score).toBeCloseTo(83, 0);
    });
});

describe('riskLevel', () => {
    it('returns LOW for score >= 75', () => {
        expect(riskLevel(83.7)).toBe('LOW');
    });

    it('returns MEDIUM for score 50-74', () => {
        expect(riskLevel(60)).toBe('MEDIUM');
    });

    it('returns HIGH for score 25-49', () => {
        expect(riskLevel(35)).toBe('HIGH');
    });

    it('returns CRITICAL for score < 25', () => {
        expect(riskLevel(15)).toBe('CRITICAL');
    });
});

describe('scoreRiskLevel', () => {
    it('maps LOW to score 0-100', () => {
        expect(['LOW', 'LOW-MEDIUM', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(riskLevel(83))).toBe(true);
    });
});

describe('generatePeerNarrative', () => {
    it('generates narrative when company_a wins', () => {
        const delta = {
            events_a: 54.2, events_b: 52.5,
            recalls_a: 1, recalls_b: 0,
            velocity_a: 23, velocity_b: 17
        };
        const winner = 'Abbott';
        const narrative = generatePeerNarrative(delta, winner);
        expect(narrative).toContain('Abbott');
    });

    it('includes recall signal in narrative', () => {
        const delta = { events_a: 54.2, events_b: 60, recalls_a: 0, recalls_b: 2, velocity_a: 23, velocity_b: 17 };
        const narrative = generatePeerNarrative(delta, 'Medtronic');
        expect(narrative.toLowerCase()).toContain('recall');
    });
});