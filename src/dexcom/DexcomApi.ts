import { DexcomApiCallback } from "./DexcomApiCallback";

export interface DexcomApi {
    fetchData(callback: DexcomApiCallback, maxCount?: number, minutes?: number): void;
}
