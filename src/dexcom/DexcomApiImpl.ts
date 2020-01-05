import request from "request";
import * as qs from "qs";
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
                uri: uri,
                method: "POST",
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

    private login(callback?: request.RequestCallback): request.Request {
        return this.doPost(
            this._server + "/ShareWebServices/Services/General/LoginPublisherAccountByName",
            {
                "accountName": this._username,
                "password": this._password,
                "applicationId": DexcomApiImpl.APPLICATION_ID
            } as LoginRequestBody,
            callback
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

    public fetchData(callback: DexcomApiCallback, maxCount?: number, minutes?: number): void {
        this.login((error: any, response: request.Response, body: any) => {
            if (error != null || response.statusCode !== 200) {
                callback({
                    error: {
                        statusCode: response == undefined ? -1 : response.statusCode,
                        message: "Failed to login"
                    },
                    readings: []
                });
            } else {
                let sessionId: string = (body as string).substring(1, (body as string).length - 1)
                this.fetchLatest(sessionId, maxCount, minutes, (_error: any, _response: request.Response, body: any) => {
                    if (error != null || response.statusCode !== 200) {
                        callback({
                            error: {
                                statusCode: response == undefined ? -1 : response.statusCode,
                                message: "Failed to fetch readings"
                            },
                            readings: []
                        });
                    } else {
                        const rawReadings: DexcomRawReading[] = JSON.parse(body);
                        callback({
                            error: undefined,
                            readings: rawReadings.map(reading => new DexcomReadingImpl(reading))
                        });
                    }
                });
            }
        });
    }
}

export function DexcomApiFactory(server: string, username: string, password: string): DexcomApi {
    return new DexcomApiImpl(server, username, password);
}
