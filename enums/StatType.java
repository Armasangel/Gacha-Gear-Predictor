public enum StatType {
    CRIT_RATE   (new double[]{2.722, 3.111, 3.500, 3.889}, 3),
    CRIT_DMG    (new double[]{5.444, 6.222, 7.000, 7.778}, 3),
    ATK_PERCENT (new double[]{4.083, 4.667, 5.250, 5.833}, 4),
    HP_PERCENT  (new double[]{4.083, 4.667, 5.250, 5.833}, 4),
    DEF_PERCENT (new double[]{5.104, 5.833, 6.562, 7.292}, 4),
    ENERGY_RECHARGE    (new double[]{4.531, 5.179, 5.826, 6.474}, 4),
    ELEMENTAL_MASTERY  (new double[]{16,    19,    21,    23   }, 4),
    HP_FLAT     (new double[]{209,   239,   269,   299  }, 6),
    ATK_FLAT    (new double[]{14,    16,    18,    19   }, 6),
    DEF_FLAT    (new double[]{16,    19,    21,    23   }, 6);

    private final double[] tiers;  // T1, T2, T3, T4
    private final int weight;      // peso de aparición

    StatType(double[] tiers, int weight) {
        this.tiers = tiers;
        this.weight = weight;
    }

    public double getTier(int t) { return tiers[t - 1]; } // t = 1..4
    public double getT4()        { return tiers[3]; }
    public double getExpected()  { return (tiers[0]+tiers[1]+tiers[2]+tiers[3]) / 4.0; }
    public int    getWeight()    { return weight; }
}