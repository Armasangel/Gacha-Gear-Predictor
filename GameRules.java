import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.List;
import java.util.ArrayList;
import java.util.Random;

public class GameRules {
    private static final Map<MainStatType, StatType> MAINSTAT_TO_SUBSTAT = Map.of(
        MainStatType.HP_PERCENT, StatType.HP_PERCENT,
        MainStatType.ATK_PERCENT, StatType.ATK_PERCENT,
        MainStatType.DEF_PERCENT, StatType.DEF_PERCENT,
        MainStatType.ENERGY_RECHARGE, StatType.ENERGY_RECHARGE,
        MainStatType.ELEMENTAL_MASTERY, StatType.ELEMENTAL_MASTERY,
        MainStatType.HP_FLAT, StatType.HP_FLAT,
        MainStatType.ATK_FLAT, StatType.ATK_FLAT
    );
    
    public static List<StatType> getAvailablePool(Artifact artifact){
        Set<StatType> excluded = new HashSet<>();
        for (Substat s : artifact.getSubstats()){
            excluded.add(s.getType());
        }

        StatType mainAsSubstat = MAINSTAT_TO_SUBSTAT.get(artifact.getMainStat());
        if (mainAsSubstat != null){
            excluded.add(mainAsSubstat);
        }

        List<StatType> pool = new ArrayList<>();
        for (StatType stat : StatType.values()){
            if (!excluded.contains(stat)){
                pool.add(stat);
            }
        }
        return pool;
    }

    public static StatType rollFourthSubstat(Artifact artifact){
        List<StatType> pool = getAvailablePool(artifact);

        int totalWeight = 0;
        for (StatType stat : pool){
            totalWeight += stat.getWeight();
        }

        int roll = new Random().nextInt(totalWeight);

        int accumulated = 0;
        for (StatType stat : pool){
            accumulated += stat.getWeight();
            if (roll < accumulated){
                return stat;
            }
        }

        throw new IllegalStateException("Error en selección ponderada.");
    }
}
