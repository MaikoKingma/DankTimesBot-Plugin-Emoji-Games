export class Player {

    public Disqualified: boolean = false;
    public Score: number = 0;
    public ScorePerRound: number[] = [];
    public TieBreakerScore: number = 0;
    public RoundsPlayed: number = 0;
    public ThrowsThisRound: number = 0;
    private status: string[] = [];

    constructor(public id: number, public name: string) { }

    public ScorePoints(points: number, tieBreaker: boolean) {
        this.ThrowsThisRound++;
        this.ScorePerRound[this.RoundsPlayed] = this.ScorePerRound[this.RoundsPlayed] ?this.ScorePerRound[this.RoundsPlayed] + points : 0 + points;
        if (tieBreaker)
            this.TieBreakerScore += points;
        else
            this.Score += points;
    }

    public RoundTransition() {
        this.RoundsPlayed++;
        this.ThrowsThisRound = 0;
    }

    public AddStatus(status: string) {
        this.status.push(status)
    }

    public IsTied(player: Player): boolean {
        return (!this.Disqualified && !player.Disqualified && this.Score === player.Score && this.TieBreakerScore === player.TieBreakerScore);
    }
    
    public ToString(): string {
        let str = `${this.name} ${this.Score}`;
        if (this.TieBreakerScore !== 0)
            str = `${str} - ${this.TieBreakerScore}`
        str = `${str} (+${this.ScorePerRound[this.ScorePerRound.length - 1]})`
        if (this.status.length > 0)
            str += ` - ${this.status.join(", ")}`; 
        this.status = [];
        if (this.Disqualified)
            return `<s>${str}</s>`;
        return str;
    }
}
