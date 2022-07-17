import { Message } from "node-telegram-bot-api";
import { AlterUserScoreArgs } from "../../../../src/chat/alter-user-score-args";
import { Chat } from "../../../../src/chat/chat";
import { User } from "../../../../src/chat/user/user";
import { EmojiGameCommands } from "../../emoji-game-commands";
import { EmojiGameUser as Player } from "./emoji-game-user";
import { GameResponse } from "../game-response";
import { Plugin } from "../../plugin";
import { SlotMachine } from "./slot-machine-scores";
import { SlotMachineData } from "./slot-machine-data";

export class SlotMachineGame {

    private data: SlotMachineData = new SlotMachineData();

    private players: Player[] = [];

    private static readonly MINIMUM_BET = 4;

    public get Data(): SlotMachineData {
        return this.data;
    }

    public PullLever(value: number, chat: Chat, user: User): GameResponse {
        const player = this.findPlayer(user);
        if (player.Bet > user.score)
            return GameResponse.AlwaysOnGameResponse(`${user.name} can't afford the bet. They only get a participation trophy 🥤`);
        const consecutiveSpin = player.ConsecutiveSpin;
        let payoutMultiplier = 1;
        if (consecutiveSpin == 1) {
            payoutMultiplier = 2;
        } else if (consecutiveSpin == 2) {
            payoutMultiplier = 4;
        }
        const multiplier = SlotMachine.Spin(value);
        const outcome = this.data.Win(player.Bet, multiplier, payoutMultiplier);
        if (outcome != 0) {
            chat.alterUserScore(new AlterUserScoreArgs(user, outcome, Plugin.PLUGIN_NAME, `Payment + payout slot machine`));
        }
        const stats = `\nSpin: ${consecutiveSpin + 1} (${payoutMultiplier}x), Payout: ${multiplier}${typeof multiplier === "string" ? "" : " x bet"}\n\n${this.data.ToString()}`
        if (outcome > 0) {
            return GameResponse.AlwaysOnGameResponse(`Congratulations!! ${user.name} won ${outcome}${stats}`);
        } else if (outcome < 0) {
            return GameResponse.AlwaysOnGameResponse(`${user.name} lost ${outcome * -1}${stats}`);
        } else {
            return GameResponse.AlwaysOnGameResponse(`Welp at least you didn't lose anything.${stats}`);
        }
    }

    public SetBet(user: User, msg: Message): string {
        if (!msg.text)
            return `${user.name} is losing it`;
        const bet = parseInt(msg.text?.split(" ")[1])
        const player = this.findPlayer(user);
        if (!bet)
            return `💰 Current bet amount ${player.Bet}`;
        if (!bet || bet <= 0 || (bet % 1 !== 0))
            return `${user.name} doesn't know how numbers work`;
        if (bet < SlotMachineGame.MINIMUM_BET)
            return `We don't accept peasant bets like that`
        let currentBet = SlotMachineGame.MINIMUM_BET;
        currentBet = player.Bet;
        player.Bet = bet;
        if (currentBet < bet) {
            return `${user.name} is crazy`;
        } else if (currentBet > bet) {
            return `${user.name} is a pussy`;
        } else {
            return `${user.name} is lost`;
        }
    }
    
    public GetStats(): string {
        return this.data.ToString();
    }

    private findPlayer(user: User): Player {
        let player = this.players.find(player => user.id === player.Id);
        if (!player) {
            player = new Player(user.id, user.name, SlotMachineGame.MINIMUM_BET);
            this.players.push(player);
        }
        return player;
    }

    public static GetInfo(chat: Chat, user: User, msg: Message, match: string): string {
        return `🎰 <b>Slot Machine</b> 🎰\n\n`
            + "The Slot Machine emoji can be send at any time and the default bet will always be paid if you can afford it.\n\n"
            + `/${EmojiGameCommands.SET_SLOT_MACHINE_BET} [Bet] Change your betting amount (Default: ${SlotMachineGame.MINIMUM_BET})\n`
            + `/${EmojiGameCommands.SLOT_MACHINE_STATS} Displays stats of the slot machine\n\n`
            + "Rules:\n"
            + `- Minimum bet: ${SlotMachineGame.MINIMUM_BET}`
            + "- All bets go into the pot\n"
            + "- Consecutive spins payout more (second spin = 2x payout, third spin = 4x payout)\n"
            + "- After the third consecutive spin the spin counter is reset\n"
            + "- After 10 minutes of inactivity the spin counter is reset\n"
            + "- Consecutive spin multiplier does not apply to winning the pot\n"
            + "- The maximum amount that can be won from the pot is 1000 x bet\n\n"
            + `${SlotMachine.GetInfo()}`
    }
}