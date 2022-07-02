export class SlotMachineData {
    private pot: number = 0;
    private timesBet: number = 0;
    private totalBetAmount: number = 0;
    private totalWon: number = 0;
    private totalLost: number = 0;

    public WinPot(bet: number): number {
        let payout = this.pot;
        const maxPayout = 1000 * bet;
        if (payout > maxPayout) {
            payout = maxPayout;
            this.pot = this.pot - maxPayout;
        } else {
            this.pot = 0;
        }
        this.updateStats(bet, payout);
        return payout;
    }

    public Win(bet: number, scoreMultiplier: number, payoutMultiplier: number): number {
        this.pot += bet;
        const payout = ((scoreMultiplier * bet) * payoutMultiplier) - bet;
        this.updateStats(bet, payout);
        return payout;
    }

    public ToString(): string {
        return `🎰 <b>Slot Machine Stats</b> 🎰\n\n`
            + `Pot: ${this.pot}\n`
            + `Times Bet: ${this.timesBet}\n`
            + `Total Bet Amount: ${this.totalBetAmount}\n`
            + `Total Won: ${this.totalWon}\n`
            + `Total Lost: ${this.totalLost * -1}`;
    }

    private updateStats(bet: number, payout: number) {
        this.timesBet++;
        this.totalBetAmount += bet;
        if (payout > 0)
            this.totalWon += payout;
        else 
            this.totalLost += payout;
    }
}