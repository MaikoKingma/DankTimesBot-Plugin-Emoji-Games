import { Dice } from "node-telegram-bot-api";

export class Player {

    public Disqualified: boolean = false;
    public Score: number = 0;
    public RoundsPlayed: number = 0;

    constructor(public id: number, public name: string) { }

    public shoot(dice: Dice) {
        const minScore = dice.emoji == "\u26BD" ? 3 : 4;
        if (dice.value >= minScore)
            this.Score++;
        this.RoundsPlayed++;
    }
}
