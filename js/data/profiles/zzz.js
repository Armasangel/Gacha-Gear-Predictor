// Perfil de datos de Zenless Zone Zero (Drive Discs).
//
// Estructura del sistema de gear:
//   - 6 ranuras (Slot 1-6), cada una con mainstat fijo o variable.
//   - Max level: +15, grilla de mejoras: [3, 6, 9, 12, 15].
//   - 4 substats aleatorios, cada uno recibe 1 roll por mejora (5 rolls totales).
//   - Slot 1 (ATK flat), Slot 2 (HP%), Slot 3 (DEF%) son mainstats fijos.
//   - Slot 4-6 tienen mainstats variables.
//
// Fuente: Zenless Zone Zero Wiki.

import { invertKeyMap } from './invert.js';

const SUBSTAT_TIERS = Object.freeze({
    HP_PERCENT:       Object.freeze([2.4, 2.8, 3.2]),
    ATK_PERCENT:      Object.freeze([2.4, 2.8, 3.2]),
    DEF_PERCENT:      Object.freeze([3.2, 3.6, 4.0]),
    HP_FLAT:          Object.freeze([112, 128, 144]),
    ATK_FLAT:         Object.freeze([7, 8, 9]),
    DEF_FLAT:         Object.freeze([14, 16, 18]),
    CRIT_RATE:        Object.freeze([2.4, 2.8, 3.2]),
    CRIT_DMG:         Object.freeze([4.8, 5.6, 6.4]),
    PEN:              Object.freeze([1.8, 2.1, 2.4]),
    ANOMALY_MASTERY:  Object.freeze([3.2, 3.6, 4.0]),
});

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
    for (const [key, tiers] of Object.entries(SUBSTAT_TIERS)) {
        stat[key] = Object.freeze({ tiers, weight: SUBSTAT_WEIGHTS[key] });
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
        upgradeLevels: Object.freeze([3, 6, 9, 12, 15]),
        maxLevel: 15,
        maxTierIndex: 2,
        thresholds: Object.freeze({
            FIXED_MAIN: Object.freeze({
                cvSub: Object.freeze({ INVEST: 30, CONSIDER: 15 }),
                rv:    Object.freeze({ INVEST: 85, CONSIDER: 70 }),
            }),
            VARIABLE_MAIN: Object.freeze({
                cv:    Object.freeze({ INVEST: 50, CONSIDER: 35 }),
                rv:    Object.freeze({ INVEST: 85, CONSIDER: 70 }),
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
