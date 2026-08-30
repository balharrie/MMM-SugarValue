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
    fetchData(api: DexcomApi, updateSecs: number): void;
    stop(): void;
    _sendSocketNotification(notification: ModuleNotification, payload: NotificationPayload): void;
}

module.exports = NodeHelper.create({
    _started: false,
    _timeoutHandle: null as any,
    socketNotificationReceived(notification: ModuleNotification, payload: NotificationPayload) {
        switch (notification) {
            case ModuleNotification.CONFIG:
                if (this._started) return;
                this._started = true;
                const config: Config | undefined = payload.config;
                if (config !== undefined) {
                    const api: DexcomApi = DexcomApiFactory(config.serverUrl, config.username, config.password);

                    this._timeoutHandle = setTimeout(() => {
                        this.fetchData(api, config.updateSecs);
                    }, 500);
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
    },
    fetchData(api: DexcomApi, updateSecs: number) {
        api.fetchData((response: DexcomApiResponse) => {
            this._sendSocketNotification(ModuleNotification.DATA, { apiResponse: response });
            this._timeoutHandle = setTimeout(() => {
                this.fetchData(api, updateSecs);
            }, updateSecs * 1000);
        }, 1);
    },
    _sendSocketNotification(notification: ModuleNotification, payload: NotificationPayload): void {
        if (this.sendSocketNotification !== undefined) {
            this.sendSocketNotification(notification, payload);
        } else {
            console.error("sendSocketNotification is not present");
        }
    },
} as ModuleNodeHelper);
