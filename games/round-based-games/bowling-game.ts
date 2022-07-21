import { Dice } from "node-telegram-bot-api";
import { RoundBasedGame } from "./round-based-game";

export class BowlingGame extends RoundBasedGame {
    public constructor(name: string, emoji: string[], maxRounds: number, throwsPerRound: number, stakes: number) {
        super(name, emoji, maxRounds, throwsPerRound, stakes);
    }

    public override GetOutcome(dice: Dice): number {
        return dice.value === 1 ? 0 : dice.value;
    }
}
