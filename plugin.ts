import TelegramBot from "node-telegram-bot-api";
import { BotCommand } from "../../src/bot-commands/bot-command";
import { Chat } from "../../src/chat/chat";
import { ChatSettingTemplate } from "../../src/chat/settings/chat-setting-template";
import { User } from "../../src/chat/user/user";
import { ChatMessageEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/chat-message-event-arguments";
import { PluginEvent } from "../../src/plugin-host/plugin-events/plugin-event-types";
import { AbstractPlugin } from "../../src/plugin-host/plugin/plugin";
import { Game, GameTemplate } from "./Games";

/**
 * Example of the simplest DankTimesBot
 * plugin. Can be used as a template to
 * build new plugins.
 */
export class Plugin extends AbstractPlugin {

    private static readonly INFO_CMD = "emojigames";
    private static readonly CHOOSE_GAME_CMD = "choosegame";
    private static readonly JOIN_GAME_CMD = "join";
    private static readonly CANCEL_GAME_CMD = "cancel";

    private currentGame?: Game;
    private startingGameOptions = "\nUse /Join to join the game";
    private availableGames: GameTemplate[] = [
        new GameTemplate("Hoops", "🏀", 9),
        new GameTemplate("Penalties", "\u26BD", 5)
    ];
    private waitingForResponse?: number;

    constructor() {
        super("Emoji Games", "1.1.0");

        this.subscribeToPluginEvent(PluginEvent.ChatMessage, (data: ChatMessageEventArguments) => {

            if (this.waitingForResponse && this.waitingForResponse == data.user.id) {
                this.waitingForResponse = undefined;
                if (!data.msg.text)
                    return;
                const gameId = parseInt(data.msg.text);
                if (gameId >= 0 && gameId < this.availableGames.length) {
                    data.botReplies = data.botReplies.concat(this.initiateGame(this.availableGames[gameId], data.user))
                }
            } else if (this.isGameRunning()) {
                data.botReplies = data.botReplies.concat(this.currentGame!.HandleMessage(data.msg, data.user));
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
        const helpCommand = new BotCommand([Plugin.INFO_CMD], "", this.info.bind(this));
        const chooseGameCommand = new BotCommand([Plugin.CHOOSE_GAME_CMD], "", this.chooseGame.bind(this));
        const joinGameCommand = new BotCommand([Plugin.JOIN_GAME_CMD], "", this.joinGame.bind(this));
        const stopGameCommand = new BotCommand([Plugin.CANCEL_GAME_CMD], "", this.cancelGame.bind(this))
        // const betCommand = new BotCommand(["Bet"], "", this.chooseGame.bind(this)); // TODO
        return [helpCommand, chooseGameCommand, joinGameCommand, stopGameCommand];
    }
    
    private info(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        return "A variety of games played with emoji's\n\n"
            + `/${Plugin.CHOOSE_GAME_CMD} [(optional)GameName|GameEmoji]\n`
            + `/${Plugin.JOIN_GAME_CMD}\n`
            + `/${Plugin.CANCEL_GAME_CMD}\n\n`
            + this.availableGames.map((game) => game.GetInfo()).join("\n\n");
    }

    private chooseGame(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        if (this.isGameRunning())
            return "";
        if (msg.text) {
            var game = this.availableGames.find((game) => game.IdentifyGame(msg.text!));
            if (game) {
                return this.initiateGame(game, user);
            }
        }
        
        this.waitingForResponse = user.id;
        return this.availableGames.map((game, index) => `[${index}] ${game.FullName}`).join("\n");
    }

    private joinGame(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        if (!this.isGameRunning())
            return "There is no game to join.";
        return this.currentGame!.AddPlayer(user);
    }

    private cancelGame(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        if (!this.isGameRunning())
            return "";
        const response = `Canceled the game of ${this.currentGame!.FullName}`;
        this.currentGame = undefined;
        return response;
    }

    private isGameRunning(): boolean {
        return !!this.currentGame;
    }

    private initiateGame(gameTemplate: GameTemplate, user: User): string {
        this.currentGame = gameTemplate.NewGame();
        this.currentGame.AddPlayer(user)
        return `${user.name} started a game of ${this.currentGame.FullName}${this.startingGameOptions}`;
    }
}
