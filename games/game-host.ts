import { Message } from "node-telegram-bot-api";
import { Chat } from "../../../src/chat/chat";
import { User } from "../../../src/chat/user/user";
import { ChatMessageEventArguments } from "../../../src/plugin-host/plugin-events/event-arguments/chat-message-event-arguments";
import { Emoji } from "./emoji";
import { EmojiGameCommands } from "../emoji-game-commands";
import { GameResponse } from "./game-response";
import { RoundBasedGame, GameState } from "./round-based-games/round-based-game";
import { SlotMachineGame } from "./slot-machine/slot-machine-game";
import { GameTemplate } from "./round-based-games/templates/game-template";
import { MagicEightBall } from "./magic-eight-ball/magic-eight-ball";

export class GameHost {

    private readonly slotMachine: SlotMachineGame = new SlotMachineGame();

    private currentGame?: RoundBasedGame;
    private readonly startingGameOptions = `\nUse /${EmojiGameCommands.SET_STAKES} to set the stakes or /${EmojiGameCommands.JOIN_GAME} to join the game`;

    private roundTimeout: NodeJS.Timeout;
    private gameTimeout: NodeJS.Timeout;

    constructor (private chatId: number,
        private readonly sendMessage: (chatId: number, htmlMessage: string, replyToMessageId?: number, forceReply?: boolean, disableWebPagePreview?: boolean) => Promise<void | Message>
        ) {}

    public HandleMessage(data: ChatMessageEventArguments):boolean {
        if (data.msg.text?.includes(Emoji.MagicEightBallEmoji)) {
            this.handleGameResponse(MagicEightBall.GetAnswer(), data);
            return true;
        }
        if (data.msg.dice && data.msg.dice.emoji === Emoji.SlotMachineEmoji) {
            this.handleGameResponse(this.slotMachine.PullLever(data.msg.dice.value, data.chat, data.user), data);
            return true;
        }
        if (this.IsGameRunning()) {
            this.handleGameResponse(this.currentGame!.HandleMessage(data), data);
            return true;
        }
        return false;
    }

    public GetSlotMachineStats(): string {
        return this.slotMachine.GetStats();
    }

    public SetBet(user: User, msg: Message): string {
        return this.slotMachine.SetBet(user, msg);
    }

    public SetStakes(msg: Message, chat: Chat, user: User): string {
        if (!this.IsGameRunning())
            return "There is no game to set stakes on.";
        return this.currentGame!.SetStakes(msg, chat, user);
    }

    public JoinGame(user: User, chat: Chat): string {
        if (!this.IsGameRunning())
            return "There is no game to join.";
        return this.currentGame!.AddPlayer(user, chat);
    }

    public CancelGameByUser(user: User, chat: Chat): string {
        if (!this.IsGameRunning())
            return "What do you expect me to cancel, theres nothing going on you fool!";
        if (user.id !== this.currentGame!.HostId)
            return "Only the host can cancel the game.";
        return this.cancelGame(chat);
    }

    private cancelGame(chat: Chat, autoCancel: boolean = false): string {
        const response = this.currentGame!.Cancel(chat, autoCancel);
        if (response.canceled)
            this.resetGame();
        return response.message;
    }

    public InitiateGame(gameTemplate: GameTemplate, user: User, chat: Chat, mentions: string[] = []): string {
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
                this.sendMessage(data.chat.id, response.Msg, response.IsReply ? data.msg.message_id : undefined);
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

    public IsGameRunning(): boolean {
        return !!this.currentGame;
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