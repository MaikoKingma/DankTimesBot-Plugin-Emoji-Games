export class EmojiGameUser {
    private multiplierTimeout: NodeJS.Timeout;

    private winningsMultiplier:number = 1;

    public get WinningsMultiplier(): number {
        const currentMultiplier = this.winningsMultiplier;
        if (this.winningsMultiplier === 1)
            this.winningsMultiplier = 2;
        else if (this.winningsMultiplier === 2)
            this.winningsMultiplier = 4;
        else if (this.winningsMultiplier === 4)
            this.winningsMultiplier = 1;
        if (this.winningsMultiplier !== 1) {
            this.startTimeout();
        }
        return currentMultiplier;
    }

    constructor(public Id: number, private name: string, public Bet: number) {}

    public ToString(): string {
        return `${this.name} : ${this.Bet}`;
    }

    private startTimeout() {
        if (this.multiplierTimeout) {
            clearTimeout(this.multiplierTimeout);
        }
        this.multiplierTimeout = setTimeout(() => {
            this.winningsMultiplier = 1;
        }, 10 * 60 * 1000);
    }
}