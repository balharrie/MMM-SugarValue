import { DexcomReading, DexcomTrend, DexcomApiResponse } from "./dexcom";
import { Config } from "./Config";
import { NotificationPayload } from "./NotificationPayload";
import { ModuleNotification } from "./ModuleNotification";

interface MagicMirrorApi {
    config?: Config;
    updateDom?(): void;
    notificationReceived?(notification: string, payload: any, sender: any): void;
    socketNotificationReceived?(notification: ModuleNotification, payload: NotificationPayload): void;
    sendSocketNotification?(notification: ModuleNotification, payload: NotificationPayload): void;
}

interface MagicMirrorOptions extends MagicMirrorApi {
    defaults: Config;
    message: string | undefined;
    reading: DexcomReading | undefined;

    getDom: () => HTMLDivElement;
    start: () => void;
    _sendSocketNotification(notification: string, payload: NotificationPayload): void;
    _updateDom(): void;
}

interface MagicMirrorModule {
    register(name: string, options: MagicMirrorOptions): void;
}

declare var Module: MagicMirrorModule;

Module.register("MMM-SugarValue", {
    defaults: {
        "usServerUrl": "https://share1.dexcom.com",
        "euServerUrl": "https://shareous1.dexcom.com",
        "server": "us",
        "updateSecs": 300,
        "units": "mmol"
    } as Config,
    message: "Loading...",
    reading: undefined,
    getDom(): HTMLDivElement {
        const wrapper: HTMLDivElement = document.createElement("div");
        if (this.message !== undefined) {
            wrapper.innerText = this.message;
        } else if (this.reading == undefined) {
            wrapper.innerText = "Reading not available";
        } else if (this.config !== undefined) {
            const reading: HTMLDivElement = document.createElement("div");
            const date: HTMLDivElement = document.createElement("div");

            if (this.reading.date !== undefined) {
                date.innerText = this.reading.date.toLocaleString();
                date.className = "dimmed small";
            }

            const sugar: HTMLSpanElement = document.createElement("span");
            const units: HTMLSpanElement = document.createElement("span");
            sugar.className = "bright medium";
            units.className = "dimmed small";
            if (this.config.units === "mg") {
                sugar.innerText = this.reading.sugarMl.toString();
                units.innerText = " mg/dl";
            } else {
                sugar.innerText = this.reading.sugarMl.toString();
                units.innerText = " mmol/l";
            }

            const trend: HTMLSpanElement = document.createElement("span");
            trend.className = "dimmed medium";
            trend.className = "fa fa-fw ";

            switch (this.reading.trend) {
                case DexcomTrend.DOUBLE_DOWN:
                    trend.className += "fa-angle-double-down";
                    break;
                case DexcomTrend.DOUBLE_UP:
                    trend.className += "fa-angle-double-up";
                    break;
                case DexcomTrend.FLAT:
                    trend.className += "fa-angle-right";
                    break;
                case DexcomTrend.FORTYFIVE_DOWN:
                    trend.className += "fa-location-arrow fa-rotate-90";
                    break;
                case DexcomTrend.FORTYFIVE_UP:
                    trend.className += "fa-location-arrow";
                    break;
                case DexcomTrend.NONE:
                    break;
                case DexcomTrend.NOT_COMPUTABLE:
                    trend.className += "fa-question-circle";
                    break;
                case DexcomTrend.RATE_OUT_OF_RANGE:
                    trend.className += "fa-exclamation-triangle";
                    break;
                case DexcomTrend.SINGLE_DOWN:
                    trend.className += "fa-angle-down";
                    break;
                case DexcomTrend.SINGLE_UP:
                    trend.className += "fa-angle-up";
                    break;
            }

            reading.appendChild(trend);
            reading.appendChild(sugar);
            reading.appendChild(units);
            wrapper.appendChild(reading);
            wrapper.appendChild(date);
        }
        return wrapper;
    },
    start():void {
        console.log("Starting");
        const config: Config | undefined = this.config;
        if (config == undefined) {
            this.message = "Configuration is not defined";
        } else {
            config.serverUrl = config.server === "us" ? config.usServerUrl : config.euServerUrl;
            if (config.username === undefined || config.password === undefined) {
                this.message = "Username or password not configured";
            } else {
                this.message = this.message;
            }
        }
        this._updateDom();
    },
    notificationReceived(notification: string, payload: any, sender: any): void {
        if (notification === "ALL_MODULES_STARTED") {
            this._sendSocketNotification(ModuleNotification.CONFIG, { config: this.config } );
        }
    },
    socketNotificationReceived(notification: ModuleNotification, payload: NotificationPayload): void {
        console.log(notification, payload);
        if (notification === ModuleNotification.DATA) {
            const apiResponse: DexcomApiResponse | undefined = payload.apiResponse;
            if (apiResponse !== undefined) {
                if (apiResponse.error !== undefined) {
                    this.message = apiResponse.error.message + ":" + apiResponse.error.statusCode;
                } else {
                    this.reading = apiResponse.readings.length > 0 ? apiResponse.readings[0] : undefined;
                    this.message = undefined;
                }
                this._updateDom();
            }
        }
    },
    _sendSocketNotification(notification: ModuleNotification, payload: NotificationPayload): void {
        if (this.sendSocketNotification !== undefined) {
            this.sendSocketNotification(notification, payload);
        } else {
            console.error("sendSocketNotification is not present");
        }
    },
    _updateDom(): void {
        if (this.updateDom !== undefined) {
            this.updateDom();
        }
    }
});

