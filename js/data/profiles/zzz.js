// Perfil de datos de Zenless Zone Zero (Drive Discs).
//
// Estructura del sistema de gear:
//   - 6 ranuras (Slot 1-6), cada una con mainstat fijo o variable.
//   - Max level: +15, grilla de mejoras: [3, 6, 9, 12, 15].
//   - 4 substats aleatorios, cada uno recibe 1 roll por mejora (5 rolls totales).
//   - Slot 1 (ATK flat), Slot 2 (HP%), Slot 3 (DEF%) son mainstats fijos.
//   - Slot 4-6 tienen mainstats variables.
//
// A diferencia de Genshin/HSR, en ZZZ los substats NO tienen variancia por
// roll: cada mejora suma siempre el mismo valor fijo por stat. Por eso cada
// stat se modela con tiers: [valorFijo] (array de un solo elemento) y
// maxTierIndex: 0. Los valores marcados con unverified están interpolados
// (S-Rank = A-Rank x 1.5) y pendientes de confirmar contra la wiki.
//
// Fuente: Zenless Zone Zero Wiki.

import { invertKeyMap } from './invert.js';

const SUBSTAT_FIXED_VALUES = Object.freeze({
    HP_PERCENT:       3.0,
    ATK_PERCENT:      3.0,
    DEF_PERCENT:      4.8,
    HP_FLAT:          112,
    ATK_FLAT:         19,
    DEF_FLAT:         15,
    CRIT_RATE:        2.4,
    CRIT_DMG:         4.8,
    PEN:              3.0,
    ANOMALY_MASTERY:  6.0,
});

const UNVERIFIED_STATS = Object.freeze([
    'HP_PERCENT',
    'ATK_PERCENT',
    'PEN',
    'ANOMALY_MASTERY',
]);

const SUBSTAT_WEIGHTS = Object.freeze({
    HP_PERCENT: 10, ATK_PERCENT: 10, DEF_PERCENT: 10,
    HP_FLAT: 10, ATK_FLAT: 10, DEF_FLAT: 10,
    CRIT_RATE: 6, CRIT_DMG: 6,
    PEN: 10,
    ANOMALY_MASTERY: 8,
});

const MAIN_STATS = Object.freeze({
    HP_FLAT:            Object.freeze({ value: 2220 }),
    ATK_FLAT:           Object.freeze({ value: 154 }),
    HP_PERCENT:         Object.freeze({ value: 24 }),
    ATK_PERCENT:        Object.freeze({ value: 24 }),
    DEF_PERCENT:        Object.freeze({ value: 32 }),
    CRIT_RATE:          Object.freeze({ value: 16 }),
    CRIT_DMG:           Object.freeze({ value: 48 }),
    PEN:                Object.freeze({ value: 24 }),
    ANOMALY_MASTERY:    Object.freeze({ value: 32 }),
    ENERGY_REGEN:       Object.freeze({ value: 24 }),
});

export function buildZzzProfile() {
    const stat = {};
    for (const [key, value] of Object.entries(SUBSTAT_FIXED_VALUES)) {
        const entry = { tiers: Object.freeze([value]), weight: SUBSTAT_WEIGHTS[key] };
        if (UNVERIFIED_STATS.includes(key)) entry.unverified = true;
        stat[key] = Object.freeze(entry);
    }

    const mainStat = {};
    for (const [key, val] of Object.entries(MAIN_STATS)) {
        mainStat[key] = Object.freeze({ value: val.value });
    }

    // Slot 1: ATK flat (fijo)
    // Slot 2: HP% (fijo)
    // Slot 3: DEF% (fijo)
    // Slot 4: HP%, ATK%, DEF%, CRIT RATE, CRIT DMG, PEN
    // Slot 5: HP%, ATK%, DEF%, CRIT RATE, CRIT DMG, ANOMALY MASTERY
    // Slot 6: HP%, ATK%, DEF%, ENERGY REGEN, ANOMALY MASTERY, PEN
    const piece = Object.freeze({
        SLOT_1: Object.freeze({ validMainStats: [mainStat.ATK_FLAT] }),
        SLOT_2: Object.freeze({ validMainStats: [mainStat.HP_PERCENT] }),
        SLOT_3: Object.freeze({ validMainStats: [mainStat.DEF_PERCENT] }),
        SLOT_4: Object.freeze({ validMainStats: [
            mainStat.HP_PERCENT, mainStat.ATK_PERCENT, mainStat.DEF_PERCENT,
            mainStat.CRIT_RATE, mainStat.CRIT_DMG, mainStat.PEN
        ]}),
        SLOT_5: Object.freeze({ validMainStats: [
            mainStat.HP_PERCENT, mainStat.ATK_PERCENT, mainStat.DEF_PERCENT,
            mainStat.CRIT_RATE, mainStat.CRIT_DMG, mainStat.ANOMALY_MASTERY
        ]}),
        SLOT_6: Object.freeze({ validMainStats: [
            mainStat.HP_PERCENT, mainStat.ATK_PERCENT, mainStat.DEF_PERCENT,
            mainStat.ENERGY_REGEN, mainStat.ANOMALY_MASTERY, mainStat.PEN
        ]}),
    });

    const mainstatToSubstat = new Map([
        [mainStat.HP_PERCENT, stat.HP_PERCENT],
        [mainStat.ATK_PERCENT, stat.ATK_PERCENT],
        [mainStat.DEF_PERCENT, stat.DEF_PERCENT],
        [mainStat.CRIT_RATE, stat.CRIT_RATE],
        [mainStat.CRIT_DMG, stat.CRIT_DMG],
        [mainStat.PEN, stat.PEN],
        [mainStat.ANOMALY_MASTERY, stat.ANOMALY_MASTERY],
        [mainStat.HP_FLAT, stat.HP_FLAT],
        [mainStat.ATK_FLAT, stat.ATK_FLAT],
        [mainStat.ENERGY_REGEN, null],
    ]);

    return Object.freeze({
        id: 'zzz',
        name: 'Zenless Zone Zero',
        substatRollModel: 'fixed',
        upgradeLevels: Object.freeze([3, 6, 9, 12, 15]),
        maxLevel: 15,
        maxTierIndex: 0,
        thresholds: Object.freeze({
            FIXED_MAIN: Object.freeze({
                cvSub: Object.freeze({ INVEST: 30, CONSIDER: 15 }),
                utilityFallback: Object.freeze({ INVEST: 60, CONSIDER: 35 }),
            }),
            VARIABLE_MAIN: Object.freeze({
                cv:    Object.freeze({ INVEST: 50, CONSIDER: 35 }),
                utilityFallback: Object.freeze({ INVEST: 60, CONSIDER: 35 }),
            }),
        }),
        stat,
        mainStat,
        piece,
        mainstatToSubstat,
        statKeyByRef: invertKeyMap(stat),
        mainStatKeyByRef: invertKeyMap(mainStat),
        pieceKeyByRef: invertKeyMap(piece),
        variableMainPieces: Object.freeze(['SLOT_4', 'SLOT_5', 'SLOT_6']),
        pieceOrder: Object.freeze(['SLOT_1', 'SLOT_2', 'SLOT_3', 'SLOT_4', 'SLOT_5', 'SLOT_6']),
    });
}
