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

export function mapRecordToArtifact(record, profileId = 'genshin') { // Mapea un registro normalizado a un artefacto según el perfil activo. Devuelve {ok: true, artifact, knownFourth} si es válido, o {ok: false, reason} si no lo es.
    const profile = resolveProfile(profileId);

    const pieceKey = record?.piece;
    if (!pieceKey || !profile.piece[pieceKey]) { // Si no hay piece o no es válida según el perfil, se salta el registro
        return { ok: false, reason: SKIP_REASONS.NO_PIECE };
    }

    const mainKey = record.main?.key;
    if (!mainKey || !profile.mainStat[mainKey]) { // Si no hay main o no es válido según el perfil, se salta el registro
        return { ok: false, reason: SKIP_REASONS.NO_MAIN };
    }

    const level = record.main.level;
    const validLevels = [0, ...profile.upgradeLevels];
    if (!validLevels.includes(level)) { // Si el level no es válido según el perfil, se salta el registro
        return { ok: false, reason: SKIP_REASONS.UNKNOWN_LEVEL };
    }

    const substats = [];
    for (const s of record.substats ?? []) { // Para cada substat del registro, se valida que tenga key y value válidos según el perfil. Si no, se salta el registro.
        if (!s?.key || !profile.stat[s.key] || !Number.isFinite(s.value)) { // Si el substat no tiene key o value válidos según el perfil, se salta el registro
            return { ok: false, reason: SKIP_REASONS.BAD_SUBSTAT, detail: s?.key ?? '' };
        }
        substats.push(new Substat(profile.stat[s.key], s.value));
    }

    let knownFourth = null;
    const pendingKey = record.pending?.key;
    if (pendingKey && profile.stat[pendingKey] && substats.length === 3) { // Si hay un 4to substat pendiente y el artefacto tiene 3 substats, se valida que no colisione con los existentes según el perfil. Si no colisiona, se marca como knownFourth.
        const mainAsSub = profile.mainstatToSubstat.get(profile.mainStat[mainKey]);
        const collides =
            substats.some(s => s.type === profile.stat[pendingKey]) ||
            (mainAsSub !== undefined && mainAsSub === profile.stat[pendingKey]);
        if (!collides) knownFourth = profile.stat[pendingKey]; // Marca el 4to substat como conocido si no colisiona con los existentes
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

export function mapRecords(records, profileId = 'genshin') { // Mapea un array de registros normalizados a artefactos según el perfil activo. Devuelve {mapped: [...], skipped: [...]} con los artefactos válidos y los registros saltados con su razón.
    const mapped = [];
    const skipped = [];

    for (const r of records ?? []) { // Para cada registro, se mapea a un artefacto según el perfil activo. Si es válido, se agrega a mapped; si no, se agrega a skipped con la razón.
        const res = mapRecordToArtifact(r, profileId);
        if (res.ok) { // Si el registro es válido, se agrega a mapped con el artefacto y el 4to substat conocido (si lo hay)
            mapped.push({
                archivo: r.archivo ?? '',
                setName: r.setName ?? '',
                artifact: res.artifact,
                knownFourth: res.knownFourth
            });
        } else { // Si el registro no es válido, se agrega a skipped con la razón y el detalle (si lo hay)
            skipped.push({
                archivo: r?.archivo ?? '(sin nombre)',
                reason: res.reason,
                detail: res.detail ?? ''
            });
        }
    }

    return { mapped, skipped };
}

function yieldToUi() { // Devuelve una promesa que se resuelve en el siguiente ciclo de eventos, para ceder el control a la UI y evitar bloquearla durante el análisis de batch
    return new Promise(resolve => setTimeout(resolve, 0));
}

// Analiza un batch de artefactos mapeados, simulando cada uno según el goal y las opciones dadas. Devuelve un array de resultados ordenados por investRate, considerRate y cvAvg.
export async function analyzeBatch(mappedItems, goal = new BuildGoal([]), options = {}) {
    const { iterations = 10000, chunkSize = 8, onProgress } = options;
    const rows = [];

    for (let i = 0; i < mappedItems.length; i++) { // Para cada artefacto mapeado, se simula según el goal y las opciones dadas, y se agrega el resultado a rows. Se cede el control a la UI cada chunkSize iteraciones para no bloquearla.
        const item = mappedItems[i];
        const result = simulate(item.artifact, goal, item.knownFourth, iterations);
        rows.push(toRow(item, result));

        const isChunkEnd = (i + 1) % chunkSize === 0 || i === mappedItems.length - 1;
        if (isChunkEnd) { // Si se llegó al final de un chunk o al final del array, se llama a onProgress y se cede el control a la UI
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

function toRow(item, result) { // Convierte un artefacto mapeado y su resultado de simulación en un objeto de fila para la tabla de resultados, incluyendo el perfil activo y si el main es fijo o variable según el perfil.
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
