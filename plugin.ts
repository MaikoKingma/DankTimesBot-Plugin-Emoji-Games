import TelegramBot from "node-telegram-bot-api";
import { BotCommand } from "../../src/bot-commands/bot-command";
import { Chat } from "../../src/chat/chat";
import { ChatSettingTemplate } from "../../src/chat/settings/chat-setting-template";
import { User } from "../../src/chat/user/user";
import { ChatMessageEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/chat-message-event-arguments";
import { PluginEvent } from "../../src/plugin-host/plugin-events/plugin-event-types";
import { AbstractPlugin } from "../../src/plugin-host/plugin/plugin";
import { Game, GameState, GameTemplate } from "./Games";

export class Plugin extends AbstractPlugin {

    private static readonly INFO_CMD = "emojigames";
    private static readonly CHOOSE_GAME_CMD = "choosegame";
    private static readonly JOIN_GAME_CMD = "join";
    private static readonly CANCEL_GAME_CMD = "cancel";
    private static readonly SET_STAKES_CMD = "setstakes";

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
                const gameTemplate = this.selectGameByIndex(data.msg.text);
                if (gameTemplate)
                    data.botReplies = data.botReplies.concat(this.initiateGame(gameTemplate, data.user, data.chat, 0));
            } else if (this.isGameRunning()) {
                const response = this.currentGame!.HandleMessage(data);
                if (response.delay > 0)
                    setTimeout(() => this.sendMessage(data.chat.id, response.msg), response.delay * 1000);
                else 
                    data.botReplies = data.botReplies.concat(response.msg);
                if (this.currentGame!.GameState === GameState.Ended) {
                    this.currentGame = undefined;
                }
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
        const setStakesCommand = new BotCommand([Plugin.SET_STAKES_CMD], "", this.setStakes.bind(this))
        // const betCommand = new BotCommand(["Bet"], "", this.chooseGame.bind(this)); // TODO
        return [helpCommand, chooseGameCommand, joinGameCommand, stopGameCommand, setStakesCommand];
    }
    
    private info(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        return "A variety of games played with emoji's\n\n"
            + `/${Plugin.CHOOSE_GAME_CMD} (optional)[GameName|GameEmoji|GameIndex] [Stakes]\n`
            + `/${Plugin.JOIN_GAME_CMD}\n`
            + `/${Plugin.CANCEL_GAME_CMD}\n`
            + `/${Plugin.SET_STAKES_CMD} [Stakes]\n\n`
            + this.availableGames.map((game) => game.GetInfo()).join("\n\n")
            + "\n\nStakes\n\n"
            + "Stakes can be set on any game by the host and awarded to the winner(s) at the end of the game.\n"
            + "Two player game: Winner takes all\n"
            + "Three player game: 1st gets 2/3 of the pot and 2nd gets 1/3\n"
            + "Four or more player game: 1st get 5/10 of the pot, 2nd gets 3/10 of the pot and 3rd gets 2/10 of the pot\n";
    }

    private chooseGame(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        if (this.isGameRunning())
            return "You can't start a when one is already in progress, moron...";
        if (msg.text) {
            const chooseGameParams = msg.text!.replace("/" + Plugin.CHOOSE_GAME_CMD, "").trim().split(" ");
            if (chooseGameParams[0]) {
                let gameTemplate = this.selectGameByIndex(chooseGameParams[0]);
                if (!gameTemplate)
                    gameTemplate = this.availableGames.find((game) => game.IdentifyGame(chooseGameParams[0]));
                if (gameTemplate) {
                    let stakes = 0;
                    if (chooseGameParams[1]) {
                        stakes = parseInt(chooseGameParams[1]);
                        if (stakes <= 0 || user.score < stakes)
                            return "The stakes must be a valid number and payable with your current score.";
                    }
                    return this.initiateGame(gameTemplate, user, chat, stakes);
                }
            }
        }
        
        this.waitingForResponse = user.id;
        return this.availableGames.map((game, index) => `[${index}] ${game.FullName}`).join("\n");
    }

    private setStakes(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        if (!this.isGameRunning())
            return "There is no game to set stakes on.";
        const setStakesParams = msg.text!.replace("/" + Plugin.SET_STAKES_CMD, "").trim().split(" ");
        const stakes = parseInt(setStakesParams[0]);
        if (stakes <= 0 && user.score < stakes)
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

    private cancelGame(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        if (!this.isGameRunning())
            return "What do you expect me to cancel, theres nothing going on you fool!";
        if (user.id !== this.currentGame!.HostId)
            return "Only the host can cancel the game.";
        let response = `Canceled the game of ${this.currentGame!.FullName}`;
        if (this.currentGame!.Stakes > 0) {
            this.currentGame!.ReturnStakes(chat);
            response += "\nAll stakes were returned."
        }
        this.currentGame = undefined;
        return response;
    }

    private isGameRunning(): boolean {
        return !!this.currentGame;
    }

    private initiateGame(gameTemplate: GameTemplate, user: User, chat: Chat, stakes: number): string {
        this.currentGame = gameTemplate.NewGame(stakes);
        this.currentGame.AddPlayer(user, chat);
        let response = `${user.name} started a game of ${this.currentGame.FullName}${this.startingGameOptions}`;
        if (this.currentGame.Stakes > 0) {
            response += `\n\nThey set the stakes to ${stakes}`;
        }
        return response;
    }
}
