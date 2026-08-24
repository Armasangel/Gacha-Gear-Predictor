import { test } from 'node:test';
import assert from 'node:assert/strict';

import { simulate } from '../js/engine/Simulator.js';
import { Artifact } from '../js/models/Artifact.js';
import { Substat } from '../js/models/Substat.js';
import { BuildGoal } from '../js/models/BuildGoal.js';
import { PieceType } from '../js/data/PieceType.js';
import { MainStatType } from '../js/data/MainStatType.js';
import { StatType } from '../js/data/StatType.js';

function sub(key, value) {
    return new Substat(StatType[key], value);
}

// Pluma monstruosa a +16 con 4 substats: con la grilla por defecto queda
// 1 upgrade pendiente (el +20); con grilla [4,8,12,16] queda 0.
function plumeAt16() {
    return new Artifact(PieceType.PLUME, MainStatType.ATK_FLAT, 16, [
        sub('CRIT_RATE', 24.5),
        sub('CRIT_DMG', 49.6),
        sub('ATK_PERCENT', 33.3),
        sub('ENERGY_RECHARGE', 38.9)
    ]);
}

test('config por defecto: sin gameConfig el motor sigue siendo Genshin', () => {
    const result = simulate(plumeAt16(), new BuildGoal([]), null, 200);

    assert.ok(result.bestCV >= result.worstCV);
    assert.ok(result.iterations === 200);
    assert.ok(['INVERTIR', 'CONSIDERAR', 'DESCARTAR'].includes(result.verdict));
});

test('upgradeLevels inyectado: grilla terminada en +16 deja cero aleatoriedad', () => {
    const rngQueExplota = () => {
        throw new Error('no debería consumir azar si no quedan upgrades');
    };

    const result = simulate(
        plumeAt16(),
        new BuildGoal([]),
        null,
        50,
        rngQueExplota,
        { upgradeLevels: [4, 8, 12, 16] }
    );

    // Sin rolls restantes todas las corridas son idénticas y fuertes.
    assert.equal(result.successRate, 100);
    assert.equal(result.considerRate, 0);
    assert.equal(result.discardRate, 0);
    assert.equal(result.bestCV, result.worstCV);
    assert.equal(result.verdict, 'INVERTIR');
});

test('upgradeLevels inyectado: la misma pieza con grilla default aún tiene azar', () => {
    const rngQueExplota = () => {
        throw new Error('el +20 con grilla default debe consumir rng');
    };

    assert.throws(
        () => simulate(plumeAt16(), new BuildGoal([]), null, 5, rngQueExplota),
        /debe consumir rng/
    );
});

test('thresholds inyectados: umbrales laxos convierten un veredicto', () => {
    const sands = new Artifact(PieceType.SANDS, MainStatType.ATK_PERCENT, 0, [
        sub('CRIT_RATE', 3.9),
        sub('CRIT_DMG', 7.8),
        sub('ENERGY_RECHARGE', 5.8)
    ]);

    const porDefecto = simulate(sands, new BuildGoal([]), StatType.ELEMENTAL_MASTERY, 300);
    assert.notEqual(porDefecto.successRate, 100);

    // CV mínimo posible de esta pieza: 2*3.9 + 7.8 = 15.6. Con INVEST en 10
    // TODAS las corridas caen en INVERTIR sin importar el azar.
    const laxos = {
        FIXED_MAIN: {
            cvSub: { INVEST: 10, CONSIDER: 5 },
            rv:    { INVEST: 0,  CONSIDER: 0 }
        },
        VARIABLE_MAIN: {
            cv: { INVEST: 10, CONSIDER: 5 },
            rv: { INVEST: 0,  CONSIDER: 0 }
        }
    };

    const relajado = simulate(sands, new BuildGoal([]), StatType.ELEMENTAL_MASTERY, 300, Math.random, { thresholds: laxos });

    assert.equal(relajado.successRate, 100);
    assert.equal(relajado.considerRate, 0);
    assert.equal(relajado.discardRate, 0);
    assert.equal(relajado.verdict, 'INVERTIR');
});

test('grilla estilo HSR [3,6,9,12,15]: primera mejora revela, resto suma rolls', () => {
    // A nivel 0 con 3 substats y grilla HSR quedan 4 rolls (5 escalones - 1 revelación),
    // igual estructura que Genshin con su grilla.
    const sands = new Artifact(PieceType.SANDS, MainStatType.ATK_PERCENT, 0, [
        sub('CRIT_RATE', 3.9),
        sub('CRIT_DMG', 7.8),
        sub('ENERGY_RECHARGE', 5.8)
    ]);

    const hsr = simulate(sands, new BuildGoal([]), StatType.ELEMENTAL_MASTERY, 500, Math.random, {
        upgradeLevels: [3, 6, 9, 12, 15]
    });
    const gen = simulate(sands, new BuildGoal([]), StatType.ELEMENTAL_MASTERY, 500);

    // Mismo número total de rolls → distribuciones comparables, ninguna vacía.
    for (const r of [hsr, gen]) {
        const total = r.successRate + r.considerRate + r.discardRate;
        assert.ok(Math.abs(total - 100) <= 0.4);
        assert.ok(r.avgRV > 0);
    }
});
