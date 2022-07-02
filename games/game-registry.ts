import { Message } from "node-telegram-bot-api";
import { User } from "../../../src/chat/user/user";
import { Emoji } from "./emoji";
import { EmojiGameCommands } from "../emoji-game-commands";
import { GameTemplate } from "./round-based-games/games";

export class GameRegistry {
    private readonly availableGames: GameTemplate[] = [
        new GameTemplate("Hoops", Emoji.BasketballEmoji, 9),
        new GameTemplate("Penalties", Emoji.FootballEmoji, 5),
        new GameTemplate("Darts", Emoji.DartEmoji, 5)
    ];

    private waitingForResponse?: number;

    public GetInfo(): string {
        return this.availableGames.map((game) => game.GetInfo()).join("\n\n");
    }

    public HandleMessage(msg: Message, user: User): GameTemplate | undefined {
        if (msg.text && this.waitingForResponse && this.waitingForResponse == user.id) {
            this.waitingForResponse = undefined;
            return this.selectGameByIndex(msg.text);
        }
    }

    public ChooseGame(msg: Message, user: User): GameTemplate | string {
        if (msg.text) {
            if (msg.text!.startsWith(`/${EmojiGameCommands.CHOOSE_GAME}`)) {
                const chooseGameParams = msg.text!.replace("/" + EmojiGameCommands.CHOOSE_GAME, "").trim().replace(/\s{2,}/, " ").split(" ");
                if (chooseGameParams[0]) {
                    let gameTemplate = this.selectGameByIndex(chooseGameParams[0]);
                    if (!gameTemplate)
                        gameTemplate = this.availableGames.find((game) => game.IdentifyGame(chooseGameParams[0]));
                    if (gameTemplate) {
                        let stakes = 0;
                        let rounds = -1;
                        if (chooseGameParams[1]) {
                            rounds = parseInt(chooseGameParams[1]);
                            if (!rounds || rounds <= 0 || (rounds % 1 !== 0))
                                return "The rounds must be a valid.";
                            if (chooseGameParams[2]) {
                                stakes = parseInt(chooseGameParams[2]);
                                if (!stakes || stakes <= 0 || (stakes % 1 !== 0) || user.score < stakes)
                                    return "The stakes must be a valid number and payable with your current score.";
                                return gameTemplate.Customize(rounds, stakes);
                            } else {
                                return gameTemplate.Customize(rounds);
                            }
                        } else {
                            return gameTemplate;
                        }
                    }
                }
            
                this.waitingForResponse = user.id;
                return this.availableGames.map((game, index) => `[${index}] ${game.FullName}`).join("\n");
            }
        }
        return "";
    }

    private selectGameByIndex(msgText: string): GameTemplate | undefined {
        const gameId = parseInt(msgText);
        if (gameId >= 0 && gameId < this.availableGames.length) {
            return this.availableGames[gameId];
        }
        return undefined;
    }
}
