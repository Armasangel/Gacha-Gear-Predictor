public enum MainStatType {
    HP_FLAT          (4780),      // valor absoluto
    ATK_FLAT         (311),
    HP_PERCENT       (46.6),
    ATK_PERCENT      (46.6),
    DEF_PERCENT      (58.3),
    ENERGY_RECHARGE  (51.8),
    ELEMENTAL_MASTERY(187),
    CRIT_RATE        (31.1),
    CRIT_DMG         (62.2),
    HEALING_BONUS    (35.9),
    PYRO_DMG_BONUS   (46.6),
    HYDRO_DMG_BONUS  (46.6),
    CRYO_DMG_BONUS   (46.6),
    ELECTRO_DMG_BONUS(46.6),
    ANEMO_DMG_BONUS  (46.6),
    GEO_DMG_BONUS    (46.6),
    DENDRO_DMG_BONUS (46.6),
    PHYSICAL_DMG_BONUS(58.3);

    private final double valueAtMax;  // valor al +20 en 5★

    MainStatType(double valueAtMax) {
        this.valueAtMax = valueAtMax;
    }

    public double getValueAtMax() { return valueAtMax; }
}