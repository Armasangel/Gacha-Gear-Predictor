import { StatType } from '../data/StatType.js';
import { MainStatType } from '../data/MainStatType.js';
import { SimulationResult } from '../models/SimulationResult.js';
import { PieceType } from '../data/PieceType.js';
import { getMostLikelyFourthSubstat } from './GameRules.js';

const UPGRADE_LEVELS = [4, 8, 12, 16, 20];

function getStatKey(stat) {
    return Object.keys(StatType).find(k => StatType[k] === stat);
}

function upgradesDone(level, substatCount) {
    let upgrades = 0;
    for (const lvl of UPGRADE_LEVELS) {
        if (lvl > level) break;
        if (substatCount === 3 && lvl === 4) continue;
        upgrades++;
    }
    return upgrades;
}

function upgradesRemaining(level, substatCount) {
    const maxUpgrades = substatCount === 4 ? 5 : 4;
    return maxUpgrades - upgradesDone(level, substatCount);
}

function copySubstats(substats) {
    const map = {};
    for (const s of substats) {
        map[getStatKey(s.type)] = s.value;
    }
    return map;
}

function calcCVSubstats(substats) {
    const cr = substats['CRIT_RATE'] ?? 0;
    const cd = substats['CRIT_DMG']  ?? 0;
    return Math.round((cd + cr * 2) * 10) / 10;
}

function calcCVTotal(substats, artifact) {
    let cr = substats['CRIT_RATE'] ?? 0;
    let cd = substats['CRIT_DMG']  ?? 0;

    const mainKey = Object.keys(MainStatType)
        .find(k => MainStatType[k] === artifact.mainStat);

    if (mainKey === 'CRIT_RATE') cr += artifact.mainStat.value;
    if (mainKey === 'CRIT_DMG')  cd += artifact.mainStat.value;

    return Math.round((cd + cr * 2) * 10) / 10;
}

function calcRV(substats, totalRolls) {
    let earned = 0;

    for (const [key, value] of Object.entries(substats)) {
        const t4 = StatType[key].tiers[3];
        earned += (value / t4) * 100;
    }

    return Math.round((earned / (totalRolls * 100)) * 1000) / 10;
}

function simulateBest(substats, goal, remaining) {
    const result = copySubstats(substats);

    let bestTarget = null;

    for (const desired of goal.desiredStats) {
        const key = getStatKey(desired);

        if (result[key] !== undefined) {
            bestTarget = key;
            break;
        }
    }

    if (bestTarget === null) {
        let highestT4 = -Infinity;

        for (const s of substats) {
            const key = getStatKey(s.type);
            const t4  = StatType[key].tiers[3];

            if (t4 > highestT4) {
                highestT4 = t4;
                bestTarget = key;
            }
        }
    }

    for (let i = 0; i < remaining; i++) {
        result[bestTarget] += StatType[bestTarget].tiers[3];
    }

    for (const key of Object.keys(result)) {
        result[key] = Math.round(result[key] * 10) / 10;
    }

    return result;
}

function simulateWorst(substats, goal, remaining) {
    const result = copySubstats(substats);

    let worstTarget = null;

    for (let i = substats.length - 1; i >= 0; i--) {
        const key = getStatKey(substats[i].type);

        if (!goal.desiredStats.includes(substats[i].type)) {
            worstTarget = key;
            break;
        }
    }

    if (worstTarget === null) {
        let lowestT4 = Infinity;

        for (const s of substats) {
            const key = getStatKey(s.type);
            const t4  = StatType[key].tiers[3];

            if (t4 < lowestT4) {
                lowestT4 = t4;
                worstTarget = key;
            }
        }
    }

    for (let i = 0; i < remaining; i++) {
        result[worstTarget] += StatType[worstTarget].tiers[0];
    }

    for (const key of Object.keys(result)) {
        result[key] = Math.round(result[key] * 10) / 10;
    }

    return result;
}

function simulateAvg(substats, remaining) {
    const result = copySubstats(substats);
    const upgradesPerStat = remaining / substats.length;

    for (const key of Object.keys(result)) {
        const tiers = StatType[key].tiers;
        const expected = (tiers[0] + tiers[1] + tiers[2] + tiers[3]) / 4;

        result[key] = Math.round(
            (result[key] + upgradesPerStat * expected) * 10
        ) / 10;
    }

    return result;
}

function verdict(artifact, avgCV, avgCVSub, avgRV) {
    const isFixedMain =
        artifact.pieceType === PieceType.FLOWER ||
        artifact.pieceType === PieceType.PLUME;

    if (isFixedMain) {
        if (avgCVSub >= 30)
            return ["INVERTIR", `CV de substats ${avgCVSub} es bueno (>=30).`];

        if (avgCVSub >= 15)
            return ["CONSIDERAR", `CV de substats ${avgCVSub} es moderado.`];

        if (avgCVSub === 0) {
            if (avgRV >= 85)
                return ["INVERTIR", `RV promedio de ${avgRV}% es excelente.`];

            if (avgRV >= 70)
                return ["CONSIDERAR", `RV promedio de ${avgRV}% es aceptable.`];

            return ["DESCARTAR", `RV promedio de ${avgRV}% es bajo.`];
        }

        return ["DESCARTAR", `CV de substats ${avgCVSub} es bajo (<15).`];
    }

    if (avgCV >= 50)
        return ["INVERTIR", `CV promedio de ${avgCV} es bueno (>=50).`];

    if (avgCV >= 35)
        return ["CONSIDERAR", `CV promedio de ${avgCV} es moderado.`];

    if (avgCV === 0) {
        if (avgRV >= 85)
            return ["INVERTIR", `RV promedio de ${avgRV}% es excelente.`];

        if (avgRV >= 70)
            return ["CONSIDERAR", `RV promedio de ${avgRV}% es aceptable.`];

        return ["DESCARTAR", `RV promedio de ${avgRV}% es bajo.`];
    }

    return ["DESCARTAR", `CV promedio de ${avgCV} es bajo (<35).`];
}

//contruir un escenario dado (best/avg/worst) del array de substats efectivo que debe usar el simulador
function buildEffectiveSubstats(artifact, projectedStat, revealValue) {
    if (artifact.getSubstatCount() !== 3) {
        return artifact.substats;
    }

    return [
        ...artifact.substats,{
            type: projectedStat,
            value: revealValue
        }
    ];
}

export function simulate(artifact, goal, projectedFourthStat = null) {
    const substatCount = artifact.getSubstatCount();
    const remaining    = upgradesRemaining(
        artifact.level,
        substatCount
    );

    const maxUpgrades = substatCount === 4 ? 5 : 4;
    const totalRolls  = 4 + maxUpgrades;

    let bestSubstats  = artifact.substats;
    let worstSubstats = artifact.substats;
    let avgSubstats   = artifact.substats;

    if (substatCount === 3) {
        const projected =
            projectedFourthStat ??
            getMostLikelyFourthSubstat(artifact);

        const key   = getStatKey(projected);
        const tiers = StatType[key].tiers;

        const expected =
            (tiers[0] + tiers[1] + tiers[2] + tiers[3]) / 4;

        bestSubstats = buildEffectiveSubstats(
            artifact,
            projected,
            tiers[3]
        );

        worstSubstats = buildEffectiveSubstats(
            artifact,
            projected,
            tiers[0]
        );

        avgSubstats = buildEffectiveSubstats(
            artifact,
            projected,
            expected
        );
    }

    const best  = simulateBest(bestSubstats, goal, remaining);
    const worst = simulateWorst(worstSubstats, goal, remaining);
    const avg   = simulateAvg(avgSubstats, remaining);

    const bestCV     = calcCVTotal(best, artifact);
    const worstCV    = calcCVTotal(worst, artifact);
    const avgCV      = calcCVTotal(avg, artifact);

    const bestCVSub  = calcCVSubstats(best);
    const worstCVSub = calcCVSubstats(worst);
    const avgCVSub   = calcCVSubstats(avg);

    const bestRV     = calcRV(best, totalRolls);
    const worstRV    = calcRV(worst, totalRolls);
    const avgRV      = calcRV(avg, totalRolls);

    const [v, reason] =
        verdict(artifact, avgCV, avgCVSub, avgRV);

    return new SimulationResult(
        best,
        worst,
        avg,
        bestCV,
        worstCV,
        avgCV,
        bestCVSub,
        worstCVSub,
        avgCVSub,
        bestRV,
        worstRV,
        avgRV,
        v,
        reason
    );
}