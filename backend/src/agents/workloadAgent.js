const fs = require('fs');
const path = require('path');
const { logTrace } = require('../utils/logger');

const providersPath = path.join(__dirname, '..', 'data', 'providers.json');

/**
 * Demand forecast by hour (simulated based on service patterns in Pakistan).
 */
const DEMAND_BY_HOUR = [
    0.1, 0.1, 0.1, 0.1, 0.1, 0.2,  // 0–5 AM
    0.4, 0.7, 1.0, 0.9, 0.8, 0.7,  // 6–11 AM (peak morning)
    0.6, 0.5, 0.6, 0.7, 0.8, 0.9,  // 12–5 PM
    1.0, 0.9, 0.8, 0.6, 0.4, 0.2,  // 6–11 PM (peak evening)
];

function getProviderWorkload(requestId) {
    const requestIdToUse = requestId || 'WORKLOAD-QUERY';
    logTrace(requestIdToUse, 'WorkloadAgent', 'WorkloadQueryStarted', {});

    const providers = JSON.parse(fs.readFileSync(providersPath, 'utf8'));
    const pktHour = (new Date().getUTCHours() + 5) % 24;
    const currentDemand = DEMAND_BY_HOUR[pktHour];

    // ── Per-category stats ────────────────────────────────────────────────────
    const categoryStats = {};
    for (const p of providers) {
        if (!categoryStats[p.category]) {
            categoryStats[p.category] = {
                category: p.category,
                totalProviders: 0,
                availableProviders: 0,
                totalCapacity: 0,
                usedCapacity: 0,
                avgReliability: 0,
                avgRate: 0,
            };
        }
        const s = categoryStats[p.category];
        s.totalProviders++;
        s.totalCapacity += p.capacity;
        s.usedCapacity += p.jobsToday;
        s.avgReliability += p.reliabilityScore;
        s.avgRate += p.baseRate;
        if (p.capacity > p.jobsToday) s.availableProviders++;
    }

    // Finalize averages
    const categoryList = Object.values(categoryStats).map(s => {
        const utilizationPct = Math.round((s.usedCapacity / s.totalCapacity) * 100);
        const availableSlots = s.totalCapacity - s.usedCapacity;
        s.avgReliability = Math.round(s.avgReliability / s.totalProviders);
        s.avgRate = Math.round(s.avgRate / s.totalProviders);
        return {
            ...s,
            utilizationPercent: utilizationPct,
            availableSlots,
            demandPressure: utilizationPct > 80 ? 'HIGH' : utilizationPct > 50 ? 'MEDIUM' : 'LOW',
        };
    }).sort((a, b) => b.utilizationPercent - a.utilizationPercent);

    // ── Top recommended slots (next 12 hours, low-demand windows) ────────────
    const recommendedSlots = [];
    for (let h = 1; h <= 12; h++) {
        const futureHour = (pktHour + h) % 24;
        const demand = DEMAND_BY_HOUR[futureHour];
        if (demand <= 0.5) {
            const label = futureHour < 12
                ? `${futureHour}:00 AM`
                : futureHour === 12 ? '12:00 PM' : `${futureHour - 12}:00 PM`;
            recommendedSlots.push({
                time: label,
                demandLevel: demand <= 0.3 ? 'LOW' : 'MEDIUM',
                expectedWaitMins: Math.round(demand * 20),
                surgeMultiplier: demand <= 0.3 ? 0.9 : 1.0,
            });
        }
        if (recommendedSlots.length >= 3) break;
    }

    // ── Per-provider workload (top 10 by utilization) ─────────────────────────
    const providerWorkload = providers
        .map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            sector: p.sector,
            jobsToday: p.jobsToday,
            capacity: p.capacity,
            utilizationPercent: Math.round((p.jobsToday / p.capacity) * 100),
            availableSlots: p.capacity - p.jobsToday,
            reliabilityScore: p.reliabilityScore,
            earningsToday: p.jobsToday * p.baseRate,
            recommendedAction: p.jobsToday >= p.capacity
                ? 'FULLY_BOOKED — offer waitlist'
                : p.jobsToday / p.capacity >= 0.8
                    ? 'NEAR_CAPACITY — prioritize high-value jobs'
                    : 'AVAILABLE — recommend for new bookings',
        }))
        .sort((a, b) => b.utilizationPercent - a.utilizationPercent)
        .slice(0, 15);

    // ── Demand forecast for next 24h ─────────────────────────────────────────
    const demandForecast = [];
    for (let h = 0; h < 24; h++) {
        const futureHour = (pktHour + h) % 24;
        const label = futureHour === 0 ? 'Midnight' : futureHour < 12
            ? `${futureHour}:00 AM`
            : futureHour === 12 ? '12:00 PM'
            : `${futureHour - 12}:00 PM`;
        demandForecast.push({
            hour: label,
            demandIndex: DEMAND_BY_HOUR[futureHour],
            surgeActive: DEMAND_BY_HOUR[futureHour] >= 0.9,
        });
    }

    logTrace(requestIdToUse, 'WorkloadAgent', 'WorkloadReportGenerated', {
        categoriesAnalyzed: categoryList.length,
        recommendedSlots: recommendedSlots.length,
    });

    return {
        generatedAt: new Date().toISOString(),
        currentDemandIndex: currentDemand,
        currentSurgeActive: currentDemand >= 0.9,
        summary: {
            totalProviders: providers.length,
            totalAvailable: providers.filter(p => p.capacity > p.jobsToday).length,
            overallUtilization: Math.round(
                (providers.reduce((a, p) => a + p.jobsToday, 0) /
                 providers.reduce((a, p) => a + p.capacity, 0)) * 100
            ),
        },
        categoryStats: categoryList,
        providerWorkload,
        recommendedSlots,
        demandForecast,
    };
}

module.exports = { getProviderWorkload };
