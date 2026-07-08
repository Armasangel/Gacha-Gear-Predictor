import { StatType } from '../data/StatType.js';
import { MainStatType } from '../data/MainStatType.js';
import { StatPrediction } from '../models/StatPrediction.js';

// Mapeo de MainStatType a StatType cuando coinciden.
const MAINSTAT_TO_SUBSTAT = new Map([
    [MainStatType.HP_PERCENT,        StatType.HP_PERCENT],
    [MainStatType.ATK_PERCENT,       StatType.ATK_PERCENT],
    [MainStatType.DEF_PERCENT,       StatType.DEF_PERCENT],
    [MainStatType.ENERGY_RECHARGE,   StatType.ENERGY_RECHARGE],
    [MainStatType.ELEMENTAL_MASTERY, StatType.ELEMENTAL_MASTERY],
    [MainStatType.HP_FLAT,           StatType.HP_FLAT],
    [MainStatType.ATK_FLAT,          StatType.ATK_FLAT],
    [MainStatType.CRIT_RATE,         StatType.CRIT_RATE],
    [MainStatType.CRIT_DMG,          StatType.CRIT_DMG],
]);

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
