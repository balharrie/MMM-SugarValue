import { DexcomTrend } from "./DexcomTrend";

export interface DexcomReading {
    sugarMg: number;
    sugarMmol: number;
    date: Date | undefined;
    trend: DexcomTrend;
}
