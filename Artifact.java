import java.util.ArrayList;
import java.util.List;

public class Artifact {
    private final String    pieceType;   // "Corona", "Flor", etc.
    private final StatType  mainStat;
    private       int       level;       // 0, 4, 8, 12, 16, 20
    private final List<Substat> substats; // 3 o 4 elementos

    public Artifact(String pieceType, StatType mainStat, int level, List<Substat> substats) {
        if (substats.size() < 3 || substats.size() > 4)
            throw new IllegalArgumentException("Un artefacto debe tener 3 o 4 substats.");
        if (substats.stream().anyMatch(s -> s.getType() == mainStat))
            throw new IllegalArgumentException("Un substat no puede ser igual al main stat.");

        this.pieceType = pieceType;
        this.mainStat  = mainStat;
        this.level     = level;
        this.substats  = new ArrayList<>(substats);
    }

    public String       getPieceType() { return pieceType; }
    public StatType     getMainStat()  { return mainStat; }
    public int          getLevel()     { return level; }
    public List<Substat> getSubstats() { return substats; }
    public int          getSubstatCount() { return substats.size(); }

    public void setLevel(int level)       { this.level = level; }
    public void addSubstat(Substat s)     { substats.add(s); }  // para revelar el 4to en +4
}