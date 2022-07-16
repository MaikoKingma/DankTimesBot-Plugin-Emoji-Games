import { Dice } from "node-telegram-bot-api";
import { Emoji } from "../emoji";
import { RoundBasedGame } from "./round-based-game";

export class BallGame extends RoundBasedGame {
    public constructor(name: string, emoji: string[], maxRounds: number, stakes: number) {
        super(name, emoji, maxRounds, stakes);
    }

    public override GetOutcome(dice: Dice): number {
        if (dice.emoji === Emoji.FootballEmoji && dice.value >= 3)
            return 2;
        if (dice.emoji === Emoji.BasketballEmoji && dice.value >= 4)
            return 3;
        return 0
    }
}
