import { Artifact } from '../models/Artifact.js';
import { Substat } from '../models/Substat.js';
import { BuildGoal } from '../models/BuildGoal.js';
import { PieceType } from '../data/PieceType.js';
import { MainStatType } from '../data/MainStatType.js';
import { StatType } from '../data/StatType.js';
import { MAINSTAT_TO_SUBSTAT } from '../data/StatMapping.js';
import { PIECE_KEY_BY_REF } from '../utils/lookup.js';
import { simulate } from '../engine/Simulator.js';

export const SKIP_REASONS = Object.freeze({
    NO_PIECE: 'NO_PIECE',
    NO_MAIN: 'NO_MAIN',
    UNKNOWN_LEVEL: 'UNKNOWN_LEVEL',
    BAD_SUBSTAT: 'BAD_SUBSTAT',
    INVALID_ARTIFACT: 'INVALID_ARTIFACT'
});

const VALID_LEVELS = [0, 4, 8, 12, 16, 20];

export function mapRecordToArtifact(record) {
    const pieceKey = record?.piece;
    if (!pieceKey || !PieceType[pieceKey]) {
        return { ok: false, reason: SKIP_REASONS.NO_PIECE };
    }

    const mainKey = record.main?.key;
    if (!mainKey || !MainStatType[mainKey]) {
        return { ok: false, reason: SKIP_REASONS.NO_MAIN };
    }

    const level = record.main.level;
    if (!VALID_LEVELS.includes(level)) {
        return { ok: false, reason: SKIP_REASONS.UNKNOWN_LEVEL };
    }

    const substats = [];
    for (const s of record.substats ?? []) {
        if (!s?.key || !StatType[s.key] || !Number.isFinite(s.value)) {
            return { ok: false, reason: SKIP_REASONS.BAD_SUBSTAT, detail: s?.key ?? '' };
        }
        substats.push(new Substat(StatType[s.key], s.value));
    }

    let knownFourth = null;
    const pendingKey = record.pending?.key;
    if (pendingKey && StatType[pendingKey] && substats.length === 3) {
        const mainAsSub = MAINSTAT_TO_SUBSTAT.get(MainStatType[mainKey]);
        const collides =
            substats.some(s => s.type === StatType[pendingKey]) ||
            (mainAsSub !== undefined && mainAsSub === StatType[pendingKey]);
        if (!collides) knownFourth = StatType[pendingKey];
    }

    try {
        const artifact = new Artifact(PieceType[pieceKey], MainStatType[mainKey], level, substats);
        return { ok: true, artifact, knownFourth };
    } catch {
        return { ok: false, reason: SKIP_REASONS.INVALID_ARTIFACT };
    }
}

export function mapRecords(records) {
    const mapped = [];
    const skipped = [];

    for (const r of records ?? []) {
        const res = mapRecordToArtifact(r);
        if (res.ok) {
            mapped.push({
                archivo: r.archivo ?? '',
                setName: r.setName ?? '',
                artifact: res.artifact,
                knownFourth: res.knownFourth
            });
        } else {
            skipped.push({
                archivo: r?.archivo ?? '(sin nombre)',
                reason: res.reason,
                detail: res.detail ?? ''
            });
        }
    }

    return { mapped, skipped };
}

function yieldToUi() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

export async function analyzeBatch(mappedItems, goal = new BuildGoal([]), options = {}) {
    const { iterations = 10000, chunkSize = 8, onProgress } = options;
    const rows = [];

    for (let i = 0; i < mappedItems.length; i++) {
        const item = mappedItems[i];
        const result = simulate(item.artifact, goal, item.knownFourth, iterations);
        rows.push(toRow(item, result));

        const isChunkEnd = (i + 1) % chunkSize === 0 || i === mappedItems.length - 1;
        if (isChunkEnd) {
            onProgress?.(i + 1, mappedItems.length);
            await yieldToUi();
        }
    }

    rows.sort((a, b) =>
        b.investRate - a.investRate ||
        b.considerRate - a.considerRate ||
        b.cvAvg - a.cvAvg
    );

    return rows;
}

function toRow(item, result) {
    const fixedMain =
        item.artifact.pieceType === PieceType.FLOWER ||
        item.artifact.pieceType === PieceType.PLUME;

    return {
        archivo: item.archivo,
        setName: item.setName,
        pieceKey: PIECE_KEY_BY_REF.get(item.artifact.pieceType) ?? '',
        level: item.artifact.level,
        fourthKnown: Boolean(item.knownFourth),
        substatCount: item.artifact.getSubstatCount(),
        cvAvg: fixedMain ? result.avgCVSub : result.avgCV,
        rvAvg: result.avgRV,
        investRate: result.successRate,
        considerRate: result.considerRate,
        discardRate: result.discardRate,
        verdict: result.verdict
    };
}
