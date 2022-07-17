import { Chat } from "../../../../../src/chat/chat";
import { Settings } from "../../../settings";
import { Emoji } from "../../emoji";
import { DartsGame } from "../darts-game";
import { GameTemplate } from "./game-template";

export class DartsGameTemplate extends GameTemplate {

    public constructor(rounds: number = 5, stakes: number = 0) {
        super("Darts", [ Emoji.DartEmoji ], rounds, stakes);
    }

    public Customize(rounds: number, stakes: number = 0): DartsGameTemplate {
        return new DartsGameTemplate(rounds, stakes);
    }

    public NewGame(): DartsGame {
        return new DartsGame(this.name, this.emoji, this.maxRounds, this.stakes);
    }

    public IsEnabled(chat: Chat): boolean {
        return chat.getSetting(Settings.DARTS_GAME_ENABLED);
    }

    public override GetInfo(): string {
        return super.GetInfo() + `\nBullseye: 25 points\n1st circle: 15 points\n2nd circle: 10 points\n3rd circle: 5 points\n4th circle: 3 points`;
    }
}