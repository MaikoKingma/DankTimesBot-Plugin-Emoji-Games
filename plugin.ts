import TelegramBot from "node-telegram-bot-api";
import { BotCommand } from "../../src/bot-commands/bot-command";
import { Chat } from "../../src/chat/chat";
import { ChatSettingTemplate } from "../../src/chat/settings/chat-setting-template";
import { User } from "../../src/chat/user/user";
import { ChatMessageEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/chat-message-event-arguments";
import { PluginEvent } from "../../src/plugin-host/plugin-events/plugin-event-types";
import { AbstractPlugin } from "../../src/plugin-host/plugin/plugin";
import { EmojiGameCommands } from "./emoji-game-commands";
import { Emoji } from "./games/emoji";
import { GameHost } from "./games/game-host";
import { GameRegistry } from "./games/game-registry";
import { GameTemplate } from "./games/round-based-games/templates/game-template";
import { SlotMachineGame } from "./games/slot-machine/slot-machine-game";
import { Settings } from "./settings";

export class Plugin extends AbstractPlugin {

    public static readonly PLUGIN_NAME = "Emoji Games";

    private gameHosts: Map<number, GameHost> = new Map<number, GameHost>();

    private readonly gameRegistry: GameRegistry = new GameRegistry();

    constructor() {
        super(Plugin.PLUGIN_NAME, "1.1.0");

        this.subscribeToPluginEvent(PluginEvent.ChatMessage, this.OnChatMessage.bind(this));
    }

    /**
     * @override
     */
    public getPluginSpecificChatSettings(): Array<ChatSettingTemplate<any>> {
        return [
            new ChatSettingTemplate(Settings.BALL_GAME_ENABLED, "enable ballgame", true, (original) => this.toBoolean(original), (value) => null),
            new ChatSettingTemplate(Settings.DARTS_GAME_ENABLED, "enable darts", true, (original) => this.toBoolean(original), (value) => null),
            new ChatSettingTemplate(Settings.SLOT_MACHINE_ENABLED, "enable slotmachine", true, (original) => this.toBoolean(original), (value) => null),
            new ChatSettingTemplate(Settings.MAGIC_EIGHT_BALL_ENABLED, "enable magiceightball", true, (original) => this.toBoolean(original), (value) => null),
            new ChatSettingTemplate(Settings.EASTEREGGS_ENABLED, "enable eastereggs", true, (original) => this.toBoolean(original), (value) => null),
        ];
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
        const slotMachineStatsCommand = new BotCommand([EmojiGameCommands.SLOT_MACHINE_STATS], "", ((chat: Chat, user: User, msg: TelegramBot.Message, match: string) => this.GetGameHost(chat.id).GetSlotMachineStats()).bind(this));
        const setBetCommand = new BotCommand([EmojiGameCommands.SET_SLOT_MACHINE_BET], "", ((chat: Chat, user: User, msg: TelegramBot.Message, match: string): string => {
            this.sendMessage(chat.id, this.GetGameHost(chat.id).SetBet(user, msg), msg.message_id, false);
            return "";
        }).bind(this));
        const ballGameInfoCommand = new BotCommand([EmojiGameCommands.BALL_GAME_INFO], "", this.gameRegistry.GetInfo.bind(this.gameRegistry))
        const dartsInfoCommand = new BotCommand([EmojiGameCommands.DARTS_INFO], "", this.gameRegistry.GetInfo.bind(this.gameRegistry))
        const slotMachineInfoCommand = new BotCommand([EmojiGameCommands.SLOT_MACHINE_INFO], "", SlotMachineGame.GetInfo.bind(SlotMachineGame))
        // const betCommand = new BotCommand(["Bet"], "", this.chooseGame.bind(this)); // TODO
        // const rematchCommand = new BotCommand(["rematch"], "", this.chooseGame.bind(this)); // TODO
        return [helpCommand, chooseGameCommand, joinGameCommand, stopGameCommand, setStakesCommand, slotMachineStatsCommand, setBetCommand, ballGameInfoCommand, dartsInfoCommand, slotMachineInfoCommand];
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
        if (data.msg.forward_from) {
            return;
        }
        const gameHost = this.GetGameHost(data.chat.id);
        if (!gameHost.HandleMessage(data)) {
            const chooseGameResponse = this.gameRegistry.HandleMessage(data.chat, data.msg, data.user);
            if (chooseGameResponse) {
                if (chooseGameResponse instanceof GameTemplate) {
                    data.botReplies = data.botReplies.concat(gameHost.InitiateGame(chooseGameResponse, data.user, data.chat));
                } else {
                    data.botReplies = data.botReplies.concat(chooseGameResponse);
                }
            }
        }
    }
    
    private info(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        const magicEightBall = `MagicEightBall: Just post a message with the ${Emoji.MagicEightBallEmoji} emoji in it`;
        const message = "<b>A variety of games played with emoji's 🕹️</b>\n\n"
            + "<b>Round based games</b>\n"
            + `- /${EmojiGameCommands.CHOOSE_GAME} (optional)[GameName|GameEmoji|GameIndex] [Rounds] [Stakes]\n`
            + `  - ${chat.getSetting(Settings.BALL_GAME_ENABLED) ? `/${EmojiGameCommands.BALL_GAME_INFO}` : `<s>/${EmojiGameCommands.BALL_GAME_INFO}</s>`} ${Emoji.FootballEmoji}, ${Emoji.BasketballEmoji}\n`
            + `  - ${chat.getSetting(Settings.DARTS_GAME_ENABLED) ? `/${EmojiGameCommands.DARTS_INFO}` : `<s>/${EmojiGameCommands.DARTS_INFO}</s>`} ${Emoji.DartEmoji}\n`
            + `- /${EmojiGameCommands.JOIN_GAME} 🧑‍🤝‍🧑\n`
            + `- /${EmojiGameCommands.CANCEL_GAME} 🛑\n`
            + `- /${EmojiGameCommands.SET_STAKES} [Stakes] 💵\n\n`
            + "<b>Always on games</b>\n"
            + `- ${chat.getSetting(Settings.SLOT_MACHINE_ENABLED) ? `/${EmojiGameCommands.SLOT_MACHINE_INFO}` : `<s>/${EmojiGameCommands.SLOT_MACHINE_INFO}</s>`} ${Emoji.SlotMachineEmoji}\n`
            + `- ${chat.getSetting(Settings.SLOT_MACHINE_ENABLED) ? magicEightBall : `<s>/${magicEightBall}</s>`}\n\n`
            + '<a href="https://github.com/MaikoKingma/DankTimesBot-Plugin-Emoji-Games">Codebase</a>';

        this.sendMessage(chat.id, message, undefined, false, true);

        return "";
    }

    private chooseGame(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        const gameHost = this.GetGameHost(chat.id);
        if (gameHost.IsGameRunning())
            return "You can't start a game when one is already in progress, moron...";
        const chooseGameResponse = this.gameRegistry.ChooseGame(chat, msg, user);
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
        return this.GetGameHost(chat.id).JoinGame(user, chat);
    }

    private cancelGameByUser(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        return this.GetGameHost(chat.id).CancelGameByUser(user, chat);
    }

    private toBoolean(original: string): boolean {
        original = original.toLowerCase();
        if (original === "true" || original === "yes" || original === "1") {
            return true;
        } else if (original === "false" || original === "no" || original === "0") {
            return false;
        }
        throw new RangeError("The value must be a boolean!");
    }
}
