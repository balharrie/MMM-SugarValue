import { DexcomApiResponse } from "./DexcomApiResponse";

/**
 * Callback used by the API to return the results.
 */
export type DexcomApiCallback = (response: DexcomApiResponse) => void;