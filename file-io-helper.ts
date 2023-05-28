import { SlotMachineData } from "./games/slot-machine/slot-machine-data";

export class FileIOHelper {

    private readonly emojiGameDataFolder = "emoji-games/";
    private readonly dataFilename = "slot-machine-data-";

    constructor(
        private readonly loadDataFromFile: <T>(fileName: string) => T | null,
        private readonly saveDataToFile: <T>(fileName: string, data: any) => void) { }

    public PersistSlotMachineData(data: Map<number, SlotMachineData>): void {
        const chatIds = Array.from(data.keys());
        for (const chatId of chatIds) {
            this.saveDataToFile<SlotMachineData>(this.getSlotMachineDataFileName(chatId), data.get(chatId));
        }
    }

    public GetSlotMachineData(chatId: number): SlotMachineData {
        const data = new SlotMachineData();
        const json = this.loadDataFromFile<SlotMachineData>(this.getSlotMachineDataFileName(chatId));
        if (json)
            Object.assign(data, json);
        return data;
    }

    public ResetSlotMachineData(chatId: number): void {
        const data = new SlotMachineData();
        this.saveDataToFile<SlotMachineData>(this.getSlotMachineDataFileName(chatId), data);
    }

    private getSlotMachineDataFileName(chatId: number) {
        return `${this.emojiGameDataFolder}${this.dataFilename}${chatId}.json`;
    }
}
