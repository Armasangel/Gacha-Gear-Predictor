import { StatType } from '../data/StatType.js';
import { MainStatType } from '../data/MainStatType.js';
import { SimulationResult } from '../models/SimulationResult.js';
import { PieceType } from '../data/PieceType.js';

const UPGRADE_LEVELS = [4, 8, 12, 16, 20];
const MC_ITERATIONS  = 10000;

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

function isFixedMainPiece(artifact) {
    return artifact.pieceType === PieceType.FLOWER ||
           artifact.pieceType === PieceType.PLUME;
}

// Tier al azar, equiprobable entre las 4 posiciones.
function randomTierValue(key, rng) {
    const tiers = StatType[key].tiers;
    return tiers[Math.floor(rng() * tiers.length)];
}

function pickWeightedRandom(candidates, rng) {
    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    let roll = rng() * totalWeight;
    for (const c of candidates) {
        roll -= c.weight;
        if (roll <= 0) return c.key;
    }
    return candidates[candidates.length - 1].key;
}

// Fallback: solo se usa si simulate() se llama sin proyección de 4to
// substat. El flujo normal desde main.js siempre pasa projectedFourthStat
// (calculado por GameRules.js), así que esto casi nunca corre.
function pickFourthSubstatType(artifact, rng) {
    const mainKey = Object.keys(MainStatType)
        .find(k => MainStatType[k] === artifact.mainStat);
    const existingKeys = artifact.substats.map(s => getStatKey(s.type));

    const candidates = Object.keys(StatType)
        .filter(key => key !== mainKey && !existingKeys.includes(key))
        .map(key => ({ key, weight: StatType[key].weight }));

    return pickWeightedRandom(candidates, rng);
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

// Una tirada completa: revela el 4to substat (si aplica, con el stat FIJO
// que ya se le mostró al usuario -- solo el tier es random) y aplica cada
// upgrade restante a un substat elegido al azar entre los existentes,
// igual que sube de nivel un artefacto real en el juego.
function runOneTrial(artifact, remaining, totalRolls, projectedFourthStat, rng) {
    const substats = copySubstats(artifact.substats);

    if (artifact.getSubstatCount() === 3) {
        const fourthKey = projectedFourthStat
            ? getStatKey(projectedFourthStat)
            : pickFourthSubstatType(artifact, rng);
        substats[fourthKey] = randomTierValue(fourthKey, rng);
    }

    const keys = Object.keys(substats);
    for (let i = 0; i < remaining; i++) {
        const targetKey = keys[Math.floor(rng() * keys.length)];
        substats[targetKey] += randomTierValue(targetKey, rng);
    }

    for (const key of keys) {
        substats[key] = Math.round(substats[key] * 10) / 10;
    }

    return {
        substats,
        cvTotal: calcCVTotal(substats, artifact),
        cvSub:   calcCVSubstats(substats),
        rv:      calcRV(substats, totalRolls),
    };
}

// Devuelve solo la categoría del veredicto: el texto visible lo construye
// la capa de UI con i18n, no el motor.
function verdict(artifact, cv, cvSub, rv) {
    if (isFixedMainPiece(artifact)) {
        if (cvSub >= 30) return "INVERTIR";
        if (cvSub >= 15) return "CONSIDERAR";

        if (cvSub === 0) {
            if (rv >= 85) return "INVERTIR";
            if (rv >= 70) return "CONSIDERAR";
            return "DESCARTAR";
        }

        return "DESCARTAR";
    }

    if (cv >= 50) return "INVERTIR";
    if (cv >= 35) return "CONSIDERAR";

    if (cv === 0) {
        if (rv >= 85) return "INVERTIR";
        if (rv >= 70) return "CONSIDERAR";
        return "DESCARTAR";
    }

    return "DESCARTAR";
}

// projectedFourthStat: mismo parámetro que ya usaba main.js (viene de
// GameRules.getMostLikelyFourthSubstat). iterations es nuevo y opcional.
// rng es inyectable para hacer los tests determinísticos (seeding).
export function simulate(artifact, goal, projectedFourthStat = null, iterations = MC_ITERATIONS, rng = Math.random) {
    const substatCount = artifact.getSubstatCount();
    const remaining    = upgradesRemaining(artifact.level, substatCount);
    const maxUpgrades  = substatCount === 4 ? 5 : 4;
    const totalRolls   = 4 + maxUpgrades;

    const fixedMain = isFixedMainPiece(artifact);
    const metricOf  = trial => fixedMain ? trial.cvSub : trial.cvTotal;

    const trials = [];
    let investCount = 0, considerCount = 0, discardCount = 0;

    for (let i = 0; i < iterations; i++) {
        const trial = runOneTrial(artifact, remaining, totalRolls, projectedFourthStat, rng);
        trials.push(trial);

        const category = verdict(artifact, trial.cvTotal, trial.cvSub, trial.rv);
        if (category === "INVERTIR") investCount++;
        else if (category === "CONSIDERAR") considerCount++;
        else discardCount++;
    }

    // Ordeno por la métrica relevante y tomo UNA corrida completa por
    // percentil -- no mezclo el mejor CR de una tirada con el mejor CD
    // de otra, porque en el juego real vienen del mismo artefacto.
    trials.sort((a, b) => metricOf(a) - metricOf(b));
    const pick = p => trials[Math.min(trials.length - 1, Math.floor(p * (trials.length - 1)))];

    const worstRun = pick(0.10);
    const avgRun   = pick(0.50);
    const bestRun  = pick(0.90);

    const successRate  = Math.round((investCount   / iterations) * 1000) / 10;
    const considerRate = Math.round((considerCount / iterations) * 1000) / 10;
    const discardRate  = Math.round((discardCount  / iterations) * 1000) / 10;

    let finalVerdict = "DESCARTAR";
    if (investCount >= considerCount && investCount >= discardCount) finalVerdict = "INVERTIR";
    else if (considerCount >= discardCount) finalVerdict = "CONSIDERAR";

    return new SimulationResult(
        bestRun.substats,  worstRun.substats, avgRun.substats,
        bestRun.cvTotal,   worstRun.cvTotal,  avgRun.cvTotal,
        bestRun.cvSub,     worstRun.cvSub,    avgRun.cvSub,
        bestRun.rv,        worstRun.rv,       avgRun.rv,
        finalVerdict,
        successRate, considerRate, discardRate, iterations
    );
}