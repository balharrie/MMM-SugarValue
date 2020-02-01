import { DexcomReading, DexcomTrend, DexcomApiResponse } from "./dexcom";
import { Config } from "./Config";
import { NotificationPayload } from "./NotificationPayload";
import { ModuleNotification } from "./ModuleNotification";
import moment from 'moment';

interface MagicMirrorApi {
    config?: Config;
    getStyles?(): string[],
    updateDom?(): void;
    notificationReceived?(notification: string, payload: any, sender: any): void;
    socketNotificationReceived?(notification: ModuleNotification, payload: NotificationPayload): void;
    sendSocketNotification?(notification: ModuleNotification, payload: NotificationPayload): void;
}

interface MagicMirrorOptions extends MagicMirrorApi {
    defaults: Config;
    message: string | undefined;
    reading: DexcomReading | undefined;
    clockSpan: HTMLSpanElement | undefined;

    getDom: () => HTMLDivElement;
    start: () => void;
    _sendSocketNotification(notification: string, payload: NotificationPayload): void;
    _updateDom(): void;
    _createIcon(className: string): HTMLSpanElement;
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
    getStyles(): string[] {
        return[ 'sugarvalue.css' ]
    },
    message: "Loading...",
    reading: undefined,
    clockSpan: undefined,
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
                date.innerText = moment(this.reading.date).fromNow();
                date.className = "dimmed small";
            }

            const sugar: HTMLSpanElement = document.createElement("span");
            const units: HTMLSpanElement = document.createElement("span");
            sugar.className = "bright medium";
            units.className = "dimmed small";
            let sugarValue: number;
            if (this.config.units === "mg") {
                sugarValue = this.reading.sugarMg;
                sugar.innerText = this.reading.sugarMg.toString();
                units.innerText = " mg/dL";
            } else {
                sugarValue = this.reading.sugarMmol;
                sugar.innerText = this.reading.sugarMmol.toString();
                units.innerText = " mmol/L";
            }

            if (this.config.lowlimit !== undefined && sugarValue <= this.config.lowlimit) {
                sugar.className += " text-danger";
            }

            if (this.config.highlimit !== undefined && sugarValue >= this.config.highlimit) {
                sugar.className += " text-warning";
            }

            const trend: HTMLSpanElement = document.createElement("span");
            trend.className = "small";

            switch (this.reading.trend) {
                case DexcomTrend.DOUBLE_DOWN:
                    trend.appendChild(this._createIcon("fa-arrow-down"));
                    trend.appendChild(this._createIcon("fa-arrow-down"));
                    trend.className += " text-warning";
                    break;
                case DexcomTrend.DOUBLE_UP:
                    trend.appendChild(this._createIcon("fa-arrow-up"));
                    trend.appendChild(this._createIcon("fa-arrow-up"));
                    trend.className += " text-warning";
                    break;
                case DexcomTrend.FLAT:
                    trend.appendChild(this._createIcon("fa-arrow-right"));
                    break;
                case DexcomTrend.FORTYFIVE_DOWN:
                    trend.appendChild(this._createIcon("fa-arrow-right fa-rotate-45"));
                    break;
                case DexcomTrend.FORTYFIVE_UP:
                    trend.appendChild(this._createIcon("fa-arrow-up fa-rotate-45"));
                    break;
                case DexcomTrend.NONE:
                    break;
                case DexcomTrend.NOT_COMPUTABLE:
                    trend.appendChild(this._createIcon("fa-question-circle"));
                    break;
                case DexcomTrend.RATE_OUT_OF_RANGE:
                    trend.appendChild(this._createIcon("fa-exclamation-triangle"));
                    break;
                case DexcomTrend.SINGLE_DOWN:
                    trend.appendChild(this._createIcon("fa-arrow-down"));
                    break;
                case DexcomTrend.SINGLE_UP:
                    trend.appendChild(this._createIcon("fa-arrow-up"));
                    break;
            }

            reading.appendChild(trend);
            reading.appendChild(sugar);
            reading.appendChild(units);
            wrapper.appendChild(reading);
            wrapper.appendChild(date);
            this.clockSpan = date;
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
        setInterval(() => {
            if (this.clockSpan !== undefined && this.reading !== undefined && this.reading.date !== undefined) {
                this.clockSpan.textContent = moment(this.reading.date).fromNow();
            }
        }, 30000);
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
    },
    _createIcon(className: string): HTMLSpanElement {
        const icon:HTMLSpanElement = document.createElement("span");
        icon.className = "fa fa-fw " + className;
        return icon;
    }
});

