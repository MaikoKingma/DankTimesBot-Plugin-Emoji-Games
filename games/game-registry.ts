import { Message } from "node-telegram-bot-api";
import { User } from "../../../src/chat/user/user";
import { EmojiGameCommands } from "../emoji-game-commands";
import { Chat } from "../../../src/chat/chat";
import { GameTemplate } from "./round-based-games/templates/game-template";
import { DartsGameTemplate } from "./round-based-games/templates/darts-game-template";
import { BallGameTemplate } from "./round-based-games/templates/ball-game-template";

export class GameRegistry {
    private readonly availableGames: GameTemplate[] = [
        new BallGameTemplate(),
        new DartsGameTemplate()
    ];

    private waitingForResponse?: number;

    public GetInfo(chat: Chat, user: User, msg: Message, match: string): string {
        const game = msg.text?.startsWith(`/${EmojiGameCommands.BALL_GAME_INFO}`) ? this.availableGames[0] : this.availableGames[1];
        return  game.GetInfo()
            + "\n\nThe game automatically start once the host takes the first shot.\n\n"
            + "<b>Stakes</b>\n\n"
            + "Stakes can be set on any game by the host and awarded to the winner(s) at the end of the game.\n"
            + "2 players: Winner takes all\n"
            + "3 players: 1st gets 2/3 of the pot and 2nd gets 1/3\n"
            + "4+ players: 1st get 5/10 of the pot, 2nd gets 3/10 of the pot and 3rd gets 2/10 of the pot\n\n";
    }

    public HandleMessage(chat: Chat, msg: Message, user: User): GameTemplate | string {
        if (msg.text && this.waitingForResponse && this.waitingForResponse == user.id) {
            this.waitingForResponse = undefined;
            const gameTemplate = this.selectGameByIndex(msg.text);
            if (gameTemplate) {
                if (!gameTemplate.IsEnabled(chat))
                    return "This game is currently disabled"
                return gameTemplate;
            }
        }
        return "";
    }

    public ChooseGame(chat: Chat, msg: Message, user: User): GameTemplate | string {
        if (msg.text) {
            if (msg.text!.startsWith(`/${EmojiGameCommands.CHOOSE_GAME}`)) {
                const chooseGameParams = msg.text!.replace("/" + EmojiGameCommands.CHOOSE_GAME, "").trim().replace(/\s{2,}/, " ").split(" ");
                if (chooseGameParams[0]) {
                    let gameTemplate = this.selectGameByIndex(chooseGameParams[0]);
                    if (!gameTemplate)
                        gameTemplate = this.availableGames.find((game) => game.IdentifyGame(chooseGameParams[0]));
                    if (gameTemplate) {
                        if (!gameTemplate.IsEnabled(chat))
                            return "This game is currently disabled"
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
