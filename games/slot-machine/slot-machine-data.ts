import { SpecialEarnings } from "./slot-machine-scores";

export class SlotMachineData {
    public Pot: number = 0;
    public TimesBet: number = 0;
    public TotalBetAmount: number = 0;
    public TotalWon: number = 0;
    public TotalLost: number = 0;

    public Win(bet: number, scoreMultiplier: number | SpecialEarnings, payoutMultiplier: number): number {
        const payout = typeof scoreMultiplier === "string" ?
            this.WinPot(bet, scoreMultiplier) :
            Math.round(((scoreMultiplier * bet) * payoutMultiplier) - bet);
        this.Pot -= payout;
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

    private WinPot(bet: number, multiplier: SpecialEarnings): number {
        const alternativePayout = bet * (multiplier === SpecialEarnings.HalfPot ? 10 : 5);
        const payout = Math.round(this.Pot * (multiplier === SpecialEarnings.HalfPot ? 0.5 : 0.25));
        if (alternativePayout > payout)
            return alternativePayout;
        const maxPayout = 1000 * bet;
        return payout > maxPayout ? maxPayout : payout;
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