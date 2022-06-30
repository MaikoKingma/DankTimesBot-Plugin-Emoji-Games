export class SlotMachineScore {
    constructor(public values: string[], public payout: number = 0) {}
}

export class WinningCombination {
    constructor(private value: string, public payoutMultiplier: number = -1, private amount: number = 3) {}

    public isMatch(score: SlotMachineScore): boolean {
        return score.values.filter((scoreValue) => scoreValue === this.value).length === this.amount;
    }
}
export class SlotMachine {
    private static readonly BAR: string = "bar";
    private static readonly SEVEN: string = "7";
    private static readonly LEMON: string = "lemon";
    private static readonly GRAPE: string = "grape";

    private static readonly WINNING_COMBINATIONS: WinningCombination[] = [
        new WinningCombination(SlotMachine.BAR),
        new WinningCombination(SlotMachine.SEVEN, 2),
        new WinningCombination(SlotMachine.LEMON, 1),
        new WinningCombination(SlotMachine.GRAPE, 1),
        new WinningCombination(SlotMachine.GRAPE, 0.5, 2),
        new WinningCombination(SlotMachine.GRAPE, 0.25, 1)
    ];

    private static readonly SCORES: SlotMachineScore[] = [
        new SlotMachineScore([SlotMachine.BAR, SlotMachine.BAR, SlotMachine.BAR]),
        new SlotMachineScore([SlotMachine.GRAPE, SlotMachine.BAR, SlotMachine.BAR]),
        new SlotMachineScore([SlotMachine.LEMON, SlotMachine.BAR, SlotMachine.BAR]),
        new SlotMachineScore([SlotMachine.SEVEN, SlotMachine.BAR, SlotMachine.BAR]),
        new SlotMachineScore([SlotMachine.BAR, SlotMachine.GRAPE, SlotMachine.BAR]),
        new SlotMachineScore([SlotMachine.GRAPE, SlotMachine.GRAPE, SlotMachine.BAR]),
        new SlotMachineScore([SlotMachine.LEMON, SlotMachine.GRAPE, SlotMachine.BAR]),
        new SlotMachineScore([SlotMachine.SEVEN, SlotMachine.GRAPE, SlotMachine.BAR]),
        new SlotMachineScore([SlotMachine.BAR, SlotMachine.LEMON, SlotMachine.BAR]),
        new SlotMachineScore([SlotMachine.GRAPE, SlotMachine.LEMON, SlotMachine.BAR]),
        new SlotMachineScore([SlotMachine.LEMON, SlotMachine.LEMON, SlotMachine.BAR]),
        new SlotMachineScore([SlotMachine.SEVEN, SlotMachine.LEMON, SlotMachine.BAR]),
        new SlotMachineScore([SlotMachine.BAR, SlotMachine.SEVEN, SlotMachine.BAR]),
        new SlotMachineScore([SlotMachine.GRAPE, SlotMachine.SEVEN, SlotMachine.BAR]),
        new SlotMachineScore([SlotMachine.LEMON, SlotMachine.SEVEN, SlotMachine.BAR]),
        new SlotMachineScore([SlotMachine.SEVEN, SlotMachine.SEVEN, SlotMachine.BAR]),
        new SlotMachineScore([SlotMachine.BAR, SlotMachine.BAR, SlotMachine.GRAPE]),
        new SlotMachineScore([SlotMachine.GRAPE, SlotMachine.BAR, SlotMachine.GRAPE]),
        new SlotMachineScore([SlotMachine.LEMON, SlotMachine.BAR, SlotMachine.GRAPE]),
        new SlotMachineScore([SlotMachine.SEVEN, SlotMachine.BAR, SlotMachine.GRAPE]),
        new SlotMachineScore([SlotMachine.BAR, SlotMachine.GRAPE, SlotMachine.GRAPE]),
        new SlotMachineScore([SlotMachine.GRAPE, SlotMachine.GRAPE, SlotMachine.GRAPE]),
        new SlotMachineScore([SlotMachine.LEMON, SlotMachine.GRAPE, SlotMachine.GRAPE]),
        new SlotMachineScore([SlotMachine.SEVEN, SlotMachine.GRAPE, SlotMachine.GRAPE]),
        new SlotMachineScore([SlotMachine.BAR, SlotMachine.LEMON, SlotMachine.GRAPE]),
        new SlotMachineScore([SlotMachine.GRAPE, SlotMachine.LEMON, SlotMachine.GRAPE]),
        new SlotMachineScore([SlotMachine.LEMON, SlotMachine.LEMON, SlotMachine.GRAPE]),
        new SlotMachineScore([SlotMachine.SEVEN, SlotMachine.LEMON, SlotMachine.GRAPE]),
        new SlotMachineScore([SlotMachine.BAR, SlotMachine.SEVEN, SlotMachine.GRAPE]),
        new SlotMachineScore([SlotMachine.GRAPE, SlotMachine.SEVEN, SlotMachine.GRAPE]),
        new SlotMachineScore([SlotMachine.LEMON, SlotMachine.SEVEN, SlotMachine.GRAPE]),
        new SlotMachineScore([SlotMachine.SEVEN, SlotMachine.SEVEN, SlotMachine.GRAPE]),
        new SlotMachineScore([SlotMachine.BAR, SlotMachine.BAR, SlotMachine.LEMON]),
        new SlotMachineScore([SlotMachine.GRAPE, SlotMachine.BAR, SlotMachine.LEMON]),
        new SlotMachineScore([SlotMachine.LEMON, SlotMachine.BAR, SlotMachine.LEMON]),
        new SlotMachineScore([SlotMachine.SEVEN, SlotMachine.BAR, SlotMachine.LEMON]),
        new SlotMachineScore([SlotMachine.BAR, SlotMachine.GRAPE, SlotMachine.LEMON]),
        new SlotMachineScore([SlotMachine.GRAPE, SlotMachine.GRAPE, SlotMachine.LEMON]),
        new SlotMachineScore([SlotMachine.LEMON, SlotMachine.GRAPE, SlotMachine.LEMON]),
        new SlotMachineScore([SlotMachine.SEVEN, SlotMachine.GRAPE, SlotMachine.LEMON]),
        new SlotMachineScore([SlotMachine.BAR, SlotMachine.LEMON, SlotMachine.LEMON]),
        new SlotMachineScore([SlotMachine.GRAPE, SlotMachine.LEMON, SlotMachine.LEMON]),
        new SlotMachineScore([SlotMachine.LEMON, SlotMachine.LEMON, SlotMachine.LEMON]),
        new SlotMachineScore([SlotMachine.SEVEN, SlotMachine.LEMON, SlotMachine.LEMON]),
        new SlotMachineScore([SlotMachine.BAR, SlotMachine.SEVEN, SlotMachine.LEMON]),
        new SlotMachineScore([SlotMachine.GRAPE, SlotMachine.SEVEN, SlotMachine.LEMON]),
        new SlotMachineScore([SlotMachine.LEMON, SlotMachine.SEVEN, SlotMachine.LEMON]),
        new SlotMachineScore([SlotMachine.SEVEN, SlotMachine.SEVEN, SlotMachine.LEMON]),
        new SlotMachineScore([SlotMachine.BAR, SlotMachine.BAR, SlotMachine.SEVEN]),
        new SlotMachineScore([SlotMachine.GRAPE, SlotMachine.BAR, SlotMachine.SEVEN]),
        new SlotMachineScore([SlotMachine.LEMON, SlotMachine.BAR, SlotMachine.SEVEN]),
        new SlotMachineScore([SlotMachine.SEVEN, SlotMachine.BAR, SlotMachine.SEVEN]),
        new SlotMachineScore([SlotMachine.BAR, SlotMachine.GRAPE, SlotMachine.SEVEN]),
        new SlotMachineScore([SlotMachine.GRAPE, SlotMachine.GRAPE, SlotMachine.SEVEN]),
        new SlotMachineScore([SlotMachine.LEMON, SlotMachine.GRAPE, SlotMachine.SEVEN]),
        new SlotMachineScore([SlotMachine.SEVEN, SlotMachine.GRAPE, SlotMachine.SEVEN]),
        new SlotMachineScore([SlotMachine.BAR, SlotMachine.LEMON, SlotMachine.SEVEN]),
        new SlotMachineScore([SlotMachine.GRAPE, SlotMachine.LEMON, SlotMachine.SEVEN]),
        new SlotMachineScore([SlotMachine.LEMON, SlotMachine.LEMON, SlotMachine.SEVEN]),
        new SlotMachineScore([SlotMachine.SEVEN, SlotMachine.LEMON, SlotMachine.SEVEN]),
        new SlotMachineScore([SlotMachine.BAR, SlotMachine.SEVEN, SlotMachine.SEVEN]),
        new SlotMachineScore([SlotMachine.GRAPE, SlotMachine.SEVEN, SlotMachine.SEVEN]),
        new SlotMachineScore([SlotMachine.LEMON, SlotMachine.SEVEN, SlotMachine.SEVEN]),
        new SlotMachineScore([SlotMachine.SEVEN, SlotMachine.SEVEN, SlotMachine.SEVEN])
    ];

    public static Spin(diceValue: number): number {
        const score = this.SCORES[diceValue - 1];
        const winnings = this.WINNING_COMBINATIONS.find((combination => combination.isMatch(score)));
        return winnings ? winnings.payoutMultiplier : 0;
    }
}
