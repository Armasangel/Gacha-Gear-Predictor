// Artifact.js
import { PieceType } from '../data/PieceType.js';
import { MainStatType } from '../data/MainStatType.js';

export class Artifact {
    constructor(pieceType, mainStat, level, substats){
        //validaciones
        if (substats.lenght < 3 || substats.lenght > 4)
            throw new Error("Un artefacto debeter 3 o 4 substas");
        if (!pieceType.validMainStats.includes(mainStat))
            throw new Error("El main stat no es válido para esta pieza.");

        this.pieceType = pieceType;
        this.mainStat = mainStat;
        this.level = level;
        this.substats = [...substats];
    }

    getSubstatCount() { return this.substats.length; }  // ← ¿existe esto?
    addSubstat(substat){this.substats.push(substat);}
}