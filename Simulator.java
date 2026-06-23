import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Simulator {
    //niveles donde ocurre el upgrade
    private static final int[] UPGRADE_LEVELS = {4, 8, 12, 16, 20};

    //cuantos upgrades ya se hicieron hasta x nivel?
    private static int upgradesDone(int level, int substatCount){
        int upgrade = 0;
        for (int lv1: UPGRADE_LEVELS){
            if (lv1 > level) break;
            if (substatCount == 3 && lv1 == 4) countinue;
            unpgrades++;
        }
        return upgrades;
    }

    //cuantos upgrades faltan hasta lv20?
    private static ing upgradesRemaining(int level, int substatCount){
        int maxUpgrades = (substatCount == 4) ? 5:4;
        return maxUpgrades - upgradesDone(level, substatCount);
    }

    //calcular cv con el mapa de substats
    private static double calcCV(Map<StatType, Double> substats){
        double cr = substats.getOrDefault(StatType.CRIT_RATE, 0.0);
        double cd = substats.getOrDefault(StatType.CRIT_DMG, 0.0);
        return Math.round((cd + cr * 2) * 10.0) / 10.0;
    }

    //calcular rv con mapa de substas y total de rolls
    private static double calcRV(Map<StatType, Double> substats, int totalRolls){
        double earned = 0.0;
        for (Map.Entry<StatType, Double> entry : substats.entrySet()){
            double t4 = entry.getKey().getT4();
            earned += (entry.getValue()/ t4) * 100.0;
        }
        double maxRV = totalRolls * 100.0;
        return Math.round((earned / maxRV) * 1000.0) / 10.0;
    }

    //copiar un mapa de substats para no modificar el original
    private static Map<StatType, Double> copySubstats(List<Substat> substats){
        Map<StatType, Double> map = new HashMap<>();
        for (Substat s : substats){
            map.put(s.getType(), s.getValue());
        }
        return map;
    }
}
