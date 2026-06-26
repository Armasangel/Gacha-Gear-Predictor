import java.util.List;

public class Main {
    public static void main(String[] args) {

        Artifact artifact = new Artifact(
            PieceType.SANDS,
            MainStatType.ENERGY_RECHARGE,
            0,
            List.of(
                new Substat(StatType.CRIT_RATE, 3.5),
                new Substat(StatType.CRIT_DMG, 7.0),
                new Substat(StatType.ATK_PERCENT,4.7)
                )
        );

        BuildGoal goal = new BuildGoal(List.of(
            StatType.CRIT_RATE,
            StatType.CRIT_DMG,
            StatType.ATK_PERCENT,
            StatType.ENERGY_RECHARGE
        ));

        // Antes de la simulación, detectar si tiene 3 substats
        if (artifact.getSubstatCount() == 3) {
            System.out.println("=".repeat(55));
            System.out.println("  4TO SUBSTAT (aun no revelado)");
            System.out.println("-".repeat(55));
    
            List<StatPrediction> predictions = 
                GameRules.predictFourthSubstat(artifact, goal);
    
            System.out.println("  Probabilidad de obtener algo util: " +
                String.format("%.1f", predictions.stream()
                .filter(p -> goal.isDesired(p.getstat()))
                .mapToDouble(StatPrediction::getProbability)
                .sum()) + "%");
            System.out.println();
            System.out.println("  [WANT]:");
            for (StatPrediction p : predictions) {
                if (goal.isDesired(p.getstat()))
                    System.out.println("    " + p);
            }
            System.out.println("  [SKIP]:");
            for (StatPrediction p : predictions) {
                if (!goal.isDesired(p.getstat()))
                    System.out.println("    " + p);
            }
        }

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
            "CV (substats)",
            result.getBestCVSubstats(),
            result.getAvgCVSubstats(),
            result.getWorstCVSubstats());
        System.out.printf("%-22s %8.1f %8.1f %8.1f%n",
            "CV (con mainstat)",
            result.getBestCV(),
            result.getAvgCV(),
            result.getWorstCV());
        System.out.printf("%-22s %7.1f%% %7.1f%% %7.1f%%%n",
            "RV%",
            result.getBestRV(),
            result.getAvgRV(),
            result.getWorstRV());
        System.out.println("=".repeat(55));
        System.out.println("VEREDICTO: " + result.getVerdict());
        System.out.println("  " + result.getVerdictReason());
        System.out.println("=".repeat(55));

    }  // fin de main
}  // fin de clase