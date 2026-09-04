export class BuildGoal{
    constructor(desiredStats){
        this.desiredStats = desiredStats;
    }

    isDesired(stat){ // Devuelve true si el stat es uno de los deseados, false en caso contrarios
        return this.desiredStats.includes(stat);
    }
}