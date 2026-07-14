import { PieceType } from '../data/PieceType.js';
import { MainStatType } from '../data/MainStatType.js';
import { MAINSTAT_TO_SUBSTAT } from '../data/StatMapping.js';

const VALID_LEVELS = [0, 4, 8, 12, 16, 20];

export class Artifact {
    constructor(pieceType, mainStat, level, substats) {
        if (substats.length < 3 || substats.length > 4)
            throw new Error("Un artefacto debe tener 3 o 4 substats.");
        if (!pieceType.validMainStats.includes(mainStat))
            throw new Error("El main stat no es válido para esta pieza.");
        if (!VALID_LEVELS.includes(level))
            throw new Error(`Nivel inválido: ${level}. Debe ser uno de ${VALID_LEVELS.join(', ')}.`);

        const seen = new Set();
        for (const s of substats) {
            if (seen.has(s.type))
                throw new Error("Un artefacto no puede tener el mismo substat repetido.");
            seen.add(s.type);
        }

        const mainAsSubstat = MAINSTAT_TO_SUBSTAT.get(mainStat);
        if (mainAsSubstat !== undefined && seen.has(mainAsSubstat))
            throw new Error("Un substat no puede coincidir con el mainstat del artefacto.");

        this.pieceType = pieceType;
        this.mainStat  = mainStat;
        this.level     = level;
        this.substats  = [...substats];
    }

    getSubstatCount() { return this.substats.length; }

    addSubstat(substat) {
        if (this.substats.length >= 4)
            throw new Error("Un artefacto no puede tener más de 4 substats.");
        if (this.substats.some(s => s.type === substat.type))
            throw new Error("Un artefacto no puede tener el mismo substat repetido.");
        this.substats.push(substat);
    }
}