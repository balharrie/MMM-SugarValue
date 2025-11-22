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
    fetchData(api: DexcomApi, updateSecs: number): void;
    _sendSocketNotification(notification: ModuleNotification, payload: NotificationPayload): void;
}

module.exports = NodeHelper.create({
    socketNotificationReceived(notification: ModuleNotification, payload: NotificationPayload) {
        switch (notification) {
            case ModuleNotification.CONFIG:
                const config: Config | undefined = payload.config;
                if (config !== undefined) {
                    const api: DexcomApi = DexcomApiFactory(config.serverUrl, config.username, config.password);

                    setTimeout(() => {
                        this.fetchData(api, config.updateSecs);
                    }, 500);
                }
                break;
        }
    },
    // stop: () => {
    //     stopped = true;
    // },
    fetchData(api: DexcomApi, updateSecs: number) {
        let callbackInvoked = false;
        const timeoutMs = 30000; // 30 second timeout for API call

        // Set timeout to detect if API call gets stuck
        const timeoutId = setTimeout(() => {
            if (!callbackInvoked) {
                console.error("Dexcom API call timed out after", timeoutMs, "ms");
                this._sendSocketNotification(ModuleNotification.DATA, {
                    apiResponse: {
                        error: {
                            statusCode: -1,
                            message: "API request timed out after " + (timeoutMs / 1000) + " seconds"
                        },
                        readings: []
                    }
                });
            }
        }, timeoutMs);

        // Attempt to fetch data
        try {
            api.fetchData((response: DexcomApiResponse) => {
                callbackInvoked = true;
                clearTimeout(timeoutId);
                this._sendSocketNotification(ModuleNotification.DATA, { apiResponse: response });
            }, 1);
        } catch (error) {
            console.error("Exception in fetchData:", error);
            clearTimeout(timeoutId);
            this._sendSocketNotification(ModuleNotification.DATA, {
                apiResponse: {
                    error: {
                        statusCode: -1,
                        message: "Exception in fetchData: " + error
                    },
                    readings: []
                }
            });
        }

        // Always schedule next poll, regardless of success/failure
        setTimeout(() => {
            this.fetchData(api, updateSecs);
        }, updateSecs * 1000);
    },
    _sendSocketNotification(notification: ModuleNotification, payload: NotificationPayload): void {
        console.log("Sending", notification, payload);
        if (this.sendSocketNotification !== undefined) {
            this.sendSocketNotification(notification, payload);
        } else {
            console.error("sendSocketNotification is not present");
        }
    },
} as ModuleNodeHelper);
