import { DexcomTrend } from "./DexcomTrend";

export interface DexcomReading {
    sugar: number;
    sugarMl: number;
    date: Date | undefined;
    trend: DexcomTrend;
}
