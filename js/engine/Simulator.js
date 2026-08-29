// Motor de simulación Monte Carlo de gear, independiente del juego.
//
// Antes dependía de los módulos de datos de Genshin (StatType, PieceType,
// StatMapping, lookup). Ahora todo el dato llega vía un `profile` (ver
// js/data/profiles): stats, mains, piezas, mapeo main->substat, grilla de
// niveles, número de tiers y umbrales de veredicto. Esto permite correr el
// mismo motor para Genshin, HSR (u otro juego de HoYoverse) sin tocar la
// lógica.
//
// Cada función recibe `profile` como primer argumento. El perfil expone:
//   profile.stat                 -> { KEY: { tiers, weight } }
//   profile.mainStat             -> { KEY: { value } }
//   profile.piece                -> { KEY: { validMainStats: [...] } }
//   profile.mainstatToSubstat    -> Map(mainStatRef -> substatStatRef|null)
//   profile.upgradeLevels        -> [n, n, ...]  (grilla de mejoras)
//   profile.maxTierIndex         -> índice del tier más alto (RV de referencia)
//   profile.thresholds           -> umbrales de veredicto
//   profile.statKeyByRef         -> Map(statRef -> key)
//   profile.mainStatKeyByRef     -> Map(mainStatRef -> key)
//   profile.pieceKeyByRef        -> Map(pieceRef -> key)
//   profile.variableMainPieces   -> [keys de piezas de mainstat variable]

import { SimulationResult } from '../models/SimulationResult.js';
import { getProfile } from '../data/profiles/index.js';

const MC_ITERATIONS = 10000;

function statKeyOf(profile, stat) {
    return profile.statKeyByRef.get(stat);
}

function mainStatKeyOf(profile, mainStat) {
    return profile.mainStatKeyByRef.get(mainStat);
}

function upgradesDone(level, substatCount, upgradeLevels) {
    let upgrades = 0;
    for (let i = 0; i < upgradeLevels.length; i++) {
        if (upgradeLevels[i] > level) break;
        // La primera mejora revela el 4to substat: no cuenta como roll.
        if (substatCount === 3 && i === 0) continue;
        upgrades++;
    }
    return upgrades;
}

function upgradesRemaining(level, substatCount, upgradeLevels) {
    const maxUpgrades = substatCount === 4 ? upgradeLevels.length : upgradeLevels.length - 1;
    return maxUpgrades - upgradesDone(level, substatCount, upgradeLevels);
}

function copySubstats(substats, keyOf) {
    const map = {};
    for (const s of substats) {
        map[keyOf(s.type)] = s.value;
    }
    return map;
}

function isVariableMainPiece(profile, artifact) {
    const key = profile.pieceKeyByRef.get(artifact.pieceType);
    if (profile.variableMainPieces) {
        return profile.variableMainPieces.includes(key);
    }
    return !['FLOWER', 'PLUME'].includes(key);
}

// Tier al azar, equiprobable entre las posiciones reales del perfil.
function randomTierValue(profile, key, rng) {
    const tiers = profile.stat[key].tiers;
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
// substat. El flujo normal siempre pasa projectedFourthStat.
function pickFourthSubstatType(profile, artifact, rng) {
    const mainKey = mainStatKeyOf(profile, artifact.mainStat);
    const existingKeys = artifact.substats.map(s => statKeyOf(profile, s.type));

    const candidates = Object.keys(profile.stat)
        .filter(key => key !== mainKey && !existingKeys.includes(key))
        .map(key => ({ key, weight: profile.stat[key].weight }));

    return pickWeightedRandom(candidates, rng);
}

function calcCVSubstats(substats) {
    const cr = substats['CRIT_RATE'] ?? 0;
    const cd = substats['CRIT_DMG']  ?? 0;
    return Math.round((cd + cr * 2) * 10) / 10;
}

function calcCVTotal(substats, artifact, profile) {
    let cr = substats['CRIT_RATE'] ?? 0;
    let cd = substats['CRIT_DMG']  ?? 0;

    const mainKey = mainStatKeyOf(profile, artifact.mainStat);

    if (mainKey === 'CRIT_RATE') cr += artifact.mainStat.value;
    if (mainKey === 'CRIT_DMG')  cd += artifact.mainStat.value;

    return Math.round((cd + cr * 2) * 10) / 10;
}

// El RV de referencia usa el tier más alto real del perfil (no un índice
// fijo a 4 tiers). Para Genshin es tiers[3]; para HSR tiers[2].
function calcRV(profile, substats, totalRolls) {
    let earned = 0;
    const maxIdx = profile.maxTierIndex;
    for (const [key, value] of Object.entries(substats)) {
        const topTier = profile.stat[key].tiers[maxIdx];
        earned += (value / topTier) * 100;
    }
    return Math.round((earned / (totalRolls * 100)) * 1000) / 10;
}

// Una tirada completa: revela el 4to substat (si aplica, con el stat FIJO
// que ya se le mostró al usuario -- solo el tier es random) y aplica cada
// upgrade restante a un substat elegido al azar entre los existentes.
function runOneTrial(profile, artifact, remaining, totalRolls, projectedFourthStat, rng) {
    const keyOf = statKeyOf.bind(null, profile);
    const substats = copySubstats(artifact.substats, keyOf);

    if (artifact.getSubstatCount() === 3) {
        const fourthKey = projectedFourthStat
            ? keyOf(projectedFourthStat)
            : pickFourthSubstatType(profile, artifact, rng);
        substats[fourthKey] = randomTierValue(profile, fourthKey, rng);
    }

    const keys = Object.keys(substats);
    for (let i = 0; i < remaining; i++) {
        const targetKey = keys[Math.floor(rng() * keys.length)];
        substats[targetKey] += randomTierValue(profile, targetKey, rng);
    }

    for (const key of keys) {
        substats[key] = Math.round(substats[key] * 10) / 10;
    }

    return {
        substats,
        cvTotal: calcCVTotal(substats, artifact, profile),
        cvSub:   calcCVSubstats(substats),
        rv:      calcRV(profile, substats, totalRolls),
    };
}

// Devuelve solo la categoría del veredicto: el texto visible lo construye
// la capa de UI con i18n, no el motor.
function verdict(profile, artifact, cv, cvSub, rv, thresholds) {
    if (isVariableMainPiece(profile, artifact)) {
        const t = thresholds.VARIABLE_MAIN;

        if (cv >= t.cv.INVEST)   return "INVERTIR";
        if (cv >= t.cv.CONSIDER) return "CONSIDERAR";

        if (cv === 0) {
            if (rv >= t.rv.INVEST)   return "INVERTIR";
            if (rv >= t.rv.CONSIDER) return "CONSIDERAR";
            return "DESCARTAR";
        }

        return "DESCARTAR";
    }

    const t = thresholds.FIXED_MAIN;

    if (cvSub >= t.cvSub.INVEST)   return "INVERTIR";
    if (cvSub >= t.cvSub.CONSIDER) return "CONSIDERAR";

    if (cvSub === 0) {
        if (rv >= t.rv.INVEST)   return "INVERTIR";
        if (rv >= t.rv.CONSIDER) return "CONSIDERAR";
        return "DESCARTAR";
    }

    return "DESCARTAR";
}

// projectedFourthStat: mismo parámetro que ya usaba main.js (viene de
// GameRules.getMostLikelyFourthSubstat). iterations es nuevo y opcional.
// rng es inyectable para los tests determinísticos (seeding).
//
// profile: el perfil de juego (ver js/data/profiles). Por defecto usa
// Genshin, de modo que los call sites existentes siguen funcionando igual.
// El 6º argumento `config` permite pasar el perfil explícito:
//   { profile }                  <-- perfil (lo habitual)
// Y mantiene los atajos del refactor previo para compatibilidad:
//   { upgradeLevels, thresholds } <-- si se pasan, pisan al perfil.
export function simulate(
    artifact,
    goal,
    projectedFourthStat = null,
    iterations = MC_ITERATIONS,
    rng = Math.random,
    config = {}
) {
    const profile = config.profile ?? getProfile('genshin');
    const upgradeLevels = config.upgradeLevels ?? profile.upgradeLevels;
    const thresholds    = config.thresholds    ?? profile.thresholds;

    const substatCount = artifact.getSubstatCount();
    const remaining    = upgradesRemaining(artifact.level, substatCount, upgradeLevels);
    const maxUpgrades  = substatCount === 4 ? upgradeLevels.length : upgradeLevels.length - 1;
    const totalRolls   = 4 + maxUpgrades;

    const fixedMain = !isVariableMainPiece(profile, artifact);
    const metricOf  = trial => fixedMain ? trial.cvSub : trial.cvTotal;

    const trials = [];
    let investCount = 0, considerCount = 0, discardCount = 0;

    for (let i = 0; i < iterations; i++) {
        const trial = runOneTrial(profile, artifact, remaining, totalRolls, projectedFourthStat, rng);
        trials.push(trial);

        const category = verdict(profile, artifact, trial.cvTotal, trial.cvSub, trial.rv, thresholds);
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
