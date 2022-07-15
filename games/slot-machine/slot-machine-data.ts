import { SpecialEarnings } from "./slot-machine-scores";

export class SlotMachineData {
    private pot: number = 0;
    private timesBet: number = 0;
    private totalBetAmount: number = 0;
    private totalWon: number = 0;
    private totalLost: number = 0;

    public Win(bet: number, scoreMultiplier: number | SpecialEarnings, payoutMultiplier: number): number {
        const payout = typeof scoreMultiplier === "string" ?
            this.WinPot(bet, scoreMultiplier) :
            ((scoreMultiplier * bet) * payoutMultiplier) - bet;
        this.pot -= payout;
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

    private WinPot(bet: number, multiplier: SpecialEarnings): number {
        const alternativePayout = bet * (multiplier === SpecialEarnings.HalfPot ? 10 : 5);
        if (alternativePayout > this.pot)
            return alternativePayout;
        const payout = Math.round(this.pot * (multiplier === SpecialEarnings.HalfPot ? 0.5 : 0.25));
        const maxPayout = 1000 * bet;
        return payout > maxPayout ? maxPayout : payout;
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