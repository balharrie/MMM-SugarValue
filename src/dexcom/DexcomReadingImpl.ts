import { DexcomRawReading } from "./DexcomRawReading";
import { DexcomReading } from "./DexcomReading";
import { DexcomTrend } from "./DexcomTrend";

export class DexcomReadingImpl implements DexcomReading {
    sugarMg: number;
    sugarMmol: number;
    date: Date | undefined;
    trend: DexcomTrend;

    constructor(raw: DexcomRawReading) {
        const dateMatch: RegExpMatchArray | null = raw.WT.match(/\((.*)\)/);
        this.date = dateMatch === null || dateMatch.length == 0 ? undefined : new Date(parseInt(dateMatch[1])); 
        this.sugarMg = raw.Value;
        this.sugarMmol = Math.floor(10 * (raw.Value / 18.0)) / 10;
        this.trend = raw.Trend as DexcomTrend;
    }
}
