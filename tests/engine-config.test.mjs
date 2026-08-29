import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { simulate } from '../js/engine/Simulator.js';
import { Artifact } from '../js/models/Artifact.js';
import { Substat } from '../js/models/Substat.js';
import { BuildGoal } from '../js/models/BuildGoal.js';
import { PieceType } from '../js/data/PieceType.js';
import { MainStatType } from '../js/data/MainStatType.js';
import { StatType } from '../js/data/StatType.js';
import { getProfile, getAllProfiles } from '../js/data/profiles/index.js';

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

describe('perfil HSR: contrato de datos abstracto del motor', () => {
    const hsr = getProfile('hsr');

    test('grilla de niveles, tiers y RV de referencia', () => {
        assert.equal(hsr.id, 'hsr');
        assert.deepEqual(hsr.upgradeLevels, [3, 6, 9, 12, 15]);
        assert.equal(hsr.maxLevel, 15);
        // 3 tiers (Low/Med/High), no 4 como Genshin.
        assert.equal(hsr.maxTierIndex, 2);
        for (const key of Object.keys(hsr.stat)) {
            assert.equal(hsr.stat[key].tiers.length, 3, key);
        }
    });

    test('lookups inversos resuelven refs de stat, main y pieza', () => {
        assert.equal(hsr.statKeyByRef.get(hsr.stat.CRIT_RATE), 'CRIT_RATE');
        assert.equal(hsr.mainStatKeyByRef.get(hsr.mainStat.HP_PERCENT), 'HP_PERCENT');
        assert.equal(hsr.pieceKeyByRef.get(hsr.piece.BODY), 'BODY');
        assert.equal(hsr.pieceKeyByRef.get(hsr.piece.HEAD), 'HEAD');
        assert.equal(hsr.statKeyByRef.get(hsr.mainStat.CRIT_RATE), undefined, 'mainStat no debe colisionar con stat');
    });

    test('substats específicos de HSR (SPD, EHT, EHR, BE) y sin EM', () => {
        for (const key of ['SPD', 'EFFECT_HIT_RATE', 'EFFECT_RES', 'BREAK_EFFECT']) {
            assert.ok(hsr.stat[key], key);
            assert.ok(hsr.stat[key].weight > 0, key);
        }
        assert.equal(hsr.stat.ELEMENTAL_MASTERY, undefined, 'HSR no tiene EM');
        // Pesos suman 100 (fuente wiki).
        const total = Object.values(hsr.stat).reduce((s, v) => s + v.weight, 0);
        assert.equal(total, 100);
    });

    test('mainstats de cuerpo y botas: variable con mains válidos', () => {
        const body = hsr.piece.BODY.validMainStats;
        assert.ok(body.includes(hsr.mainStat.CRIT_RATE));
        assert.ok(body.includes(hsr.mainStat.HEALING_BONUS));
        assert.ok(body.includes(hsr.mainStat.EFFECT_HIT_RATE));
        assert.ok(!body.includes(hsr.mainStat.SPD), 'cuerpo no tiene SPD');

        const feet = hsr.piece.FEET.validMainStats;
        assert.ok(feet.includes(hsr.mainStat.SPD));
        assert.ok(!feet.includes(hsr.mainStat.CRIT_RATE), 'botas no tiene CRIT');

        assert.deepEqual(hsr.variableMainPieces, ['BODY', 'FEET']);
    });

    test('simulación HSR con perfil inyectado produce rangos válidos', () => {
        // Cabeza (mainstat fijo HP_FLAT) a +0 con 3 substats -> 4 rolls restantes.
        const artifact = new Artifact(hsr.piece.HEAD, hsr.mainStat.HP_FLAT, 0, [
            new Substat(hsr.stat.CRIT_RATE, 2.9),
            new Substat(hsr.stat.HP_PERCENT, 3.8),
            new Substat(hsr.stat.ATK_PERCENT, 3.8),
        ]);

        const result = simulate(artifact, new BuildGoal([]), null, 500, Math.random, { profile: hsr });

        assert.ok(result.bestCV >= result.worstCV);
        assert.ok(['INVERTIR', 'CONSIDERAR', 'DESCARTAR'].includes(result.verdict));
        assert.ok(result.avgRV > 0);
        // RV de referencia HSR: máximo real (3 tiers). Jamás debe exceder 100.
        assert.ok(result.bestRV <= 100.1);
    });
});
