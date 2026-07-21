export class SimulationResult {
    constructor(
        bestCase, worstCase, avgCase,
        bestCV, worstCV, avgCV,
        bestCVSub, worstCVSub, avgCVSub,
        bestRV, worstRV, avgRV,
        verdict, verdictReason,
        successRate = null, considerRate = null, discardRate = null, iterations = null
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

        // Nuevo: resultado agregado de las N corridas de Montecarlo.
        this.successRate  = successRate;  // % de corridas que dieron INVERTIR
        this.considerRate = considerRate; // % CONSIDERAR
        this.discardRate  = discardRate;  // % DESCARTAR
        this.iterations   = iterations;
    }
}