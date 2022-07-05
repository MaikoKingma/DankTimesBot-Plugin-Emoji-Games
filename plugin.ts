import TelegramBot from "node-telegram-bot-api";
import { BotCommand } from "../../src/bot-commands/bot-command";
import { Chat } from "../../src/chat/chat";
import { ChatSettingTemplate } from "../../src/chat/settings/chat-setting-template";
import { User } from "../../src/chat/user/user";
import { ChatMessageEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/chat-message-event-arguments";
import { PluginEvent } from "../../src/plugin-host/plugin-events/plugin-event-types";
import { AbstractPlugin } from "../../src/plugin-host/plugin/plugin";
import { EmojiGameCommands } from "./emoji-game-commands";
import { GameHost } from "./games/game-host";
import { GameRegistry } from "./games/game-registry";
import { GameTemplate } from "./games/round-based-games/games";
import { SlotMachineGame } from "./games/slot-machine/slot-machine-game";

export class Plugin extends AbstractPlugin {

    public static readonly PLUGIN_NAME = "Emoji Games";

    private gameHosts: Map<number, GameHost> = new Map<number, GameHost>();

    private readonly gameRegistry: GameRegistry = new GameRegistry();

    private readonly martonResponse: string = "Please take some time to read the info (/emojigames) to understand game and its rules. Also don't forget that you can make issues on the github board if you find anything broken."

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
        const slotMachineInfoCommand = new BotCommand([EmojiGameCommands.SLOT_MACHINE_STATS], "", ((chat: Chat, user: User, msg: TelegramBot.Message, match: string) => this.GetGameHost(chat.id).GetSlotMachineStats()).bind(this));
        const setBetCommand = new BotCommand([EmojiGameCommands.SET_SLOT_MACHINE_BET], "", ((chat: Chat, user: User, msg: TelegramBot.Message, match: string): string => {
            this.sendMessage(chat.id, this.GetGameHost(chat.id).SetBet(user, msg), msg.message_id, false);
            return "";
        }).bind(this));
        // const betCommand = new BotCommand(["Bet"], "", this.chooseGame.bind(this)); // TODO
        // const rematchCommand = new BotCommand(["rematch"], "", this.chooseGame.bind(this)); // TODO
        return [helpCommand, chooseGameCommand, joinGameCommand, stopGameCommand, setStakesCommand, slotMachineInfoCommand, setBetCommand];
    }
    
    private GetGameHost(chatId: number): GameHost {
        let gameHost = this.gameHosts.get(chatId);
        if (!gameHost) {
            gameHost = new GameHost(chatId, this.sendMessage.bind(this));
            this.gameHosts.set(chatId, gameHost);
        }
        return gameHost;
    }

    private OnChatMessage(data: ChatMessageEventArguments) {
        // if (data.msg.forward_from) {
        //     return;
        // }
        if (this.martonCheck(data.user.id)) {
            data.botReplies = data.botReplies.concat(this.martonResponse);
            return;
        }
        // if (data.msg.dice) {
        //     this.sendDice(data.chat.id, data.msg.dice.emoji);
        // }
        const gameHost = this.GetGameHost(data.chat.id);
        if (!gameHost.HandleMessage(data)) {
            const chooseGameResponse = this.gameRegistry.HandleMessage(data.msg, data.user);
            if (chooseGameResponse) {
                if (chooseGameResponse instanceof GameTemplate) {
                    data.botReplies = data.botReplies.concat(gameHost.InitiateGame(chooseGameResponse, data.user, data.chat));
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
            + SlotMachineGame.GetInfo()
            + '\n\n<a href="https://github.com/MaikoKingma/DankTimesBot-Plugin-Emoji-Games">Codebase</a>';

        this.sendMessage(chat.id, message, undefined, false, true);

        return "";
    }

    private chooseGame(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        if (this.martonCheck(user.id))
            return this.martonResponse;
        const gameHost = this.GetGameHost(chat.id);
        if (gameHost.IsGameRunning())
            return "You can't start a when one is already in progress, moron...";
        const chooseGameResponse = this.gameRegistry.ChooseGame(msg, user);
        if (chooseGameResponse) {
            if (chooseGameResponse instanceof GameTemplate) {
                const mentions: string[] = msg.entities ? msg.entities.filter((entity) => entity.type === "mention").map((entity) => msg.text!.substring(entity.offset, entity.offset + entity.length)) : [];
                mentions.forEach((mention) => msg.text = msg.text?.replace(mention, ""));
                return gameHost.InitiateGame(chooseGameResponse, user, chat, mentions);
            }
            else
                return chooseGameResponse;
        }
        return "";
    }

    private setStakes(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        return this.GetGameHost(chat.id).SetStakes(msg, chat, user);
    }

    private joinGame(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        if (this.martonCheck(user.id))
            return this.martonResponse;
        return this.GetGameHost(chat.id).JoinGame(user, chat);
    }

    private cancelGameByUser(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        return this.GetGameHost(chat.id).CancelGameByUser(user, chat);
    }

    private martonCheck(userId: number): boolean {
        return userId === 100805902;
    }
}
