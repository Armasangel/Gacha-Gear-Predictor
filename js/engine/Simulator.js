import { StatType } from '../data/StatType.js';
import { MainStatType } from '../data/MainStatType.js';
import { SimulationResult } from '../models/SimulationResult.js';

const UPGRADE_LEVELS = [4, 8, 12, 16, 20];

// Helper: encuentra el key string de un objeto StatType
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

// Copia substats usando string keys
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

    if (mainKey === 'CRIT_RATE') cr += artifact.mainStat;
    if (mainKey === 'CRIT_DMG')  cd += artifact.mainStat;

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

function simulateBest(artifact, goal, remaining) {
    const result = copySubstats(artifact.substats);

    let bestTarget = null;
    let highestT4  = -Infinity;

    // Buscar stat deseado con mayor T4
    for (const s of artifact.substats) {
        const key = getStatKey(s.type);
        if (goal.desiredStats.includes(s.type)) {
            const t4 = StatType[key].tiers[3];
            if (t4 > highestT4) {
                highestT4  = t4;
                bestTarget = key;
            }
        }
    }

    // Si ningún stat deseado está en el artefacto, usar el de mayor T4 disponible
    if (bestTarget === null) {
        for (const s of artifact.substats) {
            const key = getStatKey(s.type);
            const t4  = StatType[key].tiers[3];
            if (t4 > highestT4) {
                highestT4  = t4;
                bestTarget = key;
            }
        }
    }

    for (let i = 0; i < remaining; i++) {
        result[bestTarget] = result[bestTarget] + StatType[bestTarget].tiers[3];
    }

    for (const key of Object.keys(result)) {
        result[key] = Math.round(result[key] * 10) / 10;
    }
    return result;
}

function simulateWorst(artifact, goal, remaining) {
    const result = copySubstats(artifact.substats);

    let worstTarget = null;

    // Primero buscar un stat NO deseado
    for (let i = artifact.substats.length - 1; i >= 0; i--) {
        const key = getStatKey(artifact.substats[i].type);
        if (!goal.desiredStats.includes(artifact.substats[i].type)) {
            worstTarget = key;
            break;
        }
    }

    // Si todos son deseados, caer en el de menor T4 (menor impacto)
    if (worstTarget === null) {
        let lowestT4 = Infinity;
        for (const s of artifact.substats) {
            const key = getStatKey(s.type);
            const t4  = StatType[key].tiers[3];
            if (t4 < lowestT4) {
                lowestT4    = t4;
                worstTarget = key;
            }
        }
    }

    for (let i = 0; i < remaining; i++) {
        result[worstTarget] = result[worstTarget] + StatType[worstTarget].tiers[0];
    }

    for (const key of Object.keys(result)) {
        result[key] = Math.round(result[key] * 10) / 10;
    }
    return result;
}

function simulateAvg(artifact, remaining) {
    const result  = copySubstats(artifact.substats);
    const numStats = artifact.substats.length;
    const upgradesPerStat = remaining / numStats;

    for (const key of Object.keys(result)) {
        const tiers   = StatType[key].tiers;
        const expected = (tiers[0] + tiers[1] + tiers[2] + tiers[3]) / 4;
        result[key] = Math.round((result[key] + upgradesPerStat * expected) * 10) / 10;
    }
    return result;
}

function verdict(avgCV, avgRV) {
    if (avgCV > 0) {
        if (avgCV >= 50) return ["INVERTIR",   `CV promedio de ${avgCV} es bueno (>=50).`];
        if (avgCV >= 35) return ["CONSIDERAR", `CV promedio de ${avgCV} es moderado.`];
        return             ["DESCARTAR",   `CV promedio de ${avgCV} es bajo (<35).`];
    } else {
        if (avgRV >= 85) return ["INVERTIR",   `RV promedio de ${avgRV}% es excelente.`];
        if (avgRV >= 70) return ["CONSIDERAR", `RV promedio de ${avgRV}% es aceptable.`];
        return             ["DESCARTAR",   `RV promedio de ${avgRV}% es bajo.`];
    }
}

export function simulate(artifact, goal) {
    const substatCount = artifact.getSubstatCount();
    const level        = artifact.level;
    const done         = upgradesDone(level, substatCount);
    const remaining    = upgradesRemaining(level, substatCount);
    const totalRolls   = substatCount + done + remaining;

    const best  = simulateBest(artifact, goal, remaining);
    const worst = simulateWorst(artifact, goal, remaining);
    const avg   = simulateAvg(artifact, remaining);

    const bestCV  = calcCVTotal(best,  artifact);
    const worstCV = calcCVTotal(worst, artifact);
    const avgCV   = calcCVTotal(avg,   artifact);

    const bestCVSub  = calcCVSubstats(best);
    const worstCVSub = calcCVSubstats(worst);
    const avgCVSub   = calcCVSubstats(avg);

    const bestRV  = calcRV(best,  totalRolls);
    const worstRV = calcRV(worst, totalRolls);
    const avgRV   = calcRV(avg,   totalRolls);

    const [v, reason] = verdict(avgCV, avgRV);

    return new SimulationResult(
        best, worst, avg,
        bestCV,    worstCV,    avgCV,
        bestCVSub, worstCVSub, avgCVSub,
        bestRV,    worstRV,    avgRV,
        v, reason
    );
}