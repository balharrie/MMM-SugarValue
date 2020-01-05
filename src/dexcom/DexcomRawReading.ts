/*
[ { DT: '/Date(1426292016000-0700)/',
    ST: '/Date(1426295616000)/',
    Trend: 4,
    Value: 101,
    WT: '/Date(1426292039000)/' } ]
*/
export interface DexcomRawReading {
    DT: string;
    ST: string;
    Trend: number;
    Value: number;
    WT: string;
}
