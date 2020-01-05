(function () {
    'use strict';

    var DexcomTrend;
    (function (DexcomTrend) {
        DexcomTrend[DexcomTrend["NONE"] = 0] = "NONE";
        DexcomTrend[DexcomTrend["DOUBLE_UP"] = 1] = "DOUBLE_UP";
        DexcomTrend[DexcomTrend["SINGLE_UP"] = 2] = "SINGLE_UP";
        DexcomTrend[DexcomTrend["FORTYFIVE_UP"] = 3] = "FORTYFIVE_UP";
        DexcomTrend[DexcomTrend["FLAT"] = 4] = "FLAT";
        DexcomTrend[DexcomTrend["FORTYFIVE_DOWN"] = 5] = "FORTYFIVE_DOWN";
        DexcomTrend[DexcomTrend["SINGLE_DOWN"] = 6] = "SINGLE_DOWN";
        DexcomTrend[DexcomTrend["DOUBLE_DOWN"] = 7] = "DOUBLE_DOWN";
        DexcomTrend[DexcomTrend["NOT_COMPUTABLE"] = 8] = "NOT_COMPUTABLE";
        DexcomTrend[DexcomTrend["RATE_OUT_OF_RANGE"] = 9] = "RATE_OUT_OF_RANGE";
    })(DexcomTrend || (DexcomTrend = {}));

    var ModuleNotification;
    (function (ModuleNotification) {
        ModuleNotification["CONFIG"] = "CONFIG";
        ModuleNotification["DATA"] = "DATA";
        ModuleNotification["ALL_MODULES_STARTED"] = "ALL_MODULES_STARTED";
    })(ModuleNotification || (ModuleNotification = {}));

    Module.register("MMM-SugarValue", {
        defaults: {
            "usServerUrl": "https://share1.dexcom.com",
            "euServerUrl": "https://shareous1.dexcom.com",
            "server": "us",
            "updateSecs": 300,
            "units": "mmol"
        },
        message: "Loading...",
        reading: undefined,
        getDom: function () {
            var wrapper = document.createElement("div");
            if (this.message !== undefined) {
                wrapper.innerText = this.message;
            }
            else if (this.reading == undefined) {
                wrapper.innerText = "Reading not available";
            }
            else if (this.config !== undefined) {
                var reading = document.createElement("div");
                var date = document.createElement("div");
                if (this.reading.date !== undefined) {
                    date.innerText = this.reading.date.toLocaleString();
                    date.className = "dimmed small";
                }
                var sugar = document.createElement("span");
                var units = document.createElement("span");
                sugar.className = "bright medium";
                units.className = "dimmed small";
                if (this.config.units === "mg") {
                    sugar.innerText = this.reading.sugarMl.toString();
                    units.innerText = " mg/dl";
                }
                else {
                    sugar.innerText = this.reading.sugarMl.toString();
                    units.innerText = " mmol/l";
                }
                var trend = document.createElement("span");
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
        start: function () {
            console.log("Starting");
            var config = this.config;
            if (config == undefined) {
                this.message = "Configuration is not defined";
            }
            else {
                config.serverUrl = config.server === "us" ? config.usServerUrl : config.euServerUrl;
                if (config.username === undefined || config.password === undefined) {
                    this.message = "Username or password not configured";
                }
                else {
                    this.message = this.message;
                }
            }
            this._updateDom();
        },
        notificationReceived: function (notification, payload, sender) {
            if (notification === "ALL_MODULES_STARTED") {
                this._sendSocketNotification(ModuleNotification.CONFIG, { config: this.config });
            }
        },
        socketNotificationReceived: function (notification, payload) {
            console.log(notification, payload);
            if (notification === ModuleNotification.DATA) {
                var apiResponse = payload.apiResponse;
                if (apiResponse !== undefined) {
                    if (apiResponse.error !== undefined) {
                        this.message = apiResponse.error.message + ":" + apiResponse.error.statusCode;
                    }
                    else {
                        this.reading = apiResponse.readings.length > 0 ? apiResponse.readings[0] : undefined;
                        this.message = undefined;
                    }
                    this._updateDom();
                }
            }
        },
        _sendSocketNotification: function (notification, payload) {
            if (this.sendSocketNotification !== undefined) {
                this.sendSocketNotification(notification, payload);
            }
            else {
                console.error("sendSocketNotification is not present");
            }
        },
        _updateDom: function () {
            if (this.updateDom !== undefined) {
                this.updateDom();
            }
        }
    });

}());
