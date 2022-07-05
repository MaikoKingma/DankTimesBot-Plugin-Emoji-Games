import * as fs from "fs";
import { SlotMachineData } from "./games/slot-machine/slot-machine-data";

export class FileIOHelper {


    private readonly dtbDataFolder = "./data/";
    private readonly emojiGameDataFolder = "emoji-games/";
    private readonly dataFilename = "slot-machine-data-";

    constructor(
        private readonly loadDataFromFile: <T>(fileName: string) => T | null,
        private readonly saveDataToFile: <T>(fileName: string, data: any) => void) {
            if (!fs.existsSync(this.dtbDataFolder + this.emojiGameDataFolder)) {
                fs.mkdirSync(this.dtbDataFolder + this.emojiGameDataFolder);
            }
        }

    public PersistSlotMachineData(data: Map<number, SlotMachineData>): void {
        const chatIds = Array.from(data.keys());
        for (const chatId of chatIds) {
            this.saveDataToFile<SlotMachineData>(this.getSlotMachineDataFileName(chatId), data.get(chatId));
        }
    }

    public GetSlotMachineData(chatId: number): SlotMachineData {
        const data = new SlotMachineData();
        let json = this.loadDataFromFile<SlotMachineData>(this.getSlotMachineDataFileName(chatId));
        if (json)
            Object.assign(data, json);
        return data;
    }

    private getSlotMachineDataFileName(chatId: number) {
        return `${this.emojiGameDataFolder}${this.dataFilename}${chatId}.json`;
    }
}
