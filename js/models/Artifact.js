import { PieceType } from '../data/PieceType.js';
import { MainStatType } from '../data/MainStatType.js';

export class Artifact {
    constructor(pieceType, mainStat, level, substats) {
        if (substats.length < 3 || substats.length > 4)
            throw new Error("Un artefacto debe tener 3 o 4 substats.");
        if (!pieceType.validMainStats.includes(mainStat))
            throw new Error("El main stat no es válido para esta pieza.");

        this.pieceType = pieceType;
        this.mainStat  = mainStat;
        this.level     = level;
        this.substats  = [...substats];
    }

    getSubstatCount() { return this.substats.length; }
    addSubstat(substat) { this.substats.push(substat); }
}