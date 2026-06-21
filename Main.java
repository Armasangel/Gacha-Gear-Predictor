import java.util.List;

public class Main {
    public static void main(String[] args) {
        
        // Artefacto de prueba: Corona con 3 substats
        Artifact artifact = new Artifact(
            PieceType.CIRCLET,
            MainStatType.CRIT_RATE,
            0,
            List.of(
                new Substat(StatType.CRIT_DMG, 7.0),
                new Substat(StatType.ATK_PERCENT, 4.7),
                new Substat(StatType.HP_FLAT, 209.0)
            )
        );

        System.out.println("Pieza: " + artifact.getPieceType());
        System.out.println("Main stat: " + artifact.getMainStat());
        System.out.println("Substats: " + artifact.getSubstatCount());
        System.out.println();

        // Predecir el 4to substat
        List<StatPrediction> predictions = GameRules.predictFourthSubstat(artifact);
        System.out.println("Top 3 posibles 4tos substats:");
        for (StatPrediction p : predictions) {
            System.out.println("  " + p);
        }
    }
}