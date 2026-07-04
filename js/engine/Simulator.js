import {StatType} from '../data/StatType.js';
import {MainStatType} from '../data/MainStatType.js';
import {SimulationResult} from '../models/SimulationResult.js';

const UPGRADE_LEVELS = [4, 8, 12, 16, 20];

function upgradesDone(level, substatCount){
    let upgrades = 0;
    for (const lvl of UPGRADE_LEVELS){
        if (lvl > level) break;
        if (substatCount === 3 && lvl === 4) continue;
        upgrades++;
    }
    return upgrades;
}

function upgradesRemaining(level, substatCount){
    const maxUpgrades = substatCount === 4 ? 5 : 4;
    return maxUpgrades - upgradesDone(level, substatCount);
}

function copySubstats(substats){
    const map = {};
    for (const s of substats){
        map[s.type] = s.value;
    }
    return map;
}

function calcCVSubstats(substats){
    const cr = substats[StatType.CRIT_RATE] ?? 0;
    const cd = substats[StatType.CRIT_DAMAGE] ?? 0;
    return Math.round((cd + cr * 2) * 10) / 10;
}

function calcCVTotal(substats, artifact){
    let cr = substats[StatType.CRIT_RATE] ?? 0;
    let cd = substats[StatType.CRIT_DAMAGE] ?? 0;

    //buscar mainstat por nombre de key
    const mainKey = Object.keys(MainStatType).find(k => MainStatType[k] === artifact.mainStat);

    if (mainKey === 'CRIT_RATE') cr += artifact.mainStat;
    if (mainKey === 'CRIT_DAMAGE') cd += artifact.mainStat;

    return Math.round((cd + cr * 2) * 10) / 10;
}

function calcRV(substats, totalRolls){
    let earned = 0;
    for (const [stat, value] of Object.entries(substats)){
        const t4 = stat.tiers[3];
        earned += (value / t4) * 100;
    }
    return Math.round((earned / (totalRolls * 100)) * 1000) / 10;
}


function simulateBest(artifact, goal, remaining){
    const result = copySubstats(artifact.substats);

    let bestTarget = null;
    for (const desired of goal.desiredSubstats){
        if (result[desired] !== undefined){
            bestTarget = desired;
            break;
        }
    }
    if (bestTarget === null){
        bestTarget = artifact.substats[0].type;
    }

    for (let i = 0; i < remaining; i++){
        result[bestTarget] = (result[bestTarget] + bestTarget.tiers[3]);
    }
    return result;
}

function simulateWorst(artifact, goal, remaining) {
    const result = copySubstats(artifact.substats);

    let worstTarget = null;
    for (let i = artifact.substats.length - 1; i >= 0; i--) {
        const candidate = artifact.substats[i].type;
        if (!goal.isDesired(candidate)) {
            worstTarget = candidate;
            break;
        }
    }
    if (worstTarget === null) {
        worstTarget = artifact.substats[artifact.substats.length - 1].type;
    }

    for (let i = 0; i < remaining; i++) {
        result[worstTarget] = (result[worstTarget] + worstTarget.tiers[0]);
    }

    for (const stat of Object.keys(result)) {
        result[stat] = Math.round(result[stat] * 10) / 10;
    }
    return result;
}

function simulateAvg(artifact, remaining) {
    const result = copySubstats(artifact.substats);
    const numStats = artifact.substats.length;
    const upgradesPerStat = remaining / numStats;

    for (const stat of Object.keys(result)) {
        const expected = (stat.tiers[0] + stat.tiers[1] + stat.tiers[2] + stat.tiers[3]) / 4;
        result[stat] = Math.round((result[stat] + upgradesPerStat * expected) * 10) / 10;
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