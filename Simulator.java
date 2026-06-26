import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Simulator {

    // Niveles donde ocurre un upgrade o reveal
    private static final int[] UPGRADE_LEVELS = {4, 8, 12, 16, 20};

    // ¿Cuántos upgrades ya se hicieron hasta este nivel?
    private static int upgradesDone(int level, int substatCount) {
        int upgrades = 0;
        for (int lvl : UPGRADE_LEVELS) {
            if (lvl > level) break;
            if (substatCount == 3 && lvl == 4) continue; // +4 solo revela, no sube
            upgrades++;
        }
        return upgrades;
    }

    // ¿Cuántos upgrades faltan hasta +20?
    private static int upgradesRemaining(int level, int substatCount) {
        int maxUpgrades = (substatCount == 4) ? 5 : 4;
        return maxUpgrades - upgradesDone(level, substatCount);
    }

     static double calcCVTotal(Map<StatType, Double> substats, Artifact artifact) {
        double cr = substats.getOrDefault(StatType.CRIT_RATE, 0.0);
        double cd = substats.getOrDefault(StatType.CRIT_DMG, 0.0);
        if (artifact.getMainStat() == MainStatType.CRIT_RATE)
            cr += artifact.getMainStat().getValueAtMax();
        else if (artifact.getMainStat() == MainStatType.CRIT_DMG)
            cd += artifact.getMainStat().getValueAtMax();
        return Math.round((cd + cr * 2) * 10.0) / 10.0;
    }

    // Calcula RV% dado un mapa de substats y el total de rolls
    private static double calcRV(Map<StatType, Double> substats, int totalRolls) {
        double earned = 0.0;
        for (Map.Entry<StatType, Double> entry : substats.entrySet()) {
            double t4 = entry.getKey().getT4();
            earned += (entry.getValue() / t4) * 100.0;
        }
        double maxRV = totalRolls * 100.0;
        return Math.round((earned / maxRV) * 1000.0) / 10.0;
    }

    private static double calcCVSubstats(Map<StatType, Double> substats) {
        double cr = substats.getOrDefault(StatType.CRIT_RATE, 0.0);
        double cd = substats.getOrDefault(StatType.CRIT_DMG, 0.0);
        return Math.round((cd + cr * 2) * 10.0) / 10.0;
    }

    // Copia un mapa de substats para no modificar el original
    private static Map<StatType, Double> copySubstats(List<Substat> substats) {
        Map<StatType, Double> map = new HashMap<>();
        for (Substat s : substats) {
            map.put(s.getType(), s.getValue());
        }
        return map;
    }

    // MEJOR CASO: todos los upgrades caen en el stat más deseado con T4
    private static Map<StatType, Double> simulateBest(
        Artifact artifact,
        BuildGoal goal,
        int upgradesRemaining
    ){
        Map<StatType, Double> result = copySubstats(artifact.getSubstats());

        // Buscar el stat más deseado que esté en el artefacto
        StatType bestTarget = null;
        for (StatType desired : goal.getDesiredStats()) {
            if (result.containsKey(desired)) {
                bestTarget = desired;
                break;
            }
        }

        // Si ningún stat deseado está en el artefacto, usar el primero disponible
        if (bestTarget == null) {
            bestTarget = artifact.getSubstats().get(0).getType();
        }

        // Todos los upgrades caen en ese stat con T4
        for (int i = 0; i < upgradesRemaining; i++) {
            double current = result.get(bestTarget);
            result.put(bestTarget, current + bestTarget.getTier(4));
        }

        // Redondear a 1 decimal
        for (StatType stat : result.keySet()) {
            result.put(stat, Math.round(result.get(stat) * 10.0) / 10.0);
        }

        return result;
    }

    // PEOR CASO: todos los upgrades caen en el stat menos deseado con T1
    private static Map<StatType, Double> simulateWorst(
        Artifact artifact,
        BuildGoal goal,
        int upgradesRemaining
    ) {
        Map<StatType, Double> result = copySubstats(artifact.getSubstats());

        // Buscar el stat menos deseado — el último de la lista de substats
        // que NO esté en los deseados
        StatType worstTarget = null;
        List<Substat> substats = artifact.getSubstats();

        // Recorrer al revés buscando el menos deseado
        for (int i = substats.size() - 1; i >= 0; i--) {
            StatType candidate = substats.get(i).getType();
            if (!goal.getDesiredStats().contains(candidate)) {
                worstTarget = candidate;
                break;
            }
        }

        // Si todos los substats son deseados, usar el último
        if (worstTarget == null) {
            worstTarget = substats.get(substats.size() - 1).getType();
        }

        // Todos los upgrades caen en ese stat con T1
        for (int i = 0; i < upgradesRemaining; i++) {
            double current = result.get(worstTarget);
            result.put(worstTarget, current + worstTarget.getTier(1));
        }

        // Redondear a 1 decimal
        for (StatType stat : result.keySet()) {
            result.put(stat, Math.round(result.get(stat) * 10.0) / 10.0);
        }

        return result;
    }

    // PROMEDIO: upgrades distribuidos equitativamente entre todos los substats
    // con el valor esperado de tier (promedio de T1+T2+T3+T4)
    private static Map<StatType, Double> simulateAvg(
        Artifact artifact,
        int upgradesRemaining
    ) {
        Map<StatType, Double> result = copySubstats(artifact.getSubstats());

        int numStats = result.size();
        double upgradesPerStat = (double) upgradesRemaining / numStats;

        for (StatType stat : result.keySet()) {
            double added = upgradesPerStat * stat.getExpected();
            double current = result.get(stat);
            result.put(stat, Math.round((current + added) * 10.0) / 10.0);
        }

        return result;
    }

    // Veredicto basado en CV promedio o RV si no hay stats de crit
    private static String[] verdict(double avgCV, double avgRV) {
        if (avgCV > 0) {
            if (avgCV >= 50) return new String[]{"INVERTIR",
                "CV promedio de " + avgCV + " es bueno (>=50)."};
            if (avgCV >= 35) return new String[]{"CONSIDERAR",
                "CV promedio de " + avgCV + " es moderado."};
            return new String[]{"DESCARTAR",
                "CV promedio de " + avgCV + " es bajo (<35)."};
        } else {
            if (avgRV >= 85) return new String[]{"INVERTIR",
                "RV promedio de " + avgRV + "% es excelente."};
            if (avgRV >= 70) return new String[]{"CONSIDERAR",
                "RV promedio de " + avgRV + "% es aceptable."};
            return new String[]{"DESCARTAR",
                "RV promedio de " + avgRV + "% es bajo."};
        }
    }

    // MÉTODO PRINCIPAL — une todo
public static SimulationResult simulate(Artifact artifact, BuildGoal goal) {
    int substatCount = artifact.getSubstatCount();
    int level        = artifact.getLevel();
    int done         = upgradesDone(level, substatCount);
    int remaining    = upgradesRemaining(level, substatCount);
    int totalRolls   = substatCount + done + remaining;

    Map<StatType, Double> best  = simulateBest(artifact, goal, remaining);
    Map<StatType, Double> worst = simulateWorst(artifact, goal, remaining);
    Map<StatType, Double> avg   = simulateAvg(artifact, remaining);

    double bestCV  = calcCVTotal(best,  artifact);
    double worstCV = calcCVTotal(worst, artifact);
    double avgCV   = calcCVTotal(avg,   artifact);

    double bestCVSub  = calcCVSubstats(best);
    double worstCVSub = calcCVSubstats(worst);
    double avgCVSub   = calcCVSubstats(avg);

    double bestRV  = calcRV(best,  totalRolls);
    double worstRV = calcRV(worst, totalRolls);
    double avgRV   = calcRV(avg,   totalRolls);

    String[] v = verdict(avgCV, avgRV);

    return new SimulationResult(
        best, worst, avg,
        bestCV,    worstCV,    avgCV,
        bestCVSub, worstCVSub, avgCVSub,
        bestRV,    worstRV,    avgRV,
        v[0], v[1]
    );
}
}