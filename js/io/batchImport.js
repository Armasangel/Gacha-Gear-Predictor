import { Artifact } from '../models/Artifact.js';
import { Substat } from '../models/Substat.js';
import { BuildGoal } from '../models/BuildGoal.js';
import { getProfile } from '../data/profiles/index.js';
import { simulate } from '../engine/Simulator.js';

export const SKIP_REASONS = Object.freeze({
    NO_PIECE: 'NO_PIECE',
    NO_MAIN: 'NO_MAIN',
    UNKNOWN_LEVEL: 'UNKNOWN_LEVEL',
    BAD_SUBSTAT: 'BAD_SUBSTAT',
    INVALID_ARTIFACT: 'INVALID_ARTIFACT'
});

// maps un registro normalizado a una pieza del perfil activo (org por https).
function resolveProfile(profileId) {
    try {
        return getProfile(profileId);
    } catch {
        return getProfile('genshin');
    }
}

export function mapRecordToArtifact(record, profileId = 'genshin') {
    const profile = resolveProfile(profileId);

    const pieceKey = record?.piece;
    if (!pieceKey || !profile.piece[pieceKey]) {
        return { ok: false, reason: SKIP_REASONS.NO_PIECE };
    }

    const mainKey = record.main?.key;
    if (!mainKey || !profile.mainStat[mainKey]) {
        return { ok: false, reason: SKIP_REASONS.NO_MAIN };
    }

    const level = record.main.level;
    const validLevels = [0, ...profile.upgradeLevels];
    if (!validLevels.includes(level)) {
        return { ok: false, reason: SKIP_REASONS.UNKNOWN_LEVEL };
    }

    const substats = [];
    for (const s of record.substats ?? []) {
        if (!s?.key || !profile.stat[s.key] || !Number.isFinite(s.value)) {
            return { ok: false, reason: SKIP_REASONS.BAD_SUBSTAT, detail: s?.key ?? '' };
        }
        substats.push(new Substat(profile.stat[s.key], s.value));
    }

    let knownFourth = null;
    const pendingKey = record.pending?.key;
    if (pendingKey && profile.stat[pendingKey] && substats.length === 3) {
        const mainAsSub = profile.mainstatToSubstat.get(profile.mainStat[mainKey]);
        const collides =
            substats.some(s => s.type === profile.stat[pendingKey]) ||
            (mainAsSub !== undefined && mainAsSub === profile.stat[pendingKey]);
        if (!collides) knownFourth = profile.stat[pendingKey];
    }

    try {
        const artifact = new Artifact(
            profile.piece[pieceKey],
            profile.mainStat[mainKey],
            level,
            substats,
            profile
        );
        return { ok: true, artifact, knownFourth };
    } catch {
        return { ok: false, reason: SKIP_REASONS.INVALID_ARTIFACT };
    }
}

export function mapRecords(records, profileId = 'genshin') {
    const mapped = [];
    const skipped = [];

    for (const r of records ?? []) {
        const res = mapRecordToArtifact(r, profileId);
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
    const profile = item.artifact.profile ?? getProfile('genshin');
    const pieceKey = profile.pieceKeyByRef.get(item.artifact.pieceType) ?? '';
    const fixedMain = !profile.variableMainPieces.includes(pieceKey);

    return {
        archivo: item.archivo,
        setName: item.setName,
        pieceKey,
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
