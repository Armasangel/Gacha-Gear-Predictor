import { StatType } from '../data/StatType.js';
import { MainStatType } from '../data/MainStatType.js';
import { PieceType } from '../data/PieceType.js';

// Construye un lookup inverso O(1) (referencia -> key) para un objeto
// congelado. Única fuente de verdad para el patrón que antes se duplicaba
// como `Object.keys(X).find(k => X[k] === value)` en engine y UI.
export function invertKeyMap(frozenObj) {
    return new Map(
        Object.entries(frozenObj).map(([key, value]) => [value, key])
    );
}

export const STAT_KEY_BY_REF      = invertKeyMap(StatType);
export const MAINSTAT_KEY_BY_REF  = invertKeyMap(MainStatType);
export const PIECE_KEY_BY_REF     = invertKeyMap(PieceType);
