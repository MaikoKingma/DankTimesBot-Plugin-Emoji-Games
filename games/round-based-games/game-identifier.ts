export abstract class GameIdentifier {

    constructor(protected name: string, protected emoji: string[], protected maxRounds: number, protected throwsPerRound = 1, protected stakes: number = 0) {}

    public get FullName(): string {
        return `${this.name} ${this.emoji}`;
    }

    public get EmojiString(): string {
        return this.emoji.length === 1 ? this.emoji[0] : this.emoji.toString();
    }

    public MatchEmoji(emoji: string): boolean {
        return this.emoji.includes(emoji);
    }
}
