import request from "request";
import * as qs from "qs";
import https from "https";
import { DexcomApi } from "./DexcomApi";
import { DexcomApiCallback } from "./DexcomApiCallback";
import { DexcomRawReading } from "./DexcomRawReading";
import { DexcomReadingImpl } from "./DexcomReadingImpl";

interface LoginRequestBody {
    accountName: string;
    password: string;
    applicationId: string;
}

interface FetchDataQueryParams {
    sessionID: string;
    minutes: number;
    maxCount: number;
}

class DexcomApiImpl implements DexcomApi {
    private readonly _server: string;
    private readonly _username: string;
    private readonly _password: string;

    private static readonly APPLICATION_ID: string = "d89443d2-327c-4a6f-89e5-496bbb0317db";
    private static readonly AGENT: string = "Dexcom Share/3.0.2.11 CFNetwork/711.2.23 Darwin/14.0.0";
    private static readonly CONTENT_TYPE: string = "application/json";
    private static readonly ACCEPT: string = "application/json";

    constructor(server: string, username: string, password: string) {
        this._server = server;
        this._username = username;
        this._password = password;
    }

    private doPost(uri: string, body: any, callback?: request.RequestCallback): request.Request {
        let bodyAsString: string = body == undefined ? "" : JSON.stringify(body);
        return request(
            {
                uri: "https://" + uri,
                method: "POST",
                timeout: 20000,
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
            },
            callback
        );
    }

    private authenticate(callback: (error: any, accountId: string | null) => void): request.Request {
        return this.doPost(
            this._server + "/ShareWebServices/Services/General/AuthenticatePublisherAccount",
            {
                "accountName": this._username,
                "password": this._password,
                "applicationId": DexcomApiImpl.APPLICATION_ID
            },
            (error: any, response: request.Response, body: any) => {
                if (error != null || response.statusCode !== 200) {
                    callback(error != null ? error : new Error("AuthenticatePublisherAccount HTTP " + (response ? response.statusCode : "no-response")), null);
                } else {
                    const accountId: string = (body as string).substring(1, (body as string).length - 1);
                    callback(null, accountId);
                }
            }
        );
    }

    private loginById(accountId: string, callback: (error: any, sessionId: string | null) => void): request.Request {
        return this.doPost(
            this._server + "/ShareWebServices/Services/General/LoginPublisherAccountById",
            {
                "accountId": accountId,
                "password": this._password,
                "applicationId": DexcomApiImpl.APPLICATION_ID
            },
            (error: any, response: request.Response, body: any) => {
                if (error != null || response.statusCode !== 200) {
                    callback(error != null ? error : new Error("LoginPublisherAccountById HTTP " + (response ? response.statusCode : "no-response")), null);
                } else {
                    const sessionId: string = (body as string).substring(1, (body as string).length - 1);
                    callback(null, sessionId);
                }
            }
        );
    }

    private fetchLatest(sessionId: string, maxCount?: number, minutes?: number, callback?: request.RequestCallback): request.Request {
        return this.doPost(
            this._server + "/ShareWebServices/Services/Publisher/ReadPublisherLatestGlucoseValues?"  + qs.stringify(
                {
                    sessionID: sessionId,
                    minutes: minutes === undefined ? 1440 : Math.max(1, minutes),
                    maxCount: maxCount === undefined ? 1 : Math.max(1, maxCount),
                } as FetchDataQueryParams
            ),
            undefined,
            callback
        );
    }

    public fetchData(callback: DexcomApiCallback, maxCount?: number, minutes?: number): () => void {
        // activeRequest is reassigned as the two-step chain progresses (login → fetchLatest),
        // so the returned abort closure always cancels whichever request is currently in-flight.
        console.log("[MMM-SugarValue] step 1: authenticating with %s", this._server);
        let activeRequest: request.Request = this.authenticate((authError: any, accountId: string | null) => {
            if (authError || accountId === null) {
                console.error("[MMM-SugarValue] authenticate failed: %s", authError);
                callback({ error: { statusCode: -1, message: "Authenticate fail: " + authError }, readings: [] });
                return;
            }
            console.log("[MMM-SugarValue] step 2: logging in (accountId length=%d)", accountId.length);
            activeRequest = this.loginById(accountId, (loginError: any, sessionId: string | null) => {
                if (loginError || sessionId === null) {
                    console.error("[MMM-SugarValue] loginById failed: %s", loginError);
                    callback({ error: { statusCode: -1, message: "Login fail: " + loginError }, readings: [] });
                    return;
                }
                console.log("[MMM-SugarValue] step 3: fetching readings (sessionId length=%d)", sessionId.length);
                activeRequest = this.fetchLatest(sessionId, maxCount, minutes, (_error: any, _response: request.Response, body: any) => {
                    if (_error != null || _response.statusCode !== 200) {
                        console.error("[MMM-SugarValue] fetchLatest failed status=%s error=%s",
                            _response == undefined ? "no-response" : _response.statusCode, _error);
                        callback({
                            error: {
                                statusCode: _response == undefined ? -1 : _response.statusCode,
                                message: "Fetch readings fail: " + (_error == undefined ? "" : _error)
                            },
                            readings: []
                        });
                    } else {
                        if (!body) {
                            console.log("[MMM-SugarValue] empty body — no readings available");
                            callback({ error: undefined, readings: [] });
                            return;
                        }
                        let rawReadings: DexcomRawReading[];
                        try {
                            rawReadings = JSON.parse(body);
                        } catch (parseError) {
                            console.error("[MMM-SugarValue] JSON parse failed: %s body=%s", parseError, body);
                            callback({
                                error: { statusCode: _response.statusCode, message: "Failed to parse readings: " + parseError },
                                readings: []
                            });
                            return;
                        }
                        console.log("[MMM-SugarValue] got %d reading(s)", rawReadings.length);
                        callback({
                            error: undefined,
                            readings: rawReadings.map(reading => new DexcomReadingImpl(reading))
                        });
                    }
                });
            });
        });
        return () => activeRequest.abort();
    }
}

export function DexcomApiFactory(server: string, username: string, password: string): DexcomApi {
    return new DexcomApiImpl(server, username, password);
}
