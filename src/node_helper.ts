import { Config } from "./config";
import { DexcomApi, DexcomApiResponse } from "./dexcom";
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
        api.fetchData((response: DexcomApiResponse) => {
            this._sendSocketNotification(ModuleNotification.DATA, { apiResponse: response });
            setTimeout(() => {
                this.fetchData(api, updateSecs);
            }, updateSecs * 1000);
        }, 1);
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
