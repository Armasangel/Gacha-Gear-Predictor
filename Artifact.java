public class Artifact{
    private String type;
    private String MainStat;
    private String SubStat1;
    private String SubStat2;
    private String SubStat3;
    private String SubStat4;

    public Artifact(String type, String MainStat, String SubStat1, String SubStat2, String SubStat3, String SubStat4){
        this.type = type;
        this.MainStat = MainStat;
        this.SubStat1 = SubStat1;
        this.SubStat2 = SubStat2;
        this.SubStat3 = SubStat3;
        this.SubStat4 = SubStat4;
    }

    // Getters and Setters
    public String getType() {return type;}
    public String getMainStat() {return MainStat;}
    public String getSubStat1() {return SubStat1;}
    public String getSubStat2() {return SubStat2;}
    public String getSubStat3() {return SubStat3;}
    public String getSubStat4() {return SubStat4;}

    public void setType(String type) {this.type = type;}
    public void setMainStat(String mainStat) {MainStat = mainStat;}
    public void setSubStat1(String subStat1) {SubStat1 = subStat1;}
    public void setSubStat2(String subStat2) {SubStat2 = subStat2;}
    public void setSubStat3(String subStat3) {SubStat3 = subStat3;}
    public void setSubStat4(String subStat4) {SubStat4 = subStat4;}
}