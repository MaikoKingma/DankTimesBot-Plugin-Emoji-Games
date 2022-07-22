import { Dice } from "node-telegram-bot-api";
import { ChatMessageEventArguments } from "../../../../src/plugin-host/plugin-events/event-arguments/chat-message-event-arguments";
import { GameResponse } from "../game-response";
import { Player } from "./player";
import { RoundBasedGame } from "./round-based-game";

export class BowlingGame extends RoundBasedGame {

    public constructor(name: string, emoji: string[], maxRounds: number, throwsPerRound: number, stakes: number) {
        super(name, emoji, maxRounds, throwsPerRound, stakes);
    }

    public override GetOutcome(dice: Dice, player: Player): number {
        let outcome;
        switch (dice.value) {
            case 1:
                outcome = 0;
                break;
            case 2: 
                outcome = 1;
                break;
            default:
                outcome = dice.value;
                break;
        }
        
        const lastRoundsPoints = player!.ScorePerRound[player!.RoundsPlayed - 1];
        if (this.throwsPerRound === 3 || lastRoundsPoints === 12 || (player!.ThrowsThisRound == 1 && lastRoundsPoints >= 8)) {
            outcome = outcome * 2;
        }
        return outcome;
    }

    public override HandleMessage(data: ChatMessageEventArguments): GameResponse {
        const response = super.HandleMessage(data);

        if (response.RoundEnded && this.round === this.maxRounds - 1) {
            this.throwsPerRound++;
        }

        return response;
    }
}
