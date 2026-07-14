import { StatType } from '../data/StatType.js';
import { MainStatType } from '../data/MainStatType.js';
import { StatPrediction } from '../models/StatPrediction.js';
import { MAINSTAT_TO_SUBSTAT } from '../data/StatMapping.js';

export function getAvailablePool(artifact) {
    const excluded = new Set();

    // Excluir substats existentes
    for (const s of artifact.substats) {
        excluded.add(s.type);
    }

    // Excluir el mainstat si tiene equivalente en substat
    const mainAsSubstat = MAINSTAT_TO_SUBSTAT.get(artifact.mainStat);
    if (mainAsSubstat !== undefined) {
        excluded.add(mainAsSubstat);
    }

    // Pool = todos los StatType menos los excluidos
    return Object.values(StatType).filter(stat => !excluded.has(stat));
}

export function predictFourthSubstat(artifact, goal) {
    const pool = getAvailablePool(artifact);

    const totalWeight = pool.reduce((sum, stat) => sum + stat.weight, 0);

    const desired   = [];
    const undesired = [];

    for (const stat of pool) {
        const prob = (stat.weight * 100.0) / totalWeight;
        const prediction = new StatPrediction(stat, prob);
        if (goal.isDesired(stat)) {
            desired.push(prediction);
        } else {
            undesired.push(prediction);
        }
    }

    desired.sort((a, b)   => b.probability - a.probability);
    undesired.sort((a, b) => b.probability - a.probability);

    return [...desired, ...undesired];
}

export function predictFourthSubstatDistribution(artifact) {
    const pool = getAvailablePool(artifact);

    const totalWeight = pool.reduce((sum, stat)=> sum + stat.weight, 0);

    return pool.map(stat =>
        new StatPrediction(stat, (stat.weight * 100.0) / totalWeight)
    );
}

export function getMostLikelyFourthSubstat(artifact) {
    const distribution = predictFourthSubstatDistribution(artifact);
    return distribution.reduce((max, p) => p.probability > max.probability ? p: max).stat;
    
}