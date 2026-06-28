import java.util.ArrayList;
import java.util.List;

public class Artifact {
    private final PieceType pieceType;   // "Corona", "Flor", etc.
    private final MainStatType  mainStat;
    private       int       level;       // 0, 4, 8, 12, 16, 20
    private final List<Substat> substats; // 3 o 4 elementos

    public Artifact(PieceType pieceType, MainStatType mainStat, int level, List<Substat> substats) {
        if (substats.size() < 3 || substats.size() > 4)
            throw new IllegalArgumentException("Un artefacto debe tener 3 o 4 substats.");
        if (!pieceType.isValidMainStat(mainStat))
            throw new IllegalArgumentException("El main stat " + mainStat + " no es válido para la pieza " + pieceType);

        this.pieceType = pieceType;
        this.mainStat  = mainStat;
        this.level     = level;
        this.substats  = new ArrayList<>(substats);
    }

    public PieceType       getPieceType() { return pieceType; }
    public MainStatType     getMainStat()  { return mainStat; }
    public int          getLevel()     { return level; }
    public List<Substat> getSubstats() { return substats; }
    public int          getSubstatCount() { return substats.size(); }

    public void setLevel(int level)       { this.level = level; }
    public void addSubstat(Substat s)     { substats.add(s); }  // para revelar el 4to en +4
}