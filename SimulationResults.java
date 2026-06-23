import java.util.Map;

public class SimulationResults {
    private final Map<StatType, Double> bestCase;
    private final Map<StatType, Double> worstCase;
    private final Map<StatType, Double> avgCaseM;
    private final double bestCV;
    private final double worstCVM;
    private final double avgCV;
    private final double bestRV;
    private final double worstRV;
    private final double avgRV;
    private final String verdict;
    private final String verdictReason;

    public SimulationResults(
        Map<StatType, Double> bestCase,
        Map<StatType, Double> worstCase,
        Map<StatType, Double> avgCase,
        double bestCV, double worstCV, double avgCV,
        String verdict, String verdictReason
    ){
        this.bestCase = bestCase;
        this.worstCase = worstCase;
        this.avgCase = avgCase;
        this.bestCV = bestCV;
        this.worstCV = worstCV;
        this.avgCV = avgCV;
        this.bestRV = bestRV;
        this.worstRV = worstRV;
        this.avgRV = avgRV;
        this.verdict = verdict;
        this.verdictReason = verdictReason;
    }

    public Map<StatType, Double> getbestCase(){return bestCase;}
    public Map<StatType, Double> getWorstCase(){return worstCase;}
    public Map<StatType, Double getAvgCase(){return avgCase;}
    public double getBestCV(){return bestCV;}
    public double getWorstCV(){return worstCV;}
    public double getAvgCV(){return avgCV;}
    public double getBestRV(){return bestRV;}
    public double getWorstRV(){return worstRV;}
    public double getAvgRV(){return avgRV;}
    public String getVerdict(){return verdict;}
    public String get VertictReason(){return verdictReason;}
}
