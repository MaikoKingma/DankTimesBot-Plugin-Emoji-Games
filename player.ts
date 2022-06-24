import { Dice } from "node-telegram-bot-api";

export class Player {

    public Score: number = 0;
    public RoundsPlayed = 0;

    constructor(public id: number, public name: string) { }

    public shoot(dice: Dice) {
        const minScore = dice.emoji == "\u26BD" ? 3 : 4;
        if (dice.value >= minScore)
            this.Score++;
        this.RoundsPlayed++;
    }
}
