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
import { GameRegistry } from "./games/game-registry";
import { GameResponse } from "./games/game-response";
import { Game, GameState, GameTemplate } from "./games/round-based-games/games";
import { SlotMachineGame } from "./games/slot-machine/slot-machine-game";

export class Plugin extends AbstractPlugin {

    public static readonly PLUGIN_NAME = "Emoji Games";

    private readonly gameRegistry: GameRegistry = new GameRegistry();
    private readonly slotMachine: SlotMachineGame = new SlotMachineGame();

    private currentGame?: Game;
    private readonly startingGameOptions = `\nUse /${EmojiGameCommands.SET_STAKES} to set the stakes or /${EmojiGameCommands.JOIN_GAME} to join the game`;

    private roundTimeout: NodeJS.Timeout;
    private gameTimeout: NodeJS.Timeout;

    constructor() {
        super(Plugin.PLUGIN_NAME, "1.1.0");

        this.subscribeToPluginEvent(PluginEvent.ChatMessage, this.OnChatMessage.bind(this));
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
        const slotMachineInfoCommand = new BotCommand([EmojiGameCommands.SLOT_MACHINE_STATS], "Prints info about the Slot Machine game", this.slotMachine.GetStats.bind(this.slotMachine))
        const setBetCommand = new BotCommand([EmojiGameCommands.SET_SLOT_MACHINE_BET], "", ((chat: Chat, user: User, msg: TelegramBot.Message, match: string): string => {
            this.sendMessage(chat.id, this.slotMachine.SetBet(user, msg), msg.message_id, false);
            return "";
        }).bind(this.slotMachine));
        // const betCommand = new BotCommand(["Bet"], "", this.chooseGame.bind(this)); // TODO
        // const rematchCommand = new BotCommand(["rematch"], "", this.chooseGame.bind(this)); // TODO
        return [helpCommand, chooseGameCommand, joinGameCommand, stopGameCommand, setStakesCommand, slotMachineInfoCommand, setBetCommand];
    }

    private OnChatMessage(data: ChatMessageEventArguments) {
        if (data.msg.forward_from) {
            return;
        }
        // if (data.msg.dice) {
        //     this.sendDice(data.chat.id, data.msg.dice.emoji);
        // }
        if (data.msg.dice && data.msg.dice.emoji === Emoji.SlotMachineEmoji) {
            this.handleGameResponse(this.slotMachine.pullLever(data.msg.dice.value, data.chat, data.user), data);
        } else if (this.isGameRunning()) {
            this.handleGameResponse(this.currentGame!.HandleMessage(data), data);
        } else {
            const chooseGameResponse = this.gameRegistry.HandleMessage(data.msg, data.user);
            if (chooseGameResponse) {
                if (chooseGameResponse instanceof GameTemplate) {
                    data.botReplies = data.botReplies.concat(this.initiateGame(chooseGameResponse, data.user, data.chat));
                }
                else
                    data.botReplies = data.botReplies.concat(chooseGameResponse);
            }
        }
    }
    
    private info(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        const message = "<b>A variety of games played with emoji's</b>\n\n"
            + `/${EmojiGameCommands.CHOOSE_GAME} (optional)[GameName|GameEmoji|GameIndex] [Rounds] [Stakes]\n`
            + `/${EmojiGameCommands.JOIN_GAME}\n`
            + `/${EmojiGameCommands.CANCEL_GAME}\n`
            + `/${EmojiGameCommands.SET_STAKES} [Stakes]\n\n`
            + this.gameRegistry.GetInfo()
            + "\n\nAll games automatically start once the host takes the first shot.\n\n"
            + "<b>Stakes</b>\n\n"
            + "Stakes can be set on any game by the host and awarded to the winner(s) at the end of the game.\n"
            + "Two player game: Winner takes all\n"
            + "Three player game: 1st gets 2/3 of the pot and 2nd gets 1/3\n"
            + "Four or more player game: 1st get 5/10 of the pot, 2nd gets 3/10 of the pot and 3rd gets 2/10 of the pot\n\n"
            + this.slotMachine.GetInfo()
            + '\n\n<a href="https://github.com/MaikoKingma/DankTimesBot-Plugin-Emoji-Games">Codebase</a>';

        this.sendMessage(chat.id, message, undefined, false, true);

        return "";
    }

    private chooseGame(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        if (this.isGameRunning())
            return "You can't start a when one is already in progress, moron...";
        const chooseGameResponse = this.gameRegistry.ChooseGame(msg, user);
        if (chooseGameResponse) {
            if (chooseGameResponse instanceof GameTemplate) {
                const mentions: string[] = msg.entities ? msg.entities.filter((entity) => entity.type === "mention").map((entity) => msg.text!.substring(entity.offset, entity.offset + entity.length)) : [];
                mentions.forEach((mention) => msg.text = msg.text?.replace(mention, ""));
                return this.initiateGame(chooseGameResponse, user, chat, mentions);
            }
            else
                return chooseGameResponse;
        }
        return "";
    }

    private setStakes(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        if (!this.isGameRunning())
            return "There is no game to set stakes on.";
        return this.currentGame!.SetStakes(msg, chat, user);
    }

    private joinGame(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        if (!this.isGameRunning())
            return "There is no game to join.";
        return this.currentGame!.AddPlayer(user, chat);
    }

    private cancelGameByUser(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        if (!this.isGameRunning())
            return "What do you expect me to cancel, theres nothing going on you fool!";
        if (user.id !== this.currentGame!.HostId)
            return "Only the host can cancel the game.";
        return this.cancelGame(chat)
    }

    private cancelGame(chat: Chat, autoCancel: boolean = false): string {
        const response = this.currentGame!.Cancel(chat, autoCancel);
        if (response.canceled)
            this.resetGame();
        return response.message;
    }

    private isGameRunning(): boolean {
        return !!this.currentGame;
    }

    private initiateGame(gameTemplate: GameTemplate, user: User, chat: Chat, mentions: string[] = []): string {
        this.resetGameTimeout(chat);
        this.currentGame = gameTemplate.NewGame();
        this.currentGame.AddPlayer(user, chat);
        let response = `${user.name} ${mentions.length > 0 ? `challenged ${mentions.join(", ")} to` : "started"} a game of ${this.currentGame.FullName}${this.startingGameOptions}`;
        if (this.currentGame.Stakes > 0) {
            response += `\n\nThey set the stakes to ${this.currentGame.Stakes}`;
        }
        return response;
    }

    private handleGameResponse(response: GameResponse, data: ChatMessageEventArguments) {
        if (this.currentGame && response.ValidInteraction) {
            this.resetGameTimeout(data.chat);
        }
        if (response.Msg) {
            if (response.Delay > 0)
                setTimeout(() => this.sendMessage(data.chat.id, response.Msg, response.IsReply ? data.msg.message_id : undefined), response.Delay * 1000);
            else {
                this.sendMessage(data.chat.id, response.Msg, response.IsReply ? data.msg.message_id : undefined)
            }
        }
        if (!this.currentGame)
            return;
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
