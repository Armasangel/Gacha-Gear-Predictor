export class StatPrediction {
    constructor (stat, probability){
        this.stat = stat;
        this.probability = probability;
    }

    toString(){
        return `${this.stat}: ${this.probability.toFixed(1)}%`;
    }
}