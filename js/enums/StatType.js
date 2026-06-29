export const StatType = Object.freeze({
    CRIT_RATE:   { tiers:[2.722, 3.111, 3.500, 3.889], weight: 3},
    CRIT_DMG:    { tiers: [5.444, 6.222, 7.000, 7.778], weight: 3},
    ATK_PERCENT: { tiers: [4.083, 4.667, 5.250, 5.833], weight: 4},
    HP_PERCENT:  { tiers:[4.083, 4.667, 5.250, 5.833], weight: 4},
    DEF_PERCENT: { tiers:[5.104, 5.833, 6.562, 7.292], weight: 4},
    ENERGY_RECHARGE:    { tiers: [4.531, 5.179, 5.826, 6.474], weight: 4},
    ELEMENTAL_MASTERY:  { tiers: [16, 19, 21, 23], weight: 4},
    HP_FLAT:     { tiers: [209, 239, 269, 299], weight: 6},
    ATK_FLAT:    { tiers: [14, 16, 18, 19], weight: 6},
    DEF_FLAT:    { tiers: [16, 19, 21, 23], weight: 6}
});