import { Dice } from "node-telegram-bot-api";
import { ChatMessageEventArguments } from "../../../../src/plugin-host/plugin-events/event-arguments/chat-message-event-arguments";
import { GameResponse } from "../game-response";
import { RoundBasedGame } from "./round-based-game";

export class BowlingGame extends RoundBasedGame {
    public constructor(name: string, emoji: string[], maxRounds: number, throwsPerRound: number, stakes: number) {
        super(name, emoji, maxRounds, throwsPerRound, stakes);
    }

    public override GetOutcome(dice: Dice): number {
        switch (dice.value) {
            case 1:
                return 0;
            case 2: 
                return 1;
            default:
                return dice.value;
        }
    }

    public override HandleMessage(data: ChatMessageEventArguments): GameResponse {
        const response = super.HandleMessage(data);

        if (response.RoundEnded && this.round === this.maxRounds - 1) {
            this.throwsPerRound++;
        }

        return response;
    }
}
