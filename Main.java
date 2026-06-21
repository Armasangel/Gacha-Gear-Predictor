import java.util.List;

public class Main {
    public static void main(String[] args) {
        
        // Artefacto de prueba: Corona con 3 substats
        Artifact artifact = new Artifact(
            PieceType.GOBLET,
            MainStatType.PYRO_DMG_BONUS,
            0,
            List.of(
                new Substat(StatType.CRIT_RATE, 3.5),
                new Substat(StatType.CRIT_DMG, 7.0),
                new Substat(StatType.ATK_PERCENT, 4.7)
            )
        );

        System.out.println("Pieza: " + artifact.getPieceType());
        System.out.println("Main stat: " + artifact.getMainStat());
        System.out.println("Substats: " + artifact.getSubstatCount());
        System.out.println();

        BuildGoal goal = new BuildGoal(List.of(
        StatType.CRIT_RATE,
        StatType.CRIT_DMG,
        StatType.ENERGY_RECHARGE
        ));

        GameRules.predictFourthSubstat(artifact, goal);


    }
}