import java.util.List;

public class BuildGoal {
    private final List<StatType> desiredStats;  // lo que el jugador quiere

    public BuildGoal(List<StatType> desiredStats) {
        this.desiredStats = desiredStats;
    }

    public List<StatType> getDesiredStats() { return desiredStats; }

    public boolean isDesired(StatType stat) {
        return desiredStats.contains(stat);
    }
}