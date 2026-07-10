import { StatType } from './StatType.js';
import { MainStatType } from './MainStatType.js';

// Algunos MainStat tienen un StatType equivalente (p.ej. mainstat CRIT_RATE
// en Corona == substat CRIT_RATE). El juego nunca permite que un substat
// duplique al mainstat, así que este mapeo es dato puro, no lógica de motor,
// y lo usan tanto GameRules (para el pool de predicción) como Artifact
// (para validar que no se ingrese un caso imposible).
export const MAINSTAT_TO_SUBSTAT = new Map([
    [MainStatType.HP_PERCENT,        StatType.HP_PERCENT],
    [MainStatType.ATK_PERCENT,       StatType.ATK_PERCENT],
    [MainStatType.DEF_PERCENT,       StatType.DEF_PERCENT],
    [MainStatType.ENERGY_RECHARGE,   StatType.ENERGY_RECHARGE],
    [MainStatType.ELEMENTAL_MASTERY, StatType.ELEMENTAL_MASTERY],
    [MainStatType.HP_FLAT,           StatType.HP_FLAT],
    [MainStatType.ATK_FLAT,          StatType.ATK_FLAT],
    [MainStatType.CRIT_RATE,         StatType.CRIT_RATE],
    [MainStatType.CRIT_DMG,          StatType.CRIT_DMG],
]);