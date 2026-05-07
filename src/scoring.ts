/**
 * Compute percentile rank of a value within a cohort.
 * @param value - the value to rank
 * @param cohort - sorted ascending array of numbers
 * @returns number 0-100 percentile
 */
export function computePercentile(value: number, cohort: number[]): number {
    if (!cohort || cohort.length === 0) return 50;
    const sorted = [...cohort].sort((a, b) => a - b);
    if (sorted.length === 1) return value === sorted[0] ? 50 : 50;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    if (value <= min) return 0;
    if (value >= max) return 100;
    let below = sorted.filter(v => v < value).length;
    let equal = sorted.filter(v => v === value).length;
    return Math.round(((below + equal / 2) / sorted.length) * 100);
}

/**
 * Compute composite benchmark score from three percentile ranks.
 * Higher = better. Range 0-100.
 */
export function computeComposite(eventsPctile: number | null, recallPctile: number | null, velocityPctile: number | null): number {
    const scores = [eventsPctile, recallPctile, velocityPctile].filter(v => v != null) as number[];
    if (scores.length === 0) return 50;
    return scores.reduce((sum, v) => sum + v, 0) / scores.length;
}

/**
 * Map composite score to risk level.
 */
export function riskLevel(score: number): 'LOW' | 'LOW-MEDIUM' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 75) return 'LOW';
    if (score >= 50) return 'MEDIUM';
    if (score >= 25) return 'HIGH';
    return 'CRITICAL';
}

export function scoreRiskLevel(level: string): number {
    const map: Record<string, number> = { 'LOW': 100, 'LOW-MEDIUM': 87, 'MEDIUM': 62, 'HIGH': 37, 'CRITICAL': 12 };
    return map[level] ?? 50;
}

/**
 * Compute recall rate for a company within a product code cohort.
 * Weighted: Class I = 1.0, Class II = 0.5, Class III = 0.25
 */
export function recallRate(classIRecalls: number, classIIRecalls: number, clearanceCount: number): number {
    if (clearanceCount === 0) return 0;
    return (classIRecalls * 1.0 + classIIRecalls * 0.5) / clearanceCount;
}

/**
 * Generate narrative text for peer comparison.
 */
export function generatePeerNarrative(delta: {
    events_a: number; events_b: number;
    recalls_a: number; recalls_b: number;
    velocity_a: number; velocity_b: number;
}, winner: string): string {
    const { events_a, events_b, recalls_a, recalls_b, velocity_a, velocity_b } = delta;
    const parts = [];

    if (events_a < events_b) {
        parts.push(`${winner} has lower events-per-device`);
    } else {
        parts.push(`${winner} has higher events-per-device`);
    }

    if (recalls_a === 0 && recalls_b === 0) {
        parts.push('neither company has Class I recalls');
    } else if (recalls_a === 0) {
        parts.push(`${winner} has zero Class I recalls`);
    } else if (recalls_b === 0) {
        parts.push(`${winner} has zero Class I recalls`);
    } else {
        parts.push(`${winner} has fewer Class I recalls`);
    }

    if (velocity_a > velocity_b) {
        parts.push(`${winner} has higher clearance velocity`);
    } else {
        parts.push(`${winner} has lower clearance velocity`);
    }

    return parts.join('; ') + '.';
}