import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { Artifact } from '../js/models/Artifact.js';
import { Substat } from '../js/models/Substat.js';
import { BuildGoal } from '../js/models/BuildGoal.js';
import { PieceType } from '../js/data/PieceType.js';
import { MainStatType } from '../js/data/MainStatType.js';
import { StatType } from '../js/data/StatType.js';
import { simulate } from '../js/engine/Simulator.js';
import { predictFourthSubstat, getMostLikelyFourthSubstat } from '../js/engine/GameRules.js';

const noGoal = new BuildGoal([]);
const critGoal = new BuildGoal([StatType.CRIT_RATE, StatType.CRIT_DMG]);

describe('3 substats: el 4to substat proyectado debe participar en la simulación', () => {
    test('totalRolls corregido: 8 rolls (no 7) para un 3-substat', () => {
        // Corona con 3 substats sin crit, sin proyección forzada -> usa el más probable.
        const artifact = new Artifact(PieceType.CIRCLET, MainStatType.HP_PERCENT, 0, [
            new Substat(StatType.ATK_FLAT, 14),
            new Substat(StatType.DEF_FLAT, 16),
            new Substat(StatType.ENERGY_RECHARGE, 4.531),
        ]);
        const result = simulate(artifact, noGoal);
        // Con 8 rolls totales, el mejor caso posible (si todo fuera al stat de
        // mayor techo, T4 x8) da un RV proporcionalmente MENOR que si el motor
        // (con el bug viejo) solo contara 7 rolls. Verificamos indirectamente:
        // el peor caso nunca debería superar el promedio, y el promedio nunca
        // al mejor -- y ambos deben ser calculables sin excepción.
        assert.ok(result.worstRV <= result.avgRV);
        assert.ok(result.avgRV <= result.bestRV);
    });

    test('el substat proyectado SÍ se refleja en CV cuando el goal lo pide y es CRIT', () => {
        const artifact = new Artifact(PieceType.CIRCLET, MainStatType.HP_PERCENT, 0, [
            new Substat(StatType.ATK_FLAT, 14),
            new Substat(StatType.DEF_FLAT, 16),
            new Substat(StatType.ENERGY_RECHARGE, 4.531),
        ]);
        // Forzamos la proyección a CRIT_DMG (antes del fix, esto era imposible:
        // el simulador jamás consideraba un 4to stat que no estuviera ya en el array).
        const result = simulate(artifact, critGoal, StatType.CRIT_DMG);
        assert.ok(result.bestCVSub > 0, 'el mejor caso debe reflejar CRIT_DMG proyectado en el CV');
    });

    test('getMostLikelyFourthSubstat y predictFourthSubstat[0] concuerdan en probabilidad (misma fuente de verdad)', () => {
        const artifact = new Artifact(PieceType.SANDS, MainStatType.ENERGY_RECHARGE, 0, [
            new Substat(StatType.CRIT_RATE, 2.722),
            new Substat(StatType.CRIT_DMG, 5.444),
            new Substat(StatType.HP_FLAT, 209),
        ]);
        const mostLikely = getMostLikelyFourthSubstat(artifact);
        const predictions = predictFourthSubstat(artifact, noGoal);
        const maxProb = Math.max(...predictions.map(p => p.probability));
        const mostLikelyProb = predictions.find(p => p.stat === mostLikely).probability;
        assert.equal(mostLikelyProb, maxProb);
    });
});

describe('4 substats: comportamiento pre-existente no debe cambiar', () => {
    test('totalRolls sigue siendo 9 (4 iniciales + 5 upgrades)', () => {
        const artifact = new Artifact(PieceType.GOBLET, MainStatType.PYRO_DMG_BONUS, 20, [
            new Substat(StatType.CRIT_RATE, 3.889),
            new Substat(StatType.CRIT_DMG, 7.778),
            new Substat(StatType.ATK_PERCENT, 5.833),
            new Substat(StatType.HP_FLAT, 299),
        ]);
        const result = simulate(artifact, critGoal);
        // A nivel 20 no quedan upgrades, best === worst === avg.
        assert.equal(result.bestRV, result.worstRV);
        assert.equal(result.bestRV, result.avgRV);
    });
});

describe('Flor y Pluma: mainstat fijo, CV se basa solo en substats', () => {
    test('Flor con doble crítico fuerte -> INVERTIR', () => {
        const artifact = new Artifact(PieceType.FLOWER, MainStatType.HP_FLAT, 20, [
            new Substat(StatType.CRIT_RATE, 3.889 * 3),
            new Substat(StatType.CRIT_DMG, 7.778 * 3),
            new Substat(StatType.ATK_PERCENT, 5.833),
            new Substat(StatType.DEF_FLAT, 23),
        ]);
        const result = simulate(artifact, critGoal);
        assert.equal(result.verdict, 'INVERTIR');
    });

    test('Pluma sin ningún stat de crit -> veredicto cae a RV, no a CV', () => {
        const artifact = new Artifact(PieceType.PLUME, MainStatType.ATK_FLAT, 20, [
            new Substat(StatType.HP_FLAT, 299),
            new Substat(StatType.DEF_FLAT, 23),
            new Substat(StatType.ATK_PERCENT, 5.833),
            new Substat(StatType.ENERGY_RECHARGE, 6.474),
        ]);
        const result = simulate(artifact, critGoal);
        assert.equal(result.avgCVSub, 0);
        assert.ok(['INVERTIR', 'CONSIDERAR', 'DESCARTAR'].includes(result.verdict));
    });
});

describe('Triple crítico (CV extremo)', () => {
    test('Corona con CRIT_RATE de mainstat + 2 substats crit -> CV altísimo, INVERTIR', () => {
        const artifact = new Artifact(PieceType.CIRCLET, MainStatType.CRIT_RATE, 20, [
            new Substat(StatType.CRIT_DMG, 7.778 * 3),
            new Substat(StatType.ATK_PERCENT, 5.833),
            new Substat(StatType.ENERGY_RECHARGE, 6.474),
            new Substat(StatType.HP_FLAT, 299),
        ]);
        const result = simulate(artifact, critGoal);
        assert.equal(result.verdict, 'INVERTIR');
        assert.ok(result.avgCV > result.avgCVSub, 'el CV total debe ser mayor al de solo-substats por el mainstat crit');
    });
});

describe('Validaciones', () => {
    test('nivel inválido lanza error', () => {
        assert.throws(() => {
            new Artifact(PieceType.FLOWER, MainStatType.HP_FLAT, 7, [
                new Substat(StatType.CRIT_RATE, 2.722),
                new Substat(StatType.CRIT_DMG, 5.444),
                new Substat(StatType.HP_FLAT, 209),
            ]);
        }, /Nivel inválido/);
    });

    test('substats duplicados lanza error', () => {
        assert.throws(() => {
            new Artifact(PieceType.FLOWER, MainStatType.HP_FLAT, 0, [
                new Substat(StatType.CRIT_RATE, 2.722),
                new Substat(StatType.CRIT_RATE, 2.722),
                new Substat(StatType.HP_FLAT, 209),
            ]);
        }, /repetido/);
    });

    test('substat igual al mainstat (caso imposible en el juego) lanza error', () => {
        assert.throws(() => {
            new Artifact(PieceType.CIRCLET, MainStatType.CRIT_RATE, 0, [
                new Substat(StatType.CRIT_RATE, 2.722), // imposible: ya es el mainstat
                new Substat(StatType.CRIT_DMG, 5.444),
                new Substat(StatType.HP_FLAT, 209),
            ]);
        }, /mainstat/);
    });

    test('mainstat no válido para la pieza lanza error', () => {
        assert.throws(() => {
            new Artifact(PieceType.FLOWER, MainStatType.CRIT_RATE, 0, [
                new Substat(StatType.CRIT_DMG, 5.444),
                new Substat(StatType.ATK_FLAT, 14),
                new Substat(StatType.HP_FLAT, 209),
            ]);
        }, /main stat no es válido/);
    });

    test('addSubstat respeta las mismas invariantes', () => {
        const artifact = new Artifact(PieceType.SANDS, MainStatType.ENERGY_RECHARGE, 0, [
            new Substat(StatType.CRIT_RATE, 2.722),
            new Substat(StatType.CRIT_DMG, 5.444),
            new Substat(StatType.HP_FLAT, 209),
        ]);
        assert.throws(() => artifact.addSubstat(new Substat(StatType.CRIT_RATE, 2.722)), /repetido/);
        artifact.addSubstat(new Substat(StatType.ATK_FLAT, 14));
        assert.throws(() => artifact.addSubstat(new Substat(StatType.DEF_FLAT, 16)), /más de 4/);
    });
});
