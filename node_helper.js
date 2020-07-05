(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('request'), require('qs'), require('https')) :
    typeof define === 'function' && define.amd ? define(['request', 'qs', 'https'], factory) :
    (global = global || self, factory(global.request, global.qs, global.https));
}(this, (function (request, qs, https) { 'use strict';

    request = request && request.hasOwnProperty('default') ? request['default'] : request;
    https = https && https.hasOwnProperty('default') ? https['default'] : https;

    var DexcomReadingImpl = /** @class */ (function () {
        function DexcomReadingImpl(raw) {
            var dateMatch = raw.WT.match(/\((.*)\)/);
            this.date = dateMatch === null || dateMatch.length == 0 ? undefined : new Date(parseInt(dateMatch[1]));
            this.sugarMg = raw.Value;
            this.sugarMmol = Math.floor(10 * (raw.Value / 18.0)) / 10;
            this.trend = raw.Trend;
        }
        return DexcomReadingImpl;
    }());

    var DexcomApiImpl = /** @class */ (function () {
        function DexcomApiImpl(server, username, password) {
            this._server = server;
            this._username = username;
            this._password = password;
        }
        DexcomApiImpl.prototype.doPost = function (uri, body, callback) {
            var bodyAsString = body == undefined ? "" : JSON.stringify(body);
            console.log("POST", uri, bodyAsString);
            return request({
                uri: "https://" + uri,
                method: "POST",
                agent: new https.Agent({
                    host: this._server,
                    port: 443,
                    path: '/',
                    rejectUnauthorized: false
                }),
                headers: {
                    'User-Agent': DexcomApiImpl.AGENT,
                    'Content-Type': DexcomApiImpl.CONTENT_TYPE,
                    'Content-Length': bodyAsString == undefined ? 0 : bodyAsString.length,
                    'Accept': DexcomApiImpl.ACCEPT
                },
                body: bodyAsString
            }, callback);
        };
        DexcomApiImpl.prototype.login = function (callback) {
            return this.doPost(this._server + "/ShareWebServices/Services/General/LoginPublisherAccountByName", {
                "accountName": this._username,
                "password": this._password,
                "applicationId": DexcomApiImpl.APPLICATION_ID
            }, callback);
        };
        DexcomApiImpl.prototype.fetchLatest = function (sessionId, maxCount, minutes, callback) {
            return this.doPost(this._server + "/ShareWebServices/Services/Publisher/ReadPublisherLatestGlucoseValues?" + qs.stringify({
                sessionID: sessionId,
                minutes: minutes === undefined ? 1440 : Math.max(1, minutes),
                maxCount: maxCount === undefined ? 1 : Math.max(1, maxCount),
            }), undefined, callback);
        };
        DexcomApiImpl.prototype.fetchData = function (callback, maxCount, minutes) {
            var _this = this;
            this.login(function (error, response, body) {
                console.log(error);
                if (error != null || response.statusCode !== 200) {
                    callback({
                        error: {
                            statusCode: response == undefined ? -1 : response.statusCode,
                            message: "Failed to login"
                        },
                        readings: []
                    });
                }
                else {
                    var sessionId = body.substring(1, body.length - 1);
                    _this.fetchLatest(sessionId, maxCount, minutes, function (_error, _response, body) {
                        if (error != null || response.statusCode !== 200) {
                            callback({
                                error: {
                                    statusCode: response == undefined ? -1 : response.statusCode,
                                    message: "Failed to fetch readings"
                                },
                                readings: []
                            });
                        }
                        else {
                            var rawReadings = JSON.parse(body);
                            callback({
                                error: undefined,
                                readings: rawReadings.map(function (reading) { return new DexcomReadingImpl(reading); })
                            });
                        }
                    });
                }
            });
        };
        DexcomApiImpl.APPLICATION_ID = "d89443d2-327c-4a6f-89e5-496bbb0317db";
        DexcomApiImpl.AGENT = "Dexcom Share/3.0.2.11 CFNetwork/711.2.23 Darwin/14.0.0";
        DexcomApiImpl.CONTENT_TYPE = "application/json";
        DexcomApiImpl.ACCEPT = "application/json";
        return DexcomApiImpl;
    }());
    function DexcomApiFactory(server, username, password) {
        return new DexcomApiImpl(server, username, password);
    }

    var ModuleNotification;
    (function (ModuleNotification) {
        ModuleNotification["CONFIG"] = "CONFIG";
        ModuleNotification["DATA"] = "DATA";
        ModuleNotification["ALL_MODULES_STARTED"] = "ALL_MODULES_STARTED";
    })(ModuleNotification || (ModuleNotification = {}));

    var NodeHelper = require("node_helper");
    module.exports = NodeHelper.create({
        socketNotificationReceived: function (notification, payload) {
            var _this = this;
            switch (notification) {
                case ModuleNotification.CONFIG:
                    var config_1 = payload.config;
                    if (config_1 !== undefined) {
                        var api_1 = DexcomApiFactory(config_1.serverUrl, config_1.username, config_1.password);
                        setTimeout(function () {
                            _this.fetchData(api_1, config_1.updateSecs);
                        }, 500);
                    }
                    break;
            }
        },
        // stop: () => {
        //     stopped = true;
        // },
        fetchData: function (api, updateSecs) {
            var _this = this;
            api.fetchData(function (response) {
                _this._sendSocketNotification(ModuleNotification.DATA, { apiResponse: response });
                setTimeout(function () {
                    _this.fetchData(api, updateSecs);
                }, updateSecs * 1000);
            }, 1);
        },
        _sendSocketNotification: function (notification, payload) {
            console.log("Sending", notification, payload);
            if (this.sendSocketNotification !== undefined) {
                this.sendSocketNotification(notification, payload);
            }
            else {
                console.error("sendSocketNotification is not present");
            }
        },
    });

})));
