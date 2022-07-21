import { Dice } from "node-telegram-bot-api";
import { RoundBasedGame } from "./round-based-game";

export class DartsGame extends RoundBasedGame {
    public constructor(name: string, emoji: string[], maxRounds: number, throwsPerRound: number, stakes: number) {
        super(name, emoji, maxRounds, throwsPerRound, stakes);
    }

    public override GetOutcome(dice: Dice): number {
        switch (dice.value) {
            case 2:
                return 3;
            case 3:
                return 5;
            case 4:
                return 10;
            case 5:
                return 15;
            case 6:
                return 25;
            default:
                return 0;
        }
    }
}
