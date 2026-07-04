export class SimulationResult {
    constructor(
        bestCase, worstCase, avgCase,
        bestCV, worstCV, avgCV,
        bestCVSub, worstCVSub, avgCVSub,
        bestRV, worstRV, avgRV,
        verdict, verdictReason
    ){
        this.bestCase = bestCase;
        this.worstCase = worstCase;
        this.avgCase = avgCase;

        this.bestCV = bestCV;
        this.worstCV = worstCV;
        this.avgCV = avgCV;

        this.bestCVSub = bestCVSub;
        this.worstCVSub = worstCVSub;
        this.avgCVSub = avgCVSub;

        this.bestRV = bestRV;
        this.worstRV = worstRV;
        this.avgRV = avgRV;

        this.verdict = verdict;
        this.verdictReason = verdictReason;
    }
}