import { Message } from "node-telegram-bot-api";
import { AlterUserScoreArgs } from "../../../../src/chat/alter-user-score-args";
import { Chat } from "../../../../src/chat/chat";
import { User } from "../../../../src/chat/user/user";
import { EmojiGameCommands } from "../../emoji-game-commands";
import { EmojiGameUser as Player } from "./emoji-game-user";
import { GameResponse } from "../game-response";
import { Plugin } from "../../plugin";
import { SlotMachine } from "./slot-machine-scores";

export class SlotMachineGame {

    private players: Player[] = [];
    
    // TODO serialize
    private pot: number = 0;
    private timesBet: number = 0;
    private totalBetAmount: number = 0;
    private totalWon: number = 0;
    private totalLost: number = 0;

    private updatePayoutStats(payout: number) {
        if (payout > 0)
            this.totalWon += payout;
        else 
            this.totalLost += payout;
    }

    private readonly DEFAULT_BET = 100;

    public pullLever(value: number, chat: Chat, user: User): GameResponse {
        const player = this.findPlayer(user);
        const bet = player ? player.Bet : this.DEFAULT_BET;
        if (bet > user.score)
            return GameResponse.SlotMachineResponse(`${user.name} can't afford the bet. They only get a participation trophy 🥤`);
        const multiplier = player?.WinningsMultiplier;
        const outcome = Math.round(this.getOutcome(value, bet, multiplier));
        if (outcome != 0) {
            chat.alterUserScore(new AlterUserScoreArgs(user, outcome, Plugin.PLUGIN_NAME, `Payment + payout slot machine`));
        }
        if (outcome > 0) {
            return GameResponse.SlotMachineResponse(`Congratulations!! ${user.name} won ${outcome}`);
        } else if (outcome < 0) {
            return GameResponse.SlotMachineResponse(`${user.name} lost ${outcome}`);
        } else {
            return GameResponse.SlotMachineResponse("Welp at least you didn't lose anything.");
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
        let currentBet = this.DEFAULT_BET;
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
    
    public GetStats(chat: Chat, user: User, msg: Message, match: string): string {
        return `🎰 <b>Slot Machine Stats</b> 🎰\n\n`
            + `Pot: ${this.pot}\n`
            + `Times Bet: ${this.timesBet}\n`
            + `Total Bet Amount: ${this.totalBetAmount}\n`
            + `Total Won: ${this.totalWon}\n`
            + `Total Lost: ${this.totalLost}`;
    }

    public GetInfo(): string {
        return `🎰 <b>Slot Machine</b> 🎰\n\n`
            + "The Slot Machine emoji can be send at any time and the default bet will always be paid if you can afford it.\n\n"
            + `/${EmojiGameCommands.SET_SLOT_MACHINE_BET} [Bet] Change your betting amount (Default: ${this.DEFAULT_BET})\n`
            + `/${EmojiGameCommands.SLOT_MACHINE_STATS} Displays stats of the slot machine\n\n`
            + "Rules:\n"
            + "- All bets go into the pot\n"
            + "- Consecutive spins payout more (second spin = 2x payout, third spin = 4x payout)\n"
            + "- After the third consecutive spin the spin counter is reset\n"
            + "- After 10 minutes of inactivity the spin counter is reset\n\n"
            + "<pre>"
            + "| Outcome  | Payout                    |\n"
            + "|----------|:---------------------------:|\n"
            + `| 3 x bar  | Entire pot (max 1000 * bet) |\n`
            + "| 3 x 7    | Double the bet              |\n"
            + "| 🍋🍋🍋  | Whole bet                   |\n"
            + "| 🍒🍒🍒  | Whole bet                   |\n"
            + "| 🍒🍒        | 1/2 bet                     |\n"
            + "| 🍒               | 1/4 bet                     |"
            + "</pre>";
    }

    private getOutcome(value: number, bet: number, payoutMultiplier: number): number {
        this.timesBet++;
        this.totalBetAmount += bet;
        const multiplier = SlotMachine.Spin(value);
        if (multiplier === -1) {
            let payout = this.pot;
            const maxPayout = 1000 * bet;
            if (payout > maxPayout) {
                payout = maxPayout;
                this.pot = this.pot - maxPayout;
            } else {
                this.pot = 0;
            }
            payout = payout * payoutMultiplier;
            this.updatePayoutStats(payout);
            return payout;
        } else {
            this.pot += bet;
            const payout = ((multiplier * bet) * payoutMultiplier) - bet;
            this.updatePayoutStats(payout);
            return payout;
        }
    }

    private findPlayer(user: User): Player {
        let player = this.players.find(player => user.id === player.Id);
        if (!player) {
            player = new Player(user.id, user.name, this.DEFAULT_BET);
            this.players.push(player);
        }
        return player;
    }
}