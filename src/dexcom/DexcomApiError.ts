/**
 * Describes the error while accessing Dexcom
 */
export interface DexcomApiError {
    /**
     * HTTP error code or -1 if not available.
     */
    statusCode: number;

    /**
     * Message that could be displayed to the user
     */
    message: string;
}
