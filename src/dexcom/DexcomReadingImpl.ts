import { DexcomRawReading } from "./DexcomRawReading";
import { DexcomReading } from "./DexcomReading";
import { DexcomTrend } from "./DexcomTrend";

const TREND_ENUM_MAP: { [key: string]: DexcomTrend } = {
    "0": DexcomTrend.NONE,
    "1": DexcomTrend.DOUBLE_UP,
    "2": DexcomTrend.SINGLE_UP,
    "3": DexcomTrend.FORTYFIVE_UP,
    "4": DexcomTrend.FLAT,
    "5": DexcomTrend.FORTYFIVE_DOWN,
    "6": DexcomTrend.SINGLE_DOWN,
    "7": DexcomTrend.DOUBLE_DOWN,
    "8": DexcomTrend.NOT_COMPUTABLE,
    "9": DexcomTrend.RATE_OUT_OF_RANGE,
    'NONE': DexcomTrend.NONE,
    'DOUBLEUP': DexcomTrend.DOUBLE_UP,
    'SINGLEUP': DexcomTrend.SINGLE_UP,
    'FORTYFIVEUP': DexcomTrend.FORTYFIVE_UP,
    'FLAT': DexcomTrend.FLAT,
    'FORTYFIVEDOWN': DexcomTrend.FORTYFIVE_DOWN,
    'SINGLEDOWN': DexcomTrend.SINGLE_DOWN,
    'DOUBLEDOWN': DexcomTrend.DOUBLE_DOWN,
    'NOT COMPUTABLE': DexcomTrend.NOT_COMPUTABLE,
    'RATE OUT OF RANGE': DexcomTrend.RATE_OUT_OF_RANGE
}

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
        this.trend = DexcomReadingImpl.convertTrend(raw.Trend);
    }

    private static convertTrend(trend: string | number): DexcomTrend {
        return trend === undefined ? DexcomTrend.NONE : TREND_ENUM_MAP[trend.toString().toUpperCase()];
    }
}
