import { DexcomApiError } from "./DexcomApiError";
import { DexcomReading } from "./DexcomReading";

export interface DexcomApiResponse {
    error?: DexcomApiError;
    readings: DexcomReading[];
}
