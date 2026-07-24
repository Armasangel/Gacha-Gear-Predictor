import { PieceType } from '../data/PieceType.js';
import { MainStatType } from '../data/MainStatType.js';
import { MAINSTAT_TO_SUBSTAT } from '../data/StatMapping.js';
import { t } from '../i18n/i18n.js';

const VALID_LEVELS = [0, 4, 8, 12, 16, 20];

export class Artifact {
    constructor(pieceType, mainStat, level, substats) {
        if (substats.length < 3 || substats.length > 4)
            throw new Error (t('error.substatCount'));
        if (!pieceType.validMainStats.includes(mainStat))
            throw new Error(t('error.invalidMain'));
        if (!VALID_LEVELS.includes(level))
            throw new Error('error.invalidLevel', {level, levels: VALID_LEVELS.join(', ')});

        const seen = new Set();
        for (const s of substats) {
            if (seen.has(s.type))
                throw new Error(t('error.duplicatesub'));
            seen.add(s.type);
        }

        const mainAsSubstat = MAINSTAT_TO_SUBSTAT.get(mainStat);
        if (mainAsSubstat !== undefined && seen.has(mainAsSubstat))
            throw new Error(t('error.mainMatchesSub'));

        this.pieceType = pieceType;
        this.mainStat  = mainStat;
        this.level     = level;
        this.substats  = [...substats];
    }

    getSubstatCount() { return this.substats.length; }

    addSubstat(substat) {
        if (this.substats.length >= 4)
            throw new Error(t('error.maxSubstats'));
        if (this.substats.some(s => s.type === substat.type))
            throw new Error("Un artefacto no puede tener el mismo substat repetido.");
        this.substats.push(t('error.duplicateSub'));
    }
}