import { Dice } from "node-telegram-bot-api";
import { Emoji } from "./emoji";

export class Player {

    public Disqualified: boolean = false;
    public Score: number = 0;
    public TieBreakerScore: number = 0;
    public RoundsPlayed: number = 0;

    constructor(public id: number, public name: string) { }

    public Shoot(dice: Dice, tieBreaker: boolean) {
        this.RoundsPlayed++;
        if (dice.emoji === Emoji.DartEmoji) {
            this.shootDart(dice.value);
            return;
        }
        const minScore = dice.emoji === Emoji.FootballEmoji ? 3 : 4;
        if (dice.value >= minScore)
            tieBreaker ? this.TieBreakerScore++ : this.Score++;
    }

    public IsTied(player: Player): boolean {
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

    private shootDart(value: number) {
        switch (value) {
            case 2:
                this.Score += 3;
                break;
            case 3:
                this.Score += 5;
                break;
            case 4:
                this.Score += 10;
                break;
            case 5:
                this.Score += 15;
                break;
            case 6:
                this.Score += 25;
                break;
        }
    }
}
