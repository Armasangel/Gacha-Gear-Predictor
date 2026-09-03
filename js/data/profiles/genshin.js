// Perfil de datos de Genshin Impact (artefactos).
//
// Reutiliza los módulos de datos ya existentes (StatType, MainStatType,
// PieceType, MAINSTAT_TO_SUBSTAT, VERDICT_THRESHOLDS) como fuente única,
// y acopla la configuración del motor propia de Genshin (grilla [4,8,12,16,20],
// 4 tiers de substat).

import { StatType } from '../StatType.js';
import { MainStatType } from '../MainStatType.js';
import { PieceType } from '../PieceType.js';
import { MAINSTAT_TO_SUBSTAT } from '../StatMapping.js';
import { VERDICT_THRESHOLDS } from '../../engine/VerdictThresholds.js';
import { invertKeyMap } from './invert.js';

export function buildGenshinProfile() {
    return Object.freeze({
        id: 'genshin',
        name: 'Genshin Impact',
        upgradeLevels: Object.freeze([4, 8, 12, 16, 20]),
        maxLevel: 20,
        maxTierIndex: 3,
        thresholds: VERDICT_THRESHOLDS,
        stat: StatType,
        mainStat: MainStatType,
        piece: PieceType,
        mainstatToSubstat: MAINSTAT_TO_SUBSTAT,
        statKeyByRef: invertKeyMap(StatType),
        mainStatKeyByRef: invertKeyMap(MainStatType),
        pieceKeyByRef: invertKeyMap(PieceType),
        // Flor y Pluma son mainstat fijo; Reloj/Copa/Corona variable.
        variableMainPieces: Object.freeze(['SANDS', 'GOBLET', 'CIRCLET']),
        pieceOrder: Object.freeze(['FLOWER', 'PLUME', 'SANDS', 'GOBLET', 'CIRCLET']),
    });
}
