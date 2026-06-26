import java.util.List;

public class Main {
    public static void main(String[] args) {

        Artifact artifact = new Artifact(
            PieceType.CIRCLET,
            MainStatType.CRIT_RATE,
            0,
            List.of(
                new Substat(StatType.CRIT_DMG, 7.0),
                new Substat(StatType.ATK_PERCENT, 4.7),
                new Substat(StatType.HP_FLAT, 209.0),
                new Substat(StatType.ENERGY_RECHARGE, 5.2)
            )
        );

        BuildGoal goal = new BuildGoal(List.of(
            StatType.CRIT_RATE,
            StatType.CRIT_DMG,
            StatType.ATK_PERCENT,
            StatType.ENERGY_RECHARGE
        ));

        SimulationResult result = Simulator.simulate(artifact, goal);

        System.out.println("=".repeat(55));
        System.out.println("  " + artifact.getPieceType() + 
                           " | Main: " + artifact.getMainStat() +
                           " | +" + artifact.getLevel());
        System.out.println("=".repeat(55));
        System.out.printf("%-22s %8s %8s %8s%n", "STAT", "MEJOR", "PROM", "PEOR");
        System.out.println("-".repeat(55));

        for (Substat s : artifact.getSubstats()) {
            StatType stat = s.getType();
            System.out.printf("%-22s %8.1f %8.1f %8.1f%n",
                stat,
                result.getBestCase().get(stat),
                result.getAvgCase().get(stat),
                result.getWorstCase().get(stat)
            );
        }

        System.out.println("-".repeat(55));
        System.out.printf("%-22s %8.1f %8.1f %8.1f%n",
            "CV", result.getBestCV(), result.getAvgCV(), result.getWorstCV());
        System.out.printf("%-22s %7.1f%% %7.1f%% %7.1f%%%n",
            "RV%", result.getBestRV(), result.getAvgRV(), result.getWorstRV());
        System.out.println("=".repeat(55));
        System.out.println("VEREDICTO: " + result.getVerdict());
        System.out.println("  " + result.getVerdictReason());
        System.out.println("=".repeat(55));
    }
}