import { Message } from "node-telegram-bot-api";
import { User } from "../../src/chat/user/user";
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

    public NewGame(): Game {
        return new Game(this.name, this.emoji, this.maxRounds);
    }

    public GetInfo(): string {
        return this.FullName + "\n\n"
            + `In the same order the players joined the game shoot by posting the ${this.emoji} emoji. After ${this.maxRounds} rounds the player with the highest score wins.`;
    }
}

export class Game extends GameIdentifier {
    public round: number = 0;
    private nextPlayer: number = 0;
    public players: Player[] = [];

    public AddPlayer(user: User): string {
        if (this.players.find((player) => player.id === user.id)) {
            return "You can't join the same game twice, idiot!";
        } else {
            this.players.push(new Player(user.id, user.name));
            return `${user.name} joined the game of ${this.FullName}`;
        }
    }

    public HandleMessage(msg: Message, user: User): string {
        if (user.id === this.players[this.nextPlayer].id && msg.dice && msg.dice.emoji === this.emoji) {
            this.shoot(msg.dice.value);
            const playerRanking = this.players.sort((playerA, playerB) => playerA.Score > playerB.Score ? 1 : -1);
            const leaderboard = this.formatLeaderboard(playerRanking);
            if (this.hasGameEnded()) {
                return `Congratulations ${playerRanking[0].name} won this game of ${this.FullName}\n\n${this.setMedals(leaderboard)}`;
            } else {
                return `Round: ${this.round}/${this.maxRounds}\n\n${leaderboard}`;
            }
        }
        return "";
    }

    private formatLeaderboard(playerRanking: Player[]): string {
        return playerRanking.map((player, index) => `${++index}. ${player.name} ${player.Score}`).join('\n');
    }

    private setMedals(leaderboard: string): string {
        return leaderboard.replace("1. ", "🥇. ")
            .replace("2. ", "🥈. ")
            .replace("3. ", "🥉. ");
    }

    private shoot(diceValue: number)  {
        if (diceValue >= 4) {
            this.players[this.nextPlayer].Score++;
        }
        this.nextPlayer++;
    }

    private hasGameEnded(): boolean {
        if (this.nextPlayer > this.players.length - 1) {
            this.nextPlayer = 0;
            this.round++;
        }
        return this.round === this.maxRounds;
    }
}
