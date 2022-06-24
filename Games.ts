import { AlterUserScoreArgs } from "../../src/chat/alter-user-score-args";
import { Chat } from "../../src/chat/chat";
import { User } from "../../src/chat/user/user";
import { ChatMessageEventArguments } from "../../src/plugin-host/plugin-events/event-arguments/chat-message-event-arguments";
import { Player } from "./player";

export class GameIdentifier {
    constructor(protected name: string, protected emoji: string, protected maxRounds: number) {}

    public get FullName(): string {
        return `${this.name} ${this.emoji}`;
    }
}

export class GameTemplate extends GameIdentifier {

    public IdentifyGame(msg: string): boolean {
        msg = msg.toLocaleLowerCase();
        return (msg === this.name.toLocaleLowerCase() || msg === this.emoji.toLocaleLowerCase() || msg === this.FullName.toLocaleLowerCase());
    }

    public NewGame(stakes: number): Game {
        return new Game(this.name, this.emoji, this.maxRounds, stakes);
    }

    public GetInfo(): string {
        return this.FullName + "\n\n"
            + `In the same order the players joined the game shoot by posting the ${this.emoji} emoji. After ${this.maxRounds} rounds the player with the highest score wins.`;
    }
}

export enum GameState {
    Initiated,
    Started,
    Ended
}

export class Game extends GameIdentifier {
    private hostId: number = -1;
    private gameState: GameState = GameState.Initiated;
    private round: number = 0;
    private players: Player[] = [];

    public get Stakes(): number {
        return this.stakes;
    }

    public get GameState(): GameState {
        return this.gameState
    }

    public get HostId(): number {
        return this.hostId;
    }

    constructor(name: string, emoji: string, maxRounds: number, private stakes: number) {
        super(name, emoji, maxRounds);
    }

    public AddPlayer(user: User, chat: Chat): string {
        if (this.hostId === -1) {
            this.hostId = user.id;
        } if (this.findPlayerById(user.id)) {
            return "You can't join the same game twice, idiot!";
        } if (this.stakes > user.score) {
            return "You can't afford to pay the stakes for this game."
        } else {
            if (this.stakes > 0) {
                chat.alterUserScore(new AlterUserScoreArgs(user, this.stakes * -1, this.name, `Invested stakes into ${this.FullName}`));
            }
            this.players.push(new Player(user.id, user.name));
            return `${user.name} joined the game of ${this.FullName}`;
        }
    }

    public HandleMessage(data: ChatMessageEventArguments): { msg: string, delay: number } {
        var player = this.findPlayerById(data.user.id);
        if (player && data.msg.dice && data.msg.dice.emoji === this.emoji) {
            if (this.gameState === GameState.Initiated) {
                if (player.id !== this.hostId)
                    return { msg: `You must wait for ${this.findPlayerById(this.hostId)!.name} to take the first shot.`, delay: 0 };
                else
                    this.gameState = GameState.Started;
            }
            if (player.RoundsPlayed > this.round)
                return { msg: "Get back to your place in the queue Karen and wait for your turn just like everyone else.", delay: 0 };
            player.shoot(data.msg.dice.value);
            if (this.hasRoundEnded()) {
                const playerRanking = this.players.sort((playerA, playerB) => playerA.Score > playerB.Score ? 1 : -1);
                const leaderboard = this.formatLeaderboard(playerRanking);
                if (this.round === this.maxRounds) {
                    this.gameState = GameState.Ended;
                    this.payoutEarnings(data.chat, playerRanking);
                    return { msg: `Congratulations ${playerRanking[0].name} won this game of ${this.FullName}\n\n${this.setMedals(leaderboard)}`, delay: 5 };
                }
                else
                    return { msg: `Round: ${this.round}/${this.maxRounds}\n\n${leaderboard}`, delay: 5 };
            }
        }
        return { msg: "", delay: 0 };
    }

    public ReturnStakes(chat: Chat) {
        for (const player of this.players) {
            chat.alterUserScore(new AlterUserScoreArgs(chat.users.get(player.id)!, this.stakes, this.name, `Reimbursed stakes from ${this.FullName}`));
        }
    }

    public SetStakes(chat: Chat, user: User, stakes: number) {
        if (user.id !== this.HostId)
            return "Only the host can set the stakes of a game.";
        if (this.players.length > 1)
            return "The stakes can't be set after players have joined.";
        if (this.stakes != 0)
            return "The stakes for this game are already set.";

        this.stakes = stakes;        
        chat.alterUserScore(new AlterUserScoreArgs(user, this.stakes * -1, this.name, `Invested stakes into ${this.FullName}`));
        return `${user.name} set the stakes to ${stakes}`;
    }

    private payoutEarnings(chat: Chat, ranking: Player[]) {
        if (this.stakes <= 0)
            return;
        const totalPriceMoney = ranking.length * this.stakes;
        if (ranking.length === 1 || ranking.length === 2)
            chat.alterUserScore(new AlterUserScoreArgs(chat.users.get(ranking[0].id)!, totalPriceMoney, this.name, `Winnings from ${this.FullName}`));
        else if (ranking.length === 3) {
            const payoutFirstPlace = totalPriceMoney / 3;
            chat.alterUserScore(new AlterUserScoreArgs(chat.users.get(ranking[0].id)!, payoutFirstPlace, this.name, `Winnings from ${this.FullName}`));
            chat.alterUserScore(new AlterUserScoreArgs(chat.users.get(ranking[1].id)!, totalPriceMoney - payoutFirstPlace, this.name, `Winnings from ${this.FullName}`));
        } else {
            const payoutFirstPlace = totalPriceMoney / 2;
            const payoutSecondPlace = ((totalPriceMoney - payoutFirstPlace) / 5) * 3;
            chat.alterUserScore(new AlterUserScoreArgs(chat.users.get(ranking[0].id)!, payoutFirstPlace, this.name, `Winnings from ${this.FullName}`));
            chat.alterUserScore(new AlterUserScoreArgs(chat.users.get(ranking[1].id)!, payoutSecondPlace, this.name, `Winnings from ${this.FullName}`));
            chat.alterUserScore(new AlterUserScoreArgs(chat.users.get(ranking[2].id)!, totalPriceMoney - payoutFirstPlace - payoutSecondPlace, this.name, `Winnings from ${this.FullName}`));
        }
    }

    private findPlayerById(id: number): Player | undefined {
        return this.players.find((player) => player.id === id)
    }

    private formatLeaderboard(playerRanking: Player[]): string {
        return playerRanking.map((player, index) => `${++index}. ${player.name} ${player.Score}`).join('\n');
    }

    private setMedals(leaderboard: string): string {
        return leaderboard.replace("1. ", "🥇. ")
            .replace("2. ", "🥈. ")
            .replace("3. ", "🥉. ");
    }

    private hasRoundEnded(): boolean {
        const allPlayersPlayed = this.players.every((player) => player.RoundsPlayed === (this.round + 1));
        if (allPlayersPlayed) {
            this.round++;
            return true;
        }
        return false;
    }
}
