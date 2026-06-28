public class StatPrediction {
    private final StatType stat;
    private final double probability; // 0.0 a 100.0

    public StatPrediction(StatType stat, double probability) {
        this.stat = stat;
        this.probability = probability;
    }

    public StatType getstat() { return stat; }
    public double getProbability() { return probability; }

    @Override
    public String toString() {
        return stat + ": " + String.format("%.1f", probability) + "%";
    }
}