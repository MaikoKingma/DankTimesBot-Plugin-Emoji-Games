export class SlotMachineData {
    public Pot: number = 0;
    public TimesBet: number = 0;
    public TotalBetAmount: number = 0;
    public TotalWon: number = 0;
    public TotalLost: number = 0;

    public WinPot(bet: number): number {
        let payout = this.Pot;
        const maxPayout = 1000 * bet;
        if (payout > maxPayout) {
            payout = maxPayout;
            this.Pot = this.Pot - maxPayout;
        } else {
            this.Pot = 0;
        }
        this.updateStats(bet, payout);
        return payout;
    }

    public Win(bet: number, scoreMultiplier: number, payoutMultiplier: number): number {
        this.Pot += bet;
        const payout = ((scoreMultiplier * bet) * payoutMultiplier) - bet;
        this.updateStats(bet, payout);
        return payout;
    }

    public Print(): string {
        return `🎰 <b>Slot Machine Stats</b> 🎰\n\n`
            + `Pot: ${this.Pot}\n`
            + `Times Bet: ${this.TimesBet}\n`
            + `Total Bet Amount: ${this.TotalBetAmount}\n`
            + `Total Won: ${this.TotalWon}\n`
            + `Total Lost: ${this.TotalLost * -1}`;
    }

    private updateStats(bet: number, payout: number) {
        this.TimesBet++;
        this.TotalBetAmount += bet;
        if (payout > 0)
            this.TotalWon += payout;
        else 
            this.TotalLost += payout;
    }
}