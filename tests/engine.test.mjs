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

// PRNG determinístico (mulberry32): hace que la simulación sea reproducible
// en tests. Misma semilla -> misma secuencia -> mismos resultados exactos.
function mulberry32(seed) {
    return function() {
        let t = (seed += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const noGoal = new BuildGoal([]);
const critGoal = new BuildGoal([StatType.CRIT_RATE, StatType.CRIT_DMG]);

describe('3 substats: el 4to substat proyectado debe participar en la simulación', () => {
    test('totalRolls corregido: 8 rolls (no 7) para un 3-substat', () => {
        // Corona con 3 substats sin crit, sin proyección forzada -> usa el más probable.
        // RNG con seed: la simulación es determinística. Los valores golden se
        // generaron con seed 42; si el motor volviera a contar 7 rolls (bug viejo),
        // el denominador de RV cambiaría y estos valores exactos fallarían.
        const artifact = new Artifact(PieceType.CIRCLET, MainStatType.HP_PERCENT, 0, [
            new Substat(StatType.ATK_FLAT, 14),
            new Substat(StatType.DEF_FLAT, 16),
            new Substat(StatType.ENERGY_RECHARGE, 4.531),
        ]);
        const result = simulate(artifact, noGoal, null, 10000, mulberry32(42));
        assert.equal(result.worstRV, 81.2);
        assert.equal(result.avgRV, 75.8);
        assert.equal(result.bestRV, 80.6);
    });

    test('el substat proyectado SÍ se refleja en CV cuando el goal lo pide y es CRIT', () => { // Corona con 3 substats sin crit, pero forzamos la proyección a CRIT_DMG -> el CV debe reflejarlo. Antes del fix, el motor jamás consideraba un 4to stat que no estuviera ya en el array, así que el CV era 0.
        const artifact = new Artifact(PieceType.CIRCLET, MainStatType.HP_PERCENT, 0, [
            new Substat(StatType.ATK_FLAT, 14),
            new Substat(StatType.DEF_FLAT, 16),
            new Substat(StatType.ENERGY_RECHARGE, 4.531),
        ]);
        // Forzamos la proyección a CRIT_DMG (antes del fix, esto era imposible:
        // el simulador jamás consideraba un 4to stat que no estuviera ya en el array).
        const result = simulate(artifact, critGoal, StatType.CRIT_DMG, 10000, mulberry32(42));
        assert.ok(result.bestCVSub > 0, 'el mejor caso debe reflejar CRIT_DMG proyectado en el CV');
    });

    test('getMostLikelyFourthSubstat y predictFourthSubstat[0] concuerdan en probabilidad (misma fuente de verdad)', () => { // Corona con 3 substats sin crit, sin proyección forzada -> el 4to substat más probable debe coincidir con la predicción más probable. Antes del fix, el motor jamás consideraba un 4to stat que no estuviera ya en el array, así que la predicción más probable era siempre un stat ya existente.
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

describe('4 substats: comportamiento pre-existente no debe cambiar', () => { // Simula un artefacto con 4 substats y verifica que el total de rolls siga siendo 9 (4 iniciales + 5 upgrades), y que el bestRV, worstRV y avgRV sean iguales, ya que a nivel 20 no quedan upgrades.
    test('totalRolls sigue siendo 9 (4 iniciales + 5 upgrades)', () => {
        const artifact = new Artifact(PieceType.GOBLET, MainStatType.PYRO_DMG_BONUS, 20, [
            new Substat(StatType.CRIT_RATE, 3.889),
            new Substat(StatType.CRIT_DMG, 7.778),
            new Substat(StatType.ATK_PERCENT, 5.833),
            new Substat(StatType.HP_FLAT, 299),
        ]);
        const result = simulate(artifact, critGoal, null, 10000, mulberry32(1));
        // A nivel 20 no quedan upgrades, best === worst === avg.
        assert.equal(result.bestRV, result.worstRV);
        assert.equal(result.bestRV, result.avgRV);
    });
});

describe('Flor y Pluma: mainstat fijo, CV se basa solo en substats', () => { // Simula una flor y una pluma con 4 substats y verifica que el CV promedio sea mayor a 0, que el veredicto sea uno de los esperados y que el avgCVSub sea igual al avgCV, ya que el mainstat no aporta CV.
    test('Flor con doble crítico fuerte -> INVERTIR', () => { // Flor con 4 substats, 2 de ellos críticos -> el CV promedio debe ser alto y el veredicto debe ser 'INVERTIR'.
        const artifact = new Artifact(PieceType.FLOWER, MainStatType.HP_FLAT, 20, [
            new Substat(StatType.CRIT_RATE, 3.889 * 3),
            new Substat(StatType.CRIT_DMG, 7.778 * 3),
            new Substat(StatType.ATK_PERCENT, 5.833),
            new Substat(StatType.DEF_FLAT, 23),
        ]);
        const result = simulate(artifact, critGoal, null, 10000, mulberry32(2));
        assert.equal(result.verdict, 'INVERTIR');
    });

    test('Pluma sin ningún stat de crit -> veredicto cae a RV, no a CV', () => { // Pluma con 4 substats sin crit -> el CV promedio debe ser 0, y el veredicto debe basarse en RV, no en CV. Se verifica que avgCVSub sea 0 y que el veredicto sea uno de los esperados.
        const artifact = new Artifact(PieceType.PLUME, MainStatType.ATK_FLAT, 20, [
            new Substat(StatType.HP_FLAT, 299),
            new Substat(StatType.DEF_FLAT, 23),
            new Substat(StatType.ATK_PERCENT, 5.833),
            new Substat(StatType.ENERGY_RECHARGE, 6.474),
        ]);
        const result = simulate(artifact, critGoal, null, 10000, mulberry32(3));
        assert.equal(result.avgCVSub, 0);
        assert.ok(['INVERTIR', 'CONSIDERAR', 'DESCARTAR'].includes(result.verdict));
    });
});

describe('Triple crítico (CV extremo)', () => { // Simula una corona con 4 substats, 3 de ellos críticos -> el CV promedio debe ser altísimo y el veredicto debe ser 'INVERTIR'.
    test('Corona con CRIT_RATE de mainstat + 2 substats crit -> CV altísimo, INVERTIR', () => {
        const artifact = new Artifact(PieceType.CIRCLET, MainStatType.CRIT_RATE, 20, [
            new Substat(StatType.CRIT_DMG, 7.778 * 3),
            new Substat(StatType.ATK_PERCENT, 5.833),
            new Substat(StatType.ENERGY_RECHARGE, 6.474),
            new Substat(StatType.HP_FLAT, 299),
        ]);
        const result = simulate(artifact, critGoal, null, 10000, mulberry32(4));
        assert.equal(result.verdict, 'INVERTIR');
        assert.ok(result.avgCV > result.avgCVSub, 'el CV total debe ser mayor al de solo-substats por el mainstat crit');
    });
});

describe('Validaciones', () => { // Se definen pruebas para verificar que se lancen errores al crear un artefacto con nivel inválido, substats duplicados, substat igual al mainstat o mainstat no válido para la pieza, y que el método addSubstat respete las mismas invariantes.
    test('nivel inválido lanza error', () => { // Verifica que se lance un error al crear un artefacto con un nivel inválido según el perfil de juego.
        assert.throws(() => {
            new Artifact(PieceType.FLOWER, MainStatType.HP_FLAT, 7, [
                new Substat(StatType.CRIT_RATE, 2.722),
                new Substat(StatType.CRIT_DMG, 5.444),
                new Substat(StatType.HP_FLAT, 209),
            ]);
        }, /Nivel inválido/);
    });

    test('substats duplicados lanza error', () => { // Se intenta crear un artefacto con 3 substats, dos de ellos duplicados -> se espera que se lance un error indicando que hay substats repetidos.
        assert.throws(() => {
            new Artifact(PieceType.FLOWER, MainStatType.HP_FLAT, 0, [
                new Substat(StatType.CRIT_RATE, 2.722),
                new Substat(StatType.CRIT_RATE, 2.722),
                new Substat(StatType.HP_FLAT, 209),
            ]);
        }, /repetido/);
    });

    test('substat igual al mainstat (caso imposible en el juego) lanza error', () => { // Se intenta crear un artefacto con 3 substats, uno de ellos igual al mainstat -> se espera que se lance un error indicando que el mainstat coincide con un substat.
        assert.throws(() => {
            new Artifact(PieceType.CIRCLET, MainStatType.CRIT_RATE, 0, [
                new Substat(StatType.CRIT_RATE, 2.722), // imposible: ya es el mainstat
                new Substat(StatType.CRIT_DMG, 5.444),
                new Substat(StatType.HP_FLAT, 209),
            ]);
        }, /mainstat/);
    });

    test('mainstat no válido para la pieza lanza error', () => { // Se intenta crear un artefacto con un mainstat que no es válido para la pieza (ej. CRIT_RATE en una flor) -> se espera que se lance un error indicando que el mainstat no es válido para la pieza.
        assert.throws(() => {
            new Artifact(PieceType.FLOWER, MainStatType.CRIT_RATE, 0, [
                new Substat(StatType.CRIT_DMG, 5.444),
                new Substat(StatType.ATK_FLAT, 14),
                new Substat(StatType.HP_FLAT, 209),
            ]);
        }, /main stat no es válido/);
    });

    test('addSubstat respeta las mismas invariantes', () => { // Se crea un artefacto con 3 substats y se intenta agregar un substat duplicado -> se espera que se lance un error indicando que hay substats repetidos. Luego se agrega un substat válido y se intenta agregar otro substat más -> se espera que se lance un error indicando que ya hay 4 substats.
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
