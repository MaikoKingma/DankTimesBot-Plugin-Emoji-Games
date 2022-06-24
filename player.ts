export class Player {

    public Score: number = 0;
    public RoundsPlayed = 0;

    constructor(public id: number, public name: string) { }

    public shoot(score: number) {
        if (score >= 4)
            this.Score++;
        this.RoundsPlayed++;
    }
}
