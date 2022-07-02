export class EmojiGameUser {
    private multiplierTimeout: NodeJS.Timeout;

    private consecutiveSpin: number = 0;

    public get ConsecutiveSpin(): number {
        const current = this.consecutiveSpin;
        this.consecutiveSpin = this.consecutiveSpin + 1;
        if (this.consecutiveSpin === 3) {
            this.consecutiveSpin = 0;
        }
        if (this.consecutiveSpin != 0){
            this.startTimeout();
        }

        return current;
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
            this.consecutiveSpin = 0;
        }, 10 * 60 * 1000);
    }
}