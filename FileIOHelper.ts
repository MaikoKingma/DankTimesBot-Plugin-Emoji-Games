import { SlotMachineData } from "./games/slot-machine/slot-machine-data";
import { Plugin } from "./plugin";

export class FileIOHelper {

    private static readonly SLOT_MACHINE_DATA_FILENAME = "slot-machine-data.json";

    private slotMachineData: Map<number, SlotMachineData>;

    constructor(
        private readonly loadDataFromFile: <T>(fileName: string) => T | null,
        private readonly saveDataToFile: <T>(fileName: string, data: any) => void) {}

    public PersistSlotMachineData(data: Map<number, SlotMachineData>): void {
        this.saveDataToFile<Map<number, SlotMachineData>>(FileIOHelper.SLOT_MACHINE_DATA_FILENAME, data);
    }

    public GetSlotMachineData(chatId: number): SlotMachineData {
        let data = this.slotMachineData.get(chatId);
        return data ? data : new SlotMachineData();
    }

    public LoadSlotMachineData() {
        let data = this.loadDataFromFile<Map<number, SlotMachineData>>(FileIOHelper.SLOT_MACHINE_DATA_FILENAME);
        if (!data)
            data = new Map<number, SlotMachineData>();
        this.slotMachineData = data;
    }
}