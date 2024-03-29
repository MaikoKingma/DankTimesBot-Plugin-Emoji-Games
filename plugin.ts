import TelegramBot from "node-telegram-bot-api";
import { BotCommand } from "../../src/bot-commands/bot-command";
import { Chat } from "../../src/chat/chat";
import { ChatSettingTemplate } from "../../src/chat/settings/chat-setting-template";
import { User } from "../../src/chat/user/user";
import { ChatMessageEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/chat-message-event-arguments";
import { PluginEvent } from "../../src/plugin-host/plugin-events/plugin-event-types";
import { AbstractPlugin } from "../../src/plugin-host/plugin/plugin";
import { EmojiGameCommands } from "./emoji-game-commands";
import { FileIOHelper } from "./file-io-helper";
import { Emoji } from "./games/emoji";
import { GameHost } from "./games/game-host";
import { GameRegistry } from "./games/game-registry";
import { GameTemplate } from "./games/round-based-games/templates/game-template";
import { SlotMachineData } from "./games/slot-machine/slot-machine-data";
import { SlotMachineGame } from "./games/slot-machine/slot-machine-game";
import { Settings } from "./settings";
import * as ChildProcess from "child_process";
import * as fs from "fs";
import * as Path from "path";
import { ChatResetEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/chat-reset-event-arguments";

export class Plugin extends AbstractPlugin {

    public static readonly PLUGIN_NAME = "Emoji Games";
    
    private readonly fileIOHelper = new FileIOHelper(this.loadDataFromFile.bind(this), this.saveDataToFile.bind(this));

    private gameHosts: Map<number, GameHost> = new Map<number, GameHost>();

    private readonly gameRegistry: GameRegistry = new GameRegistry();

    constructor() {
        let sha = "n.a.";
        try {
            const pluginsDir = Path.resolve("./plugins/");
            const pluginDir = fs.readdirSync(pluginsDir).find(dir => dir.replace(/[^a-zA-Z ]/, "").toLocaleLowerCase().includes("emojigame"));
            if (pluginDir)
            {
                sha = "<pre>" + ChildProcess
                    .execSync(`git --git-dir "${Path.resolve(pluginsDir, pluginDir, ".git")}" rev-parse --short HEAD`)
                    .toString().trim() + "</pre>";
            }
        } catch { }
        super(Plugin.PLUGIN_NAME, sha);

        this.subscribeToPluginEvent(PluginEvent.ChatMessage, this.onChatMessage.bind(this));
        this.subscribeToPluginEvent(PluginEvent.BotShutdown, this.persistData.bind(this));
        this.subscribeToPluginEvent(PluginEvent.HourlyTick, this.persistData.bind(this));
        this.subscribeToPluginEvent(PluginEvent.ChatReset, this.resetData.bind(this));
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
            new ChatSettingTemplate(Settings.BOWLING_ENABLED, "enable bowling", true, (original) => this.toBoolean(original), (value) => null)
        ];
    }

    /**
     * @override
     */
    public getPluginSpecificCommands(): BotCommand[] {
        const helpCommand = new BotCommand([EmojiGameCommands.INFO], `Prints info about the ${Plugin.PLUGIN_NAME}`, this.info.bind(this));
        const chooseGameCommand = new BotCommand([EmojiGameCommands.CHOOSE_GAME], "", this.chooseGame.bind(this), false);
        const joinGameCommand = new BotCommand([EmojiGameCommands.JOIN_GAME], "", this.joinGame.bind(this), false);
        const stopGameCommand = new BotCommand([EmojiGameCommands.CANCEL_GAME], "", this.cancelGameByUser.bind(this), false);
        const setStakesCommand = new BotCommand([EmojiGameCommands.SET_STAKES], "", this.setStakes.bind(this), false);
        const slotMachineStatsCommand = new BotCommand([EmojiGameCommands.SLOT_MACHINE_STATS], "", this.GetSlotMachineData.bind(this), false);
        const setBetCommand = new BotCommand([EmojiGameCommands.SET_SLOT_MACHINE_BET], "", ((chat: Chat, user: User, msg: TelegramBot.Message, match: string): string => {
            this.sendMessage(chat.id, this.getGameHost(chat.id).SetBet(user, msg), msg.message_id, false);
            return "";
        }).bind(this), false);
        const ballGameInfoCommand = new BotCommand([EmojiGameCommands.BALL_GAME_INFO], "", this.gameRegistry.GetInfo.bind(this.gameRegistry), false);
        const dartsInfoCommand = new BotCommand([EmojiGameCommands.DARTS_INFO], "", this.gameRegistry.GetInfo.bind(this.gameRegistry), false);
        const bowlingInfoCommand = new BotCommand([EmojiGameCommands.BOWLING_INFO], "", this.gameRegistry.GetInfo.bind(this.gameRegistry), false);
        const slotMachineInfoCommand = new BotCommand([EmojiGameCommands.SLOT_MACHINE_INFO], "", SlotMachineGame.GetInfo.bind(SlotMachineGame), false);
        // const betCommand = new BotCommand(["Bet"], "", this.chooseGame.bind(this)); // TODO
        // const rematchCommand = new BotCommand(["rematch"], "", this.chooseGame.bind(this)); // TODO
        return [helpCommand, chooseGameCommand, joinGameCommand, stopGameCommand, setStakesCommand, slotMachineStatsCommand, setBetCommand, ballGameInfoCommand, dartsInfoCommand, bowlingInfoCommand, slotMachineInfoCommand];
    }

    private persistData() {
        const chatIds = Array.from(this.gameHosts.keys());
        const data: Map<number, SlotMachineData> = new Map<number, SlotMachineData>();
        for (const chatId of chatIds) {
            const gameHost = this.gameHosts.get(chatId);
            const slotMachineData = gameHost!.GetSlotMachineData();
            data.set(chatId, slotMachineData)
        }
        this.fileIOHelper.PersistSlotMachineData(data);
    }

    private resetData(eventArgs: ChatResetEventArguments): void {
        let gameHost = this.gameHosts.get(eventArgs.chat.id);
        if (gameHost) {
            this.fileIOHelper.ResetSlotMachineData(eventArgs.chat.id);
            gameHost.ResetSlotMachineData();
        }
    }
    
    private getGameHost(chatId: number): GameHost {
        let gameHost = this.gameHosts.get(chatId);
        if (!gameHost) {
            gameHost = new GameHost(this.sendMessage.bind(this), this.fileIOHelper.GetSlotMachineData(chatId));
            this.gameHosts.set(chatId, gameHost);
        }
        return gameHost;
    }

    private onChatMessage(data: ChatMessageEventArguments) {
        if (data.msg.forward_from) {
            return;
        }
        const gameHost = this.getGameHost(data.chat.id);
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
            + `  - ${chat.getSetting(Settings.BOWLING_ENABLED) ? `/${EmojiGameCommands.BOWLING_INFO}` : `<s>/${EmojiGameCommands.BOWLING_INFO}</s>`} ${Emoji.BowlingEmoji}\n`
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
        const gameHost = this.getGameHost(chat.id);
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
        return this.getGameHost(chat.id).SetStakes(msg, chat, user);
    }

    private GetSlotMachineData(chat: Chat, user: User, msg: TelegramBot.Message, match: string) {
        return this.getGameHost(chat.id).GetSlotMachineData().Print();
    }

    private joinGame(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        return this.getGameHost(chat.id).JoinGame(user, chat);
    }

    private cancelGameByUser(chat: Chat, user: User, msg: TelegramBot.Message, match: string): string {
        return this.getGameHost(chat.id).CancelGameByUser(user, chat);
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
