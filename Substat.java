public class Substat {
    private final StatType type;
    private double value;

    public Substat(StatType type, double value){
        this.type = type;
        this.value = value;
    }

    public StatType getType(){return type;}
    public double getValue(){return value;}
    public void setValue(double value){this.value = value;}
}
