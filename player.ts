import { Dice } from "node-telegram-bot-api";

export class Player {

    public Disqualified: boolean = false;
    public Score: number = 0;
    public TieBreakerScore: number = 0;
    public RoundsPlayed: number = 0;

    constructor(public id: number, public name: string) { }

    public shoot(dice: Dice, tieBreaker: boolean) {
        const minScore = dice.emoji == "\u26BD" ? 3 : 4;
        if (dice.value >= minScore)
            tieBreaker ? this.TieBreakerScore++ : this.Score++;
        this.RoundsPlayed++;
    }

    public isTied(player: Player): boolean {
        return (!this.Disqualified && !player.Disqualified && this.Score === player.Score && this.TieBreakerScore == player.TieBreakerScore);
    }
    
    public ToString(): string {
        let str = `${this.name} ${this.Score}`;
        if (this.TieBreakerScore !== 0)
            str = `${str} (+${this.TieBreakerScore})`
        if (this.Disqualified)
            str = `<s>${str}</s>`;
        return str;
    }
}
