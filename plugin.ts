import TelegramBot from "node-telegram-bot-api";
import { BotCommand } from "../../src/bot-commands/bot-command";
import { Chat } from "../../src/chat/chat";
import { ChatSettingTemplate } from "../../src/chat/settings/chat-setting-template";
import { User } from "../../src/chat/user/user";
import { ChatMessageEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/chat-message-event-arguments";
import { PluginEvent } from "../../src/plugin-host/plugin-events/plugin-event-types";
import { AbstractPlugin } from "../../src/plugin-host/plugin/plugin";
import { Emoji } from "./emoji";
import { EmojiGameCommands } from "./emoji-game-commands";
import { GameResponse } from "./game-response";
import { Game, GameState, GameTemplate } from "./games";

export class Plugin extends AbstractPlugin {

    public static readonly PLUGIN_NAME = "Emoji Games";

    private currentGame?: Game;
    private startingGameOptions = `\nUse /${EmojiGameCommands.JOIN_GAME} to join the game`;
    private availableGames: GameTemplate[] = [
        new GameTemplate("Hoops", Emoji.BasketballEmoji, 9),
        new GameTemplate("Penalties", Emoji.FootballEmoji, 5),
        new GameTemplate("Darts", Emoji.DartEmoji, 5)
    ];
    private waitingForResponse?: number;

    private roundTimeout: NodeJS.Timeout;
    private gameTimeout: NodeJS.Timeout;

    constructor() {
        super(Plugin.PLUGIN_NAME, "1.1.0");

        this.subscribeToPluginEvent(PluginEvent.ChatMessage, (data: ChatMessageEventArguments) => {
            if (this.waitingForResponse && this.waitingForResponse == data.user.id) {
                this.waitingForResponse = undefined;
                if (!data.msg.text)
                    return;
                const gameTemplate = this.selectGameByIndex(data.msg.text);
                if (gameTemplate)
                    data.botReplies = data.botReplies.concat(this.initiateGame(gameTemplate, data.user, data.chat));
            } else if (this.isGameRunning()) {
                this.handleGameResponse(this.currentGame!.HandleMessage(data), data);
            }
        });
    }

    /**
     * @override
     */
    public getPluginSpecificChatSettings(): Array<ChatSettingTemplate<any>> {
        return [];
    }

    /**
     * @override
     */
    public getPluginSpecificCommands(): BotCommand[] {
        const helpCommand = new BotCommand([EmojiGameCommands.INFO], `Prints info about the ${Plugin.PLUGIN_NAME}`, this.info.bind(this));
        const chooseGameCommand = new BotCommand([EmojiGameCommands.CHOOSE_GAME], "", this.chooseGame.bind(this));
        const joinGameCommand = new BotCommand([EmojiGameCommands.JOIN_GAME], "", this.joinGame.bind(this));
        const stopGameCommand = new BotCommand([EmojiGameCommands.CANCEL_GAME], "", this.cancelGameByUser.bind(this));
        const setStakesCommand = new BotCommand([EmojiGameCommands.SET_STAKES], "", this.setStakes.bind(this));
        // const betCommand = new BotCommand(["Bet"], "", this.chooseGame.bind(this)); // TODO
        return [helpCommand, chooseGameCommand, joinGameCommand, stopGameCommand, setStakesCommand];
    }
    
    private info(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        return "A variety of games played with emoji's\n\n"
            + `/${EmojiGameCommands.CHOOSE_GAME} (optional)[GameName|GameEmoji|GameIndex] [Rounds] [Stakes]\n`
            + `/${EmojiGameCommands.JOIN_GAME}\n`
            + `/${EmojiGameCommands.CANCEL_GAME}\n`
            + `/${EmojiGameCommands.SET_STAKES} [Stakes]\n\n`
            + this.availableGames.map((game) => game.GetInfo()).join("\n\n")
            + "\n\nAll games automatically start once the host takes the first shot.\n\n"
            + "Stakes\n\n"
            + "Stakes can be set on any game by the host and awarded to the winner(s) at the end of the game.\n"
            + "Two player game: Winner takes all\n"
            + "Three player game: 1st gets 2/3 of the pot and 2nd gets 1/3\n"
            + "Four or more player game: 1st get 5/10 of the pot, 2nd gets 3/10 of the pot and 3rd gets 2/10 of the pot\n\n"
            + '<a href="https://github.com/MaikoKingma/DankTimesBot-Plugin-Emoji-Games">Codebase</a>';
    }

    private chooseGame(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        if (this.isGameRunning())
            return "You can't start a when one is already in progress, moron...";
        if (msg.text) {
            const mentions: string[] = msg.entities ? msg.entities.filter((entity) => entity.type === "mention").map((entity) => "@" + msg.text!.substring(entity.offset, entity.offset + entity.length)) : [];
            mentions.forEach((mention) => msg.text = msg.text?.replace(mention, ""));
            const chooseGameParams = msg.text!.replace("/" + EmojiGameCommands.CHOOSE_GAME, "").trim().split(" ");
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
                    }
                    if (chooseGameParams[2]) {
                        stakes = parseInt(chooseGameParams[2]);
                        if (!stakes || stakes <= 0 || (stakes % 1 !== 0) || user.score < stakes)
                            return "The stakes must be a valid number and payable with your current score.";
                    }
                    return this.initiateGame(gameTemplate, user, chat, rounds, stakes, mentions);
                }
            }
        }
        
        this.waitingForResponse = user.id;
        return this.availableGames.map((game, index) => `[${index}] ${game.FullName}`).join("\n");
    }

    private setStakes(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        if (!this.isGameRunning())
            return "There is no game to set stakes on.";
        const setStakesParams = msg.text!.replace("/" + EmojiGameCommands.SET_STAKES, "").trim().split(" ");
        const stakes = parseInt(setStakesParams[0]);
        if (!stakes || stakes <= 0 || (stakes % 1 !== 0) || user.score < stakes)
            return "The stakes must be a valid number and payable with your current score.";
        return this.currentGame!.SetStakes(chat, user, stakes);
    }

    private selectGameByIndex(msgText: string): GameTemplate | undefined {
        const gameId = parseInt(msgText);
        if (gameId >= 0 && gameId < this.availableGames.length) {
            return this.availableGames[gameId];
        }
        return undefined;
    }

    private joinGame(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        if (!this.isGameRunning())
            return "There is no game to join.";
        if (this.currentGame!.GameState !== GameState.Initiated)
            return "The current game as already started."
        return this.currentGame!.AddPlayer(user, chat);
    }

    private cancelGameByUser(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        if (!this.isGameRunning())
            return "What do you expect me to cancel, theres nothing going on you fool!";
        if (user.id !== this.currentGame!.HostId)
            return "Only the host can cancel the game.";
        if (this.currentGame!.Stakes > 0 && this.currentGame!.Round > 0)
            return "A game with stakes can't be canceled after the first round.";
        return this.cancelGame(chat)
    }

    private cancelGame(chat: Chat, autoCancel: boolean = false): string {
        let response = autoCancel ? `The game of ${this.currentGame!.FullName} was canceled due to inactivity` : `Canceled the game of ${this.currentGame!.FullName}`;
        if (this.currentGame!.Stakes > 0) {
            this.currentGame!.ReturnStakes(chat);
            response += "\nAll stakes were returned."
        }
        this.resetGame();
        return response;
    }

    private isGameRunning(): boolean {
        return !!this.currentGame;
    }

    private initiateGame(gameTemplate: GameTemplate, user: User, chat: Chat, rounds: number = -1, stakes: number = 0, mentions: string[] = []): string {
        this.resetGameTimeout(chat);
        this.currentGame = gameTemplate.NewGame(rounds, stakes);
        this.currentGame.AddPlayer(user, chat);
        let response = `${user.name} ${mentions.length > 0 ? `challenged ${mentions.join(", ")} to` : "started"} a game of ${this.currentGame.FullName}${this.startingGameOptions}`;
        if (this.currentGame.Stakes > 0) {
            response += `\n\nThey set the stakes to ${stakes}`;
        }
        return response;
    }

    private handleGameResponse(response: GameResponse, data: ChatMessageEventArguments) {
        if (response.ValidInteraction) {
            this.resetGameTimeout(data.chat);
        }
        if (response.Msg) {
            if (response.Delay > 0)
                setTimeout(() => this.sendMessage(data.chat.id, response.Msg, response.IsReply ? data.msg.message_id : undefined), response.Delay * 1000);
            else {
                this.sendMessage(data.chat.id, response.Msg, response.IsReply ? data.msg.message_id : undefined)
            }
        }
        if (this.currentGame!.GameState === GameState.Ended) {
            this.resetGame();
        } else if (response.RoundEnded) {
            clearTimeout(this.roundTimeout);
            this.roundTimeout = setTimeout(() => this.handleGameResponse(this.currentGame!.EndRoundEarly(data.chat), data), 20 * 1000);
        }
    }

    private resetGameTimeout(chat: Chat) {
        clearTimeout(this.gameTimeout);
        this.gameTimeout = setTimeout(() => this.sendMessage(chat.id, this.cancelGame(chat, true)), 60 * 1000);
    }

    private resetGame() {
        clearTimeout(this.roundTimeout);
        clearTimeout(this.gameTimeout);
        this.currentGame = undefined;
    }
}
