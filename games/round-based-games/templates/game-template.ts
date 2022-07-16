import { GameIdentifier } from "../game-identifier";
import { RoundBasedGame } from "../round-based-game";

export abstract class GameTemplate extends GameIdentifier {

    public IdentifyGame(msg: string): boolean {
        msg = msg.toLocaleLowerCase();
        return (msg === this.name.toLocaleLowerCase() || this.MatchEmoji(msg) || msg === this.FullName.toLocaleLowerCase());
    }

    public abstract Customize(rounds: number, stakes?: number): GameTemplate;

    public abstract NewGame(): RoundBasedGame;

    public GetInfo(): string {
        return `<b>${this.FullName.replace(" ", "</b> ")}\n\n`
            + `Shoot by posting the ${this.emoji} emoji. After ${this.maxRounds} rounds the player with the highest score wins.`;
    }
}