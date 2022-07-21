import { Chat } from "../../../../../src/chat/chat";
import { Settings } from "../../../settings";
import { Emoji } from "../../emoji";
import { BowlingGame } from "../bowling-game";
import { GameTemplate } from "./game-template";

export class BowlingGameTemplate extends GameTemplate {

    public IsEnabled(chat: Chat): boolean {
        return chat.getSetting(Settings.BOWLING_ENABLED);
    }

    public constructor(rounds: number = 3, throwsPerRound: number = 2, stakes: number = 0) {
        super("Bowling", [ Emoji.BowlingEmoji ], rounds, throwsPerRound, stakes);
    }

    public Customize(rounds: number, stakes: number = 0): BowlingGameTemplate {
        return new BowlingGameTemplate(rounds, this.throwsPerRound, stakes);
    }

    public NewGame(): BowlingGame {
        return new BowlingGame(this.name, this.emoji, this.maxRounds, this.throwsPerRound, this.stakes);
    }

    public override GetInfo(): string {
        return super.GetInfo() + `\n Scoring: WIP`;
    }
}
