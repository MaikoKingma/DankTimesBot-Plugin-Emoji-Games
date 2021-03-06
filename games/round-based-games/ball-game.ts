import { Dice } from "node-telegram-bot-api";
import { Emoji } from "../emoji";
import { Player } from "./player";
import { RoundBasedGame } from "./round-based-game";

export class BallGame extends RoundBasedGame {
    public constructor(name: string, emoji: string[], maxRounds: number, throwsPerRound: number, stakes: number) {
        super(name, emoji, maxRounds, throwsPerRound, stakes);
    }

    public override GetOutcome(dice: Dice, player: Player): number {
        if (dice.emoji === Emoji.FootballEmoji && dice.value >= 3)
            return 2;
        if (dice.emoji === Emoji.BasketballEmoji && dice.value >= 4)
            return 3;
        return 0
    }
}
