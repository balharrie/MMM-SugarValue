import { Config } from "./Config";
import { DexcomApi } from "./dexcom/DexcomApi";
import { DexcomApiResponse } from "./dexcom/DexcomApiResponse";
import { DexcomApiFactory } from "./dexcom/DexcomApiImpl";
import { ModuleNotification } from "./ModuleNotification";
import { NotificationPayload } from "./NotificationPayload";

const NodeHelper = require("node_helper");

interface MagicMirrorNodeHelperApi {
    socketNotificationReceived?(notification: ModuleNotification, payload: NotificationPayload): void;
    sendSocketNotification?(notification: ModuleNotification, payload: NotificationPayload): void;
}

interface ModuleNodeHelper extends MagicMirrorNodeHelperApi {
    _started: boolean;
    _timeoutHandle: any;
    _abortFetch: (() => void) | null;
    fetchData(api: DexcomApi, updateSecs: number): void;
    stop(): void;
    _sendSocketNotification(notification: ModuleNotification, payload: NotificationPayload): void;
}

module.exports = NodeHelper.create({
    _started: false,
    _timeoutHandle: null as any,
    _abortFetch: null as any,
    socketNotificationReceived(notification: ModuleNotification, payload: NotificationPayload) {
        switch (notification) {
            case ModuleNotification.CONFIG:
                if (this._started) {
                    console.log("[MMM-SugarValue] CONFIG received but already started, ignoring");
                    return;
                }
                this._started = true;
                console.log("[MMM-SugarValue] CONFIG received, starting");
                const config: Config | undefined = payload.config;
                if (config !== undefined) {
                    console.log("[MMM-SugarValue] server=%s updateSecs=%d units=%s", config.serverUrl, config.updateSecs, config.units);
                    const api: DexcomApi = DexcomApiFactory(config.serverUrl, config.username, config.password);

                    this._timeoutHandle = setTimeout(() => {
                        this.fetchData(api, config.updateSecs);
                    }, 500);
                } else {
                    console.error("[MMM-SugarValue] CONFIG payload has no config object");
                }
                break;
        }
    },
    stop() {
        this._started = false;
        if (this._timeoutHandle !== null) {
            clearTimeout(this._timeoutHandle);
            this._timeoutHandle = null;
        }
        if (this._abortFetch !== null) {
            this._abortFetch();
            this._abortFetch = null;
        }
    },
    fetchData(api: DexcomApi, updateSecs: number) {
        let settled = false;
        const timeoutMs = 30000;

        const reschedule = () => {
            if (this._started) {
                this._timeoutHandle = setTimeout(() => this.fetchData(api, updateSecs), updateSecs * 1000);
            }
        };

        const timeoutId = setTimeout(() => {
            if (!settled) {
                settled = true;
                this._timeoutHandle = null;
                this._abortFetch = null;
                console.error("[MMM-SugarValue] fetch timed out after %ds", timeoutMs / 1000);
                this._sendSocketNotification(ModuleNotification.DATA, {
                    apiResponse: {
                        error: { statusCode: -1, message: "API request timed out after " + (timeoutMs / 1000) + " seconds" },
                        readings: []
                    }
                });
                reschedule();
            }
        }, timeoutMs);

        // Track the in-flight timeout so stop() can cancel it
        this._timeoutHandle = timeoutId;

        console.log("[MMM-SugarValue] fetching data from Dexcom");
        try {
            const abortRequest = api.fetchData((response: DexcomApiResponse) => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timeoutId);
                    this._timeoutHandle = null;
                    this._abortFetch = null;
                    if (response.error !== undefined) {
                        console.error("[MMM-SugarValue] fetch error status=%d message=%s", response.error.statusCode, response.error.message);
                    } else {
                        console.log("[MMM-SugarValue] fetch ok, readings=%d", response.readings.length);
                    }
                    // Skip notification if stop() was called while the request was in-flight
                    if (this._started) {
                        this._sendSocketNotification(ModuleNotification.DATA, { apiResponse: response });
                    }
                    reschedule();
                }
            }, 1);
            this._abortFetch = abortRequest;
        } catch (error) {
            settled = true;
            clearTimeout(timeoutId);
            this._timeoutHandle = null;
            this._abortFetch = null;
            console.error("[MMM-SugarValue] exception during fetch: %s", error);
            this._sendSocketNotification(ModuleNotification.DATA, {
                apiResponse: {
                    error: { statusCode: -1, message: "Exception in fetchData: " + error },
                    readings: []
                }
            });
            reschedule();
        }
    },
    _sendSocketNotification(notification: ModuleNotification, payload: NotificationPayload): void {
        if (this.sendSocketNotification !== undefined) {
            this.sendSocketNotification(notification, payload);
        } else {
            console.error("sendSocketNotification is not present");
        }
    },
} as ModuleNodeHelper);
