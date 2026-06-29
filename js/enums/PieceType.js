export const PieceType = Object.freeze({
    FLOWER: (List.of(MainStatType.HP_FLAT)),
    PLUME: (List.of(MainStatType.ATK_FLAT)),
    SANDS: (List.of(MainStatType.HP_PERCENT, MainStatType.ATK_PERCENT,
            MainStatType.DEF_PERCENT, MainStatType.ENERGY_RECHARGE, MainStatType.ELEMENTAL_MASTERY)),
    GOBLET: (List.of(MainStatType.HP_PERCENT, MainStatType.ATK_PERCENT,
            MainStatType.DEF_PERCENT, MainStatType.ENERGY_RECHARGE, MainStatType.ELEMENTAL_MASTERY,
            MainStatType.PYRO_DMG_BONUS, MainStatType.HYDRO_DMG_BONUS, MainStatType.CRYO_DMG_BONUS,
            MainStatType.ELECTRO_DMG_BONUS, MainStatType.ANEMO_DMG_BONUS, MainStatType.GEO_DMG_BONUS,
            MainStatType.DENDRO_DMG_BONUS, MainStatType.PHYSICAL_DMG_BONUS)),
    CIRCLET: (List.of(MainStatType.HP_PERCENT, MainStatType.ATK_PERCENT, MainStatType.DEF_PERCENT, 
            MainStatType.CRIT_RATE, MainStatType.CRIT_DMG, MainStatType.HEALING_BONUS, MainStatType.ELEMENTAL_MASTERY))
});