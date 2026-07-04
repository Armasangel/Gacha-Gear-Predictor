export class BuildGoal{
    constructor(desiredStats){
        this.desiredStats = desiredStats;
    }

    isDesired(stat){
        return this.desiredStats.includes(stat);
    }
}