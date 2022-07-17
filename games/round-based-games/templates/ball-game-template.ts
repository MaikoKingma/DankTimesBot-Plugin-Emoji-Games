import { Chat } from "../../../../../src/chat/chat";
import { Settings } from "../../../settings";
import { Emoji } from "../../emoji";
import { BallGame } from "../ball-game";
import { GameTemplate } from "./game-template";

export class BallGameTemplate extends GameTemplate {

    public constructor(rounds: number = 5, stakes: number = 0) {
        super("BallGame", [ Emoji.FootballEmoji, Emoji.BasketballEmoji ], rounds, stakes);
    }

    public Customize(rounds: number, stakes: number = 0): BallGameTemplate {
        return new BallGameTemplate(rounds, stakes);
    }

    public NewGame(): BallGame {
        return new BallGame(this.name, this.emoji, this.maxRounds, this.stakes);
    }

    public IsEnabled(chat: Chat): boolean {
        return chat.getSetting(Settings.BALL_GAME_ENABLED);
    }

    public override GetInfo(): string {
        return super.GetInfo() + `\n${Emoji.FootballEmoji} = 2 points (Chance 60%)\n${Emoji.BasketballEmoji} = 3 points (Chance 40%)`;
    }
}