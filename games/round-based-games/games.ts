import { AlterUserScoreArgs } from "../../../../src/chat/alter-user-score-args";
import { Chat } from "../../../../src/chat/chat";
import { User } from "../../../../src/chat/user/user";
import { ChatMessageEventArguments } from "../../../../src/plugin-host/plugin-events/event-arguments/chat-message-event-arguments";
import { Emoji } from "../../emoji";
import { EmojiGameCommands } from "../../emoji-game-commands";
import { GameResponse } from "../game-response";
import { Player } from "./player";
import { Plugin } from "../../plugin";
import { Message } from "node-telegram-bot-api";

export class GameIdentifier {

    constructor(protected name: string, protected emoji: string, protected maxRounds: number, protected stakes: number = 0) {}

    public get FullName(): string {
        return `${this.name} ${this.emoji}`;
    }
}

export class GameTemplate extends GameIdentifier {

    public IdentifyGame(msg: string): boolean {
        msg = msg.toLocaleLowerCase();
        return (msg === this.name.toLocaleLowerCase() || msg === this.emoji.toLocaleLowerCase() || msg === this.FullName.toLocaleLowerCase());
    }

    public Customize(rounds: number, stakes: number = 0): GameTemplate {
        return new GameTemplate(this.name, this.emoji, rounds, stakes);
    }

    public NewGame(): Game {
        return new Game(this.name, this.emoji, this.maxRounds, this.stakes);
    }

    public GetInfo(): string {
        return `<b>${this.FullName.replace(" ", "</b> ")}\n\n`
            + `Shoot by posting the ${this.emoji} emoji. After ${this.maxRounds} rounds the player with the highest score wins.`
            + (this.emoji === Emoji.DartEmoji ? `\nBullseye: 25 points\n1st circle: 15 points\n2nd circle: 10 points\n3rd circle: 5 points\n4th circle: 3 points` : "");
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
    private tiedPlayersCache: Player[] = [];

    public get Stakes(): number {
        return this.stakes;
    }

    public get GameState(): GameState {
        return this.gameState
    }

    public get HostId(): number {
        return this.hostId;
    }

    constructor(name: string, emoji: string, maxRounds: number, stakes: number) {
        super(name, emoji, maxRounds, stakes);
    }

    public AddPlayer(user: User, chat: Chat): string {
        if (this.hostId === -1) {
            this.hostId = user.id;
        } if (this.findPlayerById(user.id)) {
            return "You can't join the same game twice, idiot!";
        } if (this.GameState !== GameState.Initiated) {
            return "The current game as already started.";
        } if (this.stakes > user.score) {
            return "You can't afford to pay the stakes for this game.";
        }
        
        if (this.stakes > 0) {
            chat.alterUserScore(new AlterUserScoreArgs(user, this.stakes * -1, this.name, `Invested stakes into ${this.FullName}`));
        }
        this.players.push(new Player(user.id, user.name));
        return `${user.name} joined the game of ${this.FullName}`;
    }

    public HandleMessage(data: ChatMessageEventArguments): GameResponse {
        var player = this.findPlayerById(data.user.id);
        if (player && !player.Disqualified) {
            if (data.msg.dice && data.msg.dice.emoji === this.emoji) {
                let tieBreaking = false;
                if (this.tiedPlayersCache.length !== 0) {
                    if (this.tiedPlayersCache.findIndex((cachedPlayer) => cachedPlayer.id === player!.id) === -1) 
                        return GameResponse.EmptyResponse(false);
                    else
                        tieBreaking = true;
                }
                if (this.gameState === GameState.Initiated) {
                    if (player.id !== this.hostId)
                        return GameResponse.PlayerError(`You must wait for ${this.findPlayerById(this.hostId)!.name} to take the first shot.`);
                    else
                        this.gameState = GameState.Started;
                }
                if (player.RoundsPlayed > this.round)
                    return GameResponse.PlayerError(`Get back to your place in the queue Karen and wait for your turn just like everyone else.`);
                player.Shoot(data.msg.dice, tieBreaking);
                if (this.hasRoundEnded()) {
                    return this.endRound(data.chat);
                }
                return GameResponse.EmptyResponse(true);
            } else if (data.msg.text === this.emoji) {
                return GameResponse.PlayerError(`You seem to be using a client that does not support animated emoji. Use a compatible client instead or the host can /${EmojiGameCommands.CANCEL_GAME} the game.`);
            }
        }
        return GameResponse.EmptyResponse(false);
    }

    public SetStakes(msg: Message, chat: Chat, user: User) {
        if (!msg.text)
            return "";
        if (user.id !== this.hostId)
            return "Only the host can set the stakes of a game.";
        if (this.players.length > 1)
            return "The stakes can't be set after players have joined.";
        if (this.stakes != 0)
            return "The stakes for this game are already set.";

        const setStakesParams = msg.text!.replace("/" + EmojiGameCommands.SET_STAKES, "").trim().split(" ");
        const stakes = parseInt(setStakesParams[0]);
        if (!stakes || stakes <= 0 || (stakes % 1 !== 0) || user.score < stakes)
            return "The stakes must be a valid number and payable with your current score.";

        this.stakes = stakes;        
        chat.alterUserScore(new AlterUserScoreArgs(user, this.stakes * -1, this.name, `Invested stakes into ${this.FullName}`));
        return `${user.name} set the stakes to ${stakes}`;
    }

    public EndRoundEarly(chat: Chat): GameResponse {
        const playersToDisqualify: string[] = [];
        for (const player of this.players) {
            if (!player.Disqualified && player.RoundsPlayed < (this.round + 1)) {
                player.Disqualified = true;
                playersToDisqualify.push(player.name);
            }
        }
        return this.endRound(chat, playersToDisqualify.length > 0 ? "\n\nDisqualified player(s): " + playersToDisqualify.join(", ") : "");
    }

    public Cancel(chat: Chat, autoCancel: boolean): { message: string, canceled: boolean} {
        if (!autoCancel && this.stakes > 0 && this.round > 0)
            return { message:  "A game with stakes can't be canceled after the first round.", canceled: false};
        let msg = autoCancel ? `The game of ${this.FullName} was canceled due to inactivity` : `Canceled the game of ${this.FullName}`;
        if (this.Stakes > 0) {
            this.returnStakes(chat);
            msg += "\nAll stakes were returned."
        }
        return { message: msg, canceled: true};
    }

    private returnStakes(chat: Chat) {
        for (const player of this.players) {
            chat.alterUserScore(new AlterUserScoreArgs(chat.users.get(player.id)!, this.stakes, this.name, `Reimbursed stakes from ${this.FullName}`));
        }
    }

    private endRound(chat: Chat, disqualifiedMessage: string = ""): GameResponse {
        const playerRanking = this.sortPlayers();
        const leaderboard = this.formatLeaderboard(playerRanking);
        if (this.players.every((player) => player.Disqualified)) {
            this.gameState = GameState.Ended;
            return GameResponse.RoundTransition(`🐌 The game has been ended because all players were disqualified. 🐌\n\n${leaderboard}${disqualifiedMessage}`);
        } else if (this.round >= this.maxRounds) {
            this.tiedPlayersCache = this.getTiedPlayers(playerRanking);
            if (this.tiedPlayersCache.length > 0) {
                return GameResponse.RoundTransition(`Players ${this.tiedPlayersCache.map((player) => player.name).join(", ")} have to take another shot for the tiebreaker\n\n${leaderboard}${disqualifiedMessage}`)
            }
            this.gameState = GameState.Ended;
            this.payoutEarnings(chat, playerRanking);
            return GameResponse.RoundTransition(`Congratulations ${playerRanking[0].name} won this game of ${this.FullName}\n\n${this.setMedals(leaderboard)}${disqualifiedMessage}`);
        }
        else
            return GameResponse.RoundTransition(`Round: ${this.round}/${this.maxRounds}\n\n${leaderboard}${disqualifiedMessage}`);
    }

    private getTiedPlayers(playerRanking: Player[]): Player[] {
        const tiedPlayers: Player[] = [];
        for (let i = 0; i < playerRanking.length; i++) {
            if (i === 5)
                break;
            const player = playerRanking[i];
            if (player.Disqualified)
                break;
            if (playerRanking[i - 1] && player.IsTied(playerRanking[i - 1])) {
                tiedPlayers.push(player);
            } else if (i !== 4 && playerRanking[i + 1] && player.IsTied(playerRanking[i + 1])) {
                tiedPlayers.push(player);
            }
        }
        return tiedPlayers;
    }

    private payoutEarnings(chat: Chat, ranking: Player[]) {
        if (this.stakes <= 0)
            return;
        const totalPriceMoney = ranking.length * this.stakes;
        if (ranking.length === 1 || ranking.length === 2) {
            if (!ranking[0].Disqualified)
                chat.alterUserScore(new AlterUserScoreArgs(chat.users.get(ranking[0].id)!, totalPriceMoney, Plugin.PLUGIN_NAME, `Winnings from ${this.FullName}`));
        } else if (ranking.length === 3) {
            const payoutSecondPlace = totalPriceMoney / 3;
            if (!ranking[0].Disqualified)
                chat.alterUserScore(new AlterUserScoreArgs(chat.users.get(ranking[0].id)!, Math.ceil(totalPriceMoney - payoutSecondPlace), Plugin.PLUGIN_NAME, `Winnings from ${this.FullName}`));
            if (!ranking[1].Disqualified)
                chat.alterUserScore(new AlterUserScoreArgs(chat.users.get(ranking[1].id)!, Math.floor(payoutSecondPlace), Plugin.PLUGIN_NAME, `Winnings from ${this.FullName}`));
        } else {
            let payoutFirstPlace = totalPriceMoney / 2;
            const payoutSecondPlace = (totalPriceMoney - payoutFirstPlace) * 0.6;
            payoutFirstPlace += (payoutSecondPlace - Math.floor(payoutSecondPlace));
            const payoutThirdPlace = totalPriceMoney - payoutFirstPlace - payoutSecondPlace;
            payoutFirstPlace += (payoutThirdPlace - Math.floor(payoutThirdPlace));
            if (!ranking[0].Disqualified)
                chat.alterUserScore(new AlterUserScoreArgs(chat.users.get(ranking[0].id)!, Math.round(payoutFirstPlace), Plugin.PLUGIN_NAME, `Winnings from ${this.FullName}`));
            if (!ranking[1].Disqualified)
                chat.alterUserScore(new AlterUserScoreArgs(chat.users.get(ranking[1].id)!, Math.floor(payoutSecondPlace), Plugin.PLUGIN_NAME, `Winnings from ${this.FullName}`));
            if (!ranking[2].Disqualified)
                chat.alterUserScore(new AlterUserScoreArgs(chat.users.get(ranking[2].id)!, Math.floor(payoutThirdPlace), Plugin.PLUGIN_NAME, `Winnings from ${this.FullName}`));
        }
    }

    private findPlayerById(id: number): Player | undefined {
        return this.players.find((player) => player.id === id)
    }

    private sortPlayers(): Player[] {
        return this.players.sort((playerA, playerB) => {
            if (playerA.Disqualified && playerB.Disqualified)
                return 0;
            if (playerA.Disqualified !== playerB.Disqualified) {
                return playerA.Disqualified ? 1 : -1;
            }
            if (playerA.Score === playerB.Score) {
                if (playerA.TieBreakerScore === playerB.TieBreakerScore)
                    return 0;
                else
                    return playerA.TieBreakerScore > playerB.TieBreakerScore ? -1 : 1;
            } else {
                return playerA.Score > playerB.Score ? -1 : 1;
            }
        });
    }

    private formatLeaderboard(playerRanking: Player[]): string {
        return playerRanking.map((player, index) => `${++index}. ${player.ToString()}`).join('\n');
    }

    private setMedals(leaderboard: string): string {
        return leaderboard.replace("1. ", "🥇 ")
            .replace("2. ", "🥈 ")
            .replace("3. ", "🥉 ");
    }

    private hasRoundEnded(): boolean {
        const allPlayersPlayed = this.players.every((player) => player.RoundsPlayed === (this.round + 1) || player.Disqualified);
        if (allPlayersPlayed) {
            this.round++;
            return true;
        }
        return false;
    }
}
