// Perfil de datos de Honkai: Star Rail (reliquias de 5★).
//
// Fuente: Honkai: Star Rail Wiki — "Relic/Stats".
// Nota estructural frente a Genshin:
//   - Los substats usan 3 tiers (Low/Med/High), no 4.
//   - La grilla de niveles es [3, 6, 9, 12, 15] con nivel máximo +15.
//   - Cada substat tiene un peso propio (ver `substatWeights`).
//   - El mainstat crece de forma lineal Base -> Max en 15 escalones.
//
// Los objetos `stat`, `mainStat`, `piece` implementan la MISMA forma que los
// de Genshin (item.value, item.tiers, item.weight, piece.validMainStats) para
// que el motor y la UI consuman un contrato único por perfil.

import { invertKeyMap } from './invert.js';

const SUBSTAT_TIERS = Object.freeze({
    HP_FLAT:       Object.freeze([33.87004, 38.103795, 42.33751]),
    ATK_FLAT:      Object.freeze([16.935, 19.051877, 21.168754]),
    DEF_FLAT:      Object.freeze([16.935, 19.051877, 21.168754]),
    HP_PERCENT:    Object.freeze([3.456, 3.888, 4.32]),
    ATK_PERCENT:   Object.freeze([3.456, 3.888, 4.32]),
    DEF_PERCENT:   Object.freeze([4.32, 4.86, 5.4]),
    SPD:           Object.freeze([2, 2.3, 2.6]),
    CRIT_RATE:     Object.freeze([2.592, 2.916, 3.24]),
    CRIT_DMG:      Object.freeze([5.184, 5.832, 6.48]),
    EFFECT_HIT_RATE: Object.freeze([3.456, 3.888, 4.32]),
    EFFECT_RES:    Object.freeze([3.456, 3.888, 4.32]),
    BREAK_EFFECT:  Object.freeze([5.184, 5.832, 6.48]),
});

// Pesos de selección de substat (fuente wiki HSR). Suma = 100.
const SUBSTAT_WEIGHTS = Object.freeze({
    HP_FLAT: 10, ATK_FLAT: 10, DEF_FLAT: 10,
    HP_PERCENT: 10, ATK_PERCENT: 10, DEF_PERCENT: 10,
    SPD: 4,
    CRIT_RATE: 6, CRIT_DMG: 6,
    EFFECT_HIT_RATE: 8, EFFECT_RES: 8, BREAK_EFFECT: 8,
});

// Valores de mainstat: Base / Max (a +15), calculados por interpolación
// lineal en cada nivel. El `value` en +0 es el Base.
const MAIN_STATS = Object.freeze({
    HP_FLAT:      Object.freeze({ base: 112.896,  max: 705.6 }),
    ATK_FLAT:     Object.freeze({ base: 56.448,   max: 352.8 }),
    HP_PERCENT:   Object.freeze({ base: 6.912,    max: 43.2 }),
    ATK_PERCENT:  Object.freeze({ base: 6.912,    max: 43.2 }),
    DEF_PERCENT:  Object.freeze({ base: 8.64,     max: 54 }),
    CRIT_RATE:    Object.freeze({ base: 5.184,    max: 32.4 }),
    CRIT_DMG:     Object.freeze({ base: 10.368,   max: 64.8 }),
    HEALING_BONUS: Object.freeze({ base: 5.5296,  max: 34.5606 }),
    EFFECT_HIT_RATE: Object.freeze({ base: 6.912, max: 43.2 }),
    SPD:          Object.freeze({ base: 4.032,    max: 25.032 }),
    PHYSICAL_DMG_BONUS: Object.freeze({ base: 6.2208, max: 38.8803 }),
    FIRE_DMG_BONUS:     Object.freeze({ base: 6.2208, max: 38.8803 }),
    ICE_DMG_BONUS:      Object.freeze({ base: 6.2208, max: 38.8803 }),
    WIND_DMG_BONUS:     Object.freeze({ base: 6.2208, max: 38.8803 }),
    LIGHTNING_DMG_BONUS: Object.freeze({ base: 6.2208, max: 38.8803 }),
    QUANTUM_DMG_BONUS:  Object.freeze({ base: 6.2208, max: 38.8803 }),
    IMAGINARY_DMG_BONUS: Object.freeze({ base: 6.2208, max: 38.8803 }),
    BREAK_EFFECT: Object.freeze({ base: 10.368,   max: 64.8 }),
    ENERGY_REGEN: Object.freeze({ base: 3.1104,   max: 19.4394 }),
});

export function buildHsrProfile() {
    const stat = {};
    for (const [key, tiers] of Object.entries(SUBSTAT_TIERS)) {
        stat[key] = Object.freeze({ tiers, weight: SUBSTAT_WEIGHTS[key] });
    }

    const mainStat = {};
    for (const [key, { base, max }] of Object.entries(MAIN_STATS)) {
        mainStat[key] = Object.freeze({ value: base, base, max });
    }

    // Reloj (Body): HP%, ATK%, DEF%, CRIT_RATE, CRIT_DMG, HEALING_BONUS, EFFECT_HIT_RATE
    // Botas (Feet): HP%, ATK%, DEF%, SPD
    // Planares (Sphere) y Cuerda (Rope): se dejan fuera del alcance de simulación
    // (no se mejoran), pero se registran sus mains para futura iteración.
    const piece = Object.freeze({
        HEAD:  Object.freeze({ validMainStats: [mainStat.HP_FLAT] }),
        HANDS: Object.freeze({ validMainStats: [mainStat.ATK_FLAT] }),
        BODY:  Object.freeze({ validMainStats: [
            mainStat.HP_PERCENT, mainStat.ATK_PERCENT, mainStat.DEF_PERCENT,
            mainStat.CRIT_RATE, mainStat.CRIT_DMG, mainStat.HEALING_BONUS,
            mainStat.EFFECT_HIT_RATE
        ]}),
        FEET:  Object.freeze({ validMainStats: [
            mainStat.HP_PERCENT, mainStat.ATK_PERCENT, mainStat.DEF_PERCENT, mainStat.SPD
        ]}),
        SPHERE: Object.freeze({ validMainStats: [
            mainStat.HP_PERCENT, mainStat.ATK_PERCENT, mainStat.DEF_PERCENT,
            mainStat.QUANTUM_DMG_BONUS, mainStat.LIGHTNING_DMG_BONUS,
            mainStat.FIRE_DMG_BONUS, mainStat.ICE_DMG_BONUS, mainStat.WIND_DMG_BONUS,
            mainStat.PHYSICAL_DMG_BONUS, mainStat.IMAGINARY_DMG_BONUS
        ]}),
        ROPE: Object.freeze({ validMainStats: [
            mainStat.HP_PERCENT, mainStat.ATK_PERCENT, mainStat.DEF_PERCENT,
            mainStat.BREAK_EFFECT, mainStat.ENERGY_REGEN
        ]}),
    });

    // Mapeo main --> equivalente substat (para pool de predicción y validación).
    // Un main no puede duplicar un substat del mismo tipo.
    const mainstatToSubstat = new Map([
        [mainStat.HP_PERCENT, stat.HP_PERCENT],
        [mainStat.ATK_PERCENT, stat.ATK_PERCENT],
        [mainStat.DEF_PERCENT, stat.DEF_PERCENT],
        [mainStat.CRIT_RATE, stat.CRIT_RATE],
        [mainStat.CRIT_DMG, stat.CRIT_DMG],
        [mainStat.HEALING_BONUS, null], // no hay substat healing
        [mainStat.EFFECT_HIT_RATE, stat.EFFECT_HIT_RATE],
        [mainStat.SPD, stat.SPD],
        [mainStat.BREAK_EFFECT, stat.BREAK_EFFECT],
        [mainStat.HP_FLAT, stat.HP_FLAT],
        [mainStat.ATK_FLAT, stat.ATK_FLAT],
        [mainStat.ENERGY_REGEN, null],
    ]);

    return Object.freeze({
        id: 'hsr',
        name: 'Honkai: Star Rail',
        // Reliquias que se mejoran (+15). Planar Sphere y Rope no se simulan
        // (no tienen mejoras), quedan para una iteración de scoring aparte.
        upgradeLevels: Object.freeze([3, 6, 9, 12, 15]),
        maxLevel: 15,
        // HSR usa 3 tiers; el RV de referencia es el máximo real (último).
        maxTierIndex: 2,
        // Umbrales de veredicto específicos de HSR (referencia comunitaria).
        // FIXED_MAIN = cabeza/manos; VARIABLE_MAIN = cuerpo/botas.
        thresholds: Object.freeze({
            FIXED_MAIN: Object.freeze({
                cvSub: Object.freeze({ INVEST: 25, CONSIDER: 12 }),
                rv:    Object.freeze({ INVEST: 90, CONSIDER: 75 }),
            }),
            VARIABLE_MAIN: Object.freeze({
                cv:    Object.freeze({ INVEST: 45, CONSIDER: 30 }),
                rv:    Object.freeze({ INVEST: 90, CONSIDER: 75 }),
            }),
        }),
        stat,
        mainStat,
        piece,
        mainstatToSubstat,
        statKeyByRef: invertKeyMap(stat),
        mainStatKeyByRef: invertKeyMap(mainStat),
        pieceKeyByRef: invertKeyMap(piece),
        // BODY y FEET tienen mainstat variable; HEAD/HANDS son fijo.
        variableMainPieces: Object.freeze(['BODY', 'FEET']),
        // Orden canónico de piezas para UI y lookup (solo las mejorables en esta
        // iteración; planares se añaden con scoring).
        pieceOrder: Object.freeze(['HEAD', 'HANDS', 'BODY', 'FEET']),
    });
}
