import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    mapRecordToArtifact,
    mapRecords,
    analyzeBatch,
    SKIP_REASONS
} from '../js/io/batchImport.js';
import { Artifact } from '../js/models/Artifact.js';
import { Substat } from '../js/models/Substat.js';
import { BuildGoal } from '../js/models/BuildGoal.js';
import { PieceType } from '../js/data/PieceType.js';
import { MainStatType } from '../js/data/MainStatType.js';
import { StatType } from '../js/data/StatType.js';

function sinRecord(overrides = {}) {
    return {
        archivo: 'IMG_001.png',
        source: 'sin',
        setName: 'Emblema del Destino',
        piece: 'SANDS',
        main: { key: 'ATK_PERCENT', value: 46.6, level: 0, levelSource: 'anchor' },
        substats: [
            { key: 'CRIT_RATE', value: 3.9 },
            { key: 'CRIT_DMG', value: 7.8 },
            { key: 'ENERGY_RECHARGE', value: 5.8 }
        ],
        pending: { key: 'ELEMENTAL_MASTERY', value: 23 },
        issues: [],
        status: 'ok',
        raw: '',
        ...overrides
    };
}

test('mapRecordToArtifact: registro válido con pending mapea y fija el 4to conocido', () => {
    const res = mapRecordToArtifact(sinRecord());

    assert.equal(res.ok, true);
    assert.equal(res.artifact.level, 0);
    assert.equal(res.artifact.mainStat, MainStatType.ATK_PERCENT);
    assert.equal(res.artifact.substats.length, 3);
    assert.equal(res.knownFourth, StatType.ELEMENTAL_MASTERY);
});

test('mapRecordToArtifact: pending que colisiona con un substat existente se ignora (no rompe)', () => {
    const rec = sinRecord({
        pending: { key: 'CRIT_RATE', value: 3.9 }
    });

    const res = mapRecordToArtifact(rec);

    assert.equal(res.ok, true);
    assert.equal(res.knownFourth, null);
});

test('mapRecordToArtifact: pending que duplica el tipo del main se ignora', () => {
    const rec = sinRecord({
        pending: { key: 'ATK_PERCENT', value: 4.1 }
    });

    const res = mapRecordToArtifact(rec);

    assert.equal(res.ok, true);
    assert.equal(res.knownFourth, null);
});

test('mapRecordToArtifact: pending ATQ plano junto a main ATQ% es válido (no colisiona)', () => {
    const rec = sinRecord({
        pending: { key: 'ATK_FLAT', value: 14 }
    });

    const res = mapRecordToArtifact(rec);

    assert.equal(res.ok, true);
    assert.equal(res.knownFourth, StatType.ATK_FLAT);
});

test('mapRecordToArtifact: pieza con 4 substats no usa pending', () => {
    const rec = sinRecord();
    rec.substats.push({ key: 'DEF_FLAT', value: 19 });
    rec.pending = null;

    const res = mapRecordToArtifact(rec);

    assert.equal(res.ok, true);
    assert.equal(res.artifact.substats.length, 4);
    assert.equal(res.knownFourth, null);
});

test('mapRecordToArtifact: nivel null (LEVEL_NO_ANCLA) se rechaza', () => {
    const rec = sinRecord({ main: { key: 'ATK_PERCENT', value: 3967, level: null, levelSource: 'unknown' } });

    const res = mapRecordToArtifact(rec);

    assert.equal(res.ok, false);
    assert.equal(res.reason, SKIP_REASONS.UNKNOWN_LEVEL);
});

test('mapRecordToArtifact: nivel fuera de grilla se rechaza; +16 válido se acepta', () => {
    const bad = sinRecord({ main: { key: 'ATK_PERCENT', value: 30, level: 13 } });
    const resBad = mapRecordToArtifact(bad);
    assert.equal(resBad.ok, false);
    assert.equal(resBad.reason, SKIP_REASONS.UNKNOWN_LEVEL);

    const ok16 = sinRecord({ main: { key: 'ATK_PERCENT', value: 38.7, level: 16, levelSource: 'anchor' } });
    const res = mapRecordToArtifact(ok16);
    assert.equal(res.ok, true);
    assert.equal(res.artifact.level, 16);
});

test('mapRecordToArtifact: substats duplicados se rechazan como artefacto inválido', () => {
    const rec = sinRecord({
        substats: [
            { key: 'CRIT_RATE', value: 3.9 },
            { key: 'CRIT_RATE', value: 2.7 },
            { key: 'CRIT_DMG', value: 7.8 }
        ]
    });

    const res = mapRecordToArtifact(rec);

    assert.equal(res.ok, false);
    assert.equal(res.reason, SKIP_REASONS.INVALID_ARTIFACT);
});

test('mapRecordToArtifact: razones de rechazo básicas', () => {
    assert.equal(mapRecordToArtifact({ ...sinRecord(), piece: 'XXX' }).reason, SKIP_REASONS.NO_PIECE);
    assert.equal(mapRecordToArtifact(sinRecord({ main: {} })).reason, SKIP_REASONS.NO_MAIN);

    const badSub = sinRecord({ substats: [{ key: 'CRIT_RATE', value: 'n/a' }] });
    assert.equal(mapRecordToArtifact(badSub).reason, SKIP_REASONS.BAD_SUBSTAT);
});

test('mapRecords: separa mapeados y omitidos con metadatos', () => {
    const good1 = sinRecord();
    const good2 = sinRecord({ archivo: 'IMG_002.png', piece: 'FLOWER', main: { key: 'HP_FLAT', value: 4780, level: 20, levelSource: 'anchor' }, pending: null });
    const bad = sinRecord({ archivo: 'IMG_003.png', piece: 'ZZZ' });

    const { mapped, skipped } = mapRecords([good1, good2, bad]);

    assert.equal(mapped.length, 2);
    assert.equal(skipped.length, 1);
    assert.equal(skipped[0].archivo, 'IMG_003.png');
    assert.equal(skipped[0].reason, SKIP_REASONS.NO_PIECE);
    assert.equal(mapped[1].artifact.pieceType, PieceType.FLOWER);
});

test('analyzeBatch: artefacto a +20 con 4 substats es determinístico (sin rolls restantes)', async () => {
    const rec = {
        archivo: 'MAX.png',
        setName: 'Set',
        piece: 'PLUME',
        main: { key: 'ATK_FLAT', value: 311, level: 20, levelSource: 'anchor' },
        substats: [
            { key: 'CRIT_RATE', value: 31.1 },
            { key: 'CRIT_DMG', value: 62.2 },
            { key: 'ATK_PERCENT', value: 41.7 },
            { key: 'ENERGY_RECHARGE', value: 45.6 }
        ],
        pending: null
    };

    const { mapped } = mapRecords([rec]);
    const rows = await analyzeBatch(mapped, new BuildGoal([]), { iterations: 100 });

    assert.equal(rows.length, 1);
    const row = rows[0];
    assert.equal(row.fourthKnown, false);
    assert.equal(row.investRate, 100);
    assert.equal(row.considerRate, 0);
    assert.equal(row.discardRate, 0);
    // El RV no está acotado a 100 en piezas ya subidas (mide suerte
    // relativa y puede superar 100 cuando los rolls se apilan).
    assert.ok(row.rvAvg > 0);
    assert.equal(row.pieceKey, 'PLUME');
    assert.equal(row.verdict, 'INVERTIR');
});

test('analyzeBatch: fila a +0 con 4to conocido reporta probabilidades coherentes', async () => {
    const { mapped } = mapRecords([sinRecord()]);
    const rows = await analyzeBatch(mapped, new BuildGoal([]), { iterations: 500 });

    const row = rows[0];
    assert.equal(rows.length, 1);
    assert.equal(row.fourthKnown, true);
    assert.equal(row.level, 0);

    const total = row.investRate + row.considerRate + row.discardRate;
    assert.ok(Math.abs(total - 100) <= 0.4, `las tasas deben sumar ~100, dieron ${total}`);
    assert.ok(['INVERTIR', 'CONSIDERAR', 'DESCARTAR'].includes(row.verdict));
    assert.ok(row.rvAvg > 0);
    assert.ok(row.cvAvg >= 0);
});

test('analyzeBatch: onProgress reporta hasta el total y ordena por % invertir desc', async () => {
    const records = [];
    for (let i = 0; i < 5; i++) {
        records.push(sinRecord({ archivo: `IMG_${i}.png` }));
    }

    const { mapped } = mapRecords(records);

    let lastCall = null;
    let calls = 0;
    const rows = await analyzeBatch(mapped, new BuildGoal([]), {
        iterations: 50,
        chunkSize: 2,
        onProgress: (done, total) => { lastCall = [done, total]; calls++; }
    });

    assert.equal(rows.length, 5);
    assert.ok(calls >= 3);
    assert.deepEqual(lastCall, [5, 5]);

    for (let i = 1; i < rows.length; i++) {
        assert.ok(
            rows[i - 1].investRate >= rows[i].investRate,
            'debe estar ordenado por investRate descendente'
        );
    }
});

test('integración: un lote mixto produce filas y omisiones esperadas', async () => {
    const records = [
        sinRecord(),
        sinRecord({
            archivo: 'B.png',
            piece: 'CIRCLET',
            main: { key: 'CRIT_DMG', value: 62.2, level: 0, levelSource: 'anchor' },
            substats: [
                { key: 'CRIT_RATE', value: 3.9 },
                { key: 'ATK_PERCENT', value: 4.1 },
                { key: 'ENERGY_RECHARGE', value: 4.5 }
            ],
            pending: null
        }),
        sinRecord({ archivo: 'C.png', main: { key: 'ATK_PERCENT', value: 46.6, level: null } })
    ];

    const { mapped, skipped } = mapRecords(records);
    assert.equal(mapped.length, 2);
    assert.equal(skipped.length, 1);

    const rows = await analyzeBatch(mapped, new BuildGoal([]), { iterations: 200 });
    assert.equal(rows.length, 2);
});
