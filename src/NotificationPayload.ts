import { Config } from "./Config";
import { DexcomApiResponse } from "./dexcom";

export interface NotificationPayload {
    config?: Config;
    apiResponse?: DexcomApiResponse;
}
