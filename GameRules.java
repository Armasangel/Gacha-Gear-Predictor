import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.List;
import java.util.ArrayList;

public class GameRules {
    public static final Map<MainStatType, StatType> MAINSTAT_TO_SUBSTAT = Map.of(
        MainStatType.HP_PERCENT, StatType.HP_PERCENT,
        MainStatType.ATK_PERCENT, StatType.ATK_PERCENT,
        MainStatType.DEF_PERCENT, StatType.DEF_PERCENT,
        MainStatType.ENERGY_RECHARGE, StatType.ENERGY_RECHARGE,
        MainStatType.ELEMENTAL_MASTERY, StatType.ELEMENTAL_MASTERY,
        MainStatType.HP_FLAT, StatType.HP_FLAT,
        MainStatType.ATK_FLAT, StatType.ATK_FLAT,
        MainStatType.CRIT_DMG, StatType.CRIT_DMG,
        MainStatType.CRIT_RATE, StatType.CRIT_RATE
    );
    
    public static List<StatType> getAvailablePool(Artifact artifact){
        Set<StatType> excluded = new HashSet<>();
        for (Substat s : artifact.getSubstats()){
            excluded.add(s.getType());
        }

        StatType mainAsSubstat = MAINSTAT_TO_SUBSTAT.get(artifact.getMainStat());
        System.out.println("mainAsSubstat: " + mainAsSubstat);
        if (mainAsSubstat != null){
            excluded.add(mainAsSubstat);
                System.out.println("Agregado a excluidos: " + mainAsSubstat);
        }

        List<StatType> pool = new ArrayList<>();
        for (StatType stat : StatType.values()){
            if (!excluded.contains(stat)){
                pool.add(stat);
            }
        }
        System.out.println("Pool real dentro del método: " + pool);
        return pool;
    }

    public static List<StatPrediction> predictFourthSubstat(Artifact artifact, BuildGoal goal) {
    List<StatType> pool = getAvailablePool(artifact);

        int totalWeight = 0;
        for (StatType stat : pool) {
            totalWeight += stat.getWeight();
        }

        List<StatPrediction> desired   = new ArrayList<>();
        List<StatPrediction> undesired = new ArrayList<>();

        for (StatType stat : pool) {
            double prob = stat.getWeight() * 100.0 / totalWeight;
            StatPrediction prediction = new StatPrediction(stat, prob);
            if (goal.isDesired(stat)) {
                desired.add(prediction);
            } else {
                undesired.add(prediction);
            }
        }

        // Ordenar cada grupo por probabilidad descendente
        desired.sort((a, b) -> Double.compare(b.getProbability(), a.getProbability()));
        undesired.sort((a, b) -> Double.compare(b.getProbability(), a.getProbability()));

        // Probabilidad acumulada de obtener AL MENOS UN stat deseado
        double chanceOfGood = desired.stream()
            .mapToDouble(StatPrediction::getProbability)
            .sum();

        System.out.println("Probabilidad de obtener algo útil: " + 
            String.format("%.1f", chanceOfGood) + "%");
        System.out.println("Probabilidad de obtener basura:    " + 
            String.format("%.1f", 100 - chanceOfGood) + "%");
        System.out.println();
        System.out.println("Stats deseados:");
            for (StatPrediction p : desired)   System.out.println("  ⭐ " + p);
        System.out.println("Stats no deseados:");
            for (StatPrediction p : undesired) System.out.println("  💀 " + p);

        // Devolver primero los deseados, luego los no deseados
        List<StatPrediction> result = new ArrayList<>(desired);
        result.addAll(undesired);
        return result;

    }
}
