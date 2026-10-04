import { isErrorPayload, isObject, parseBody, withoutUndefined } from '../common';
import { hmacSha256Hex } from '../core';
import { IApiClientOptions, IApiRequestBody } from '../interfaces';
import { CONTENT_TYPE, HTTP_HEADER, HTTP_METHOD, SIGNATURE_SEPARATOR } from './api';
import { FreekassaApiError } from './errors';

export type ApiParams = Record<string, string | number | undefined>;

const REQUEST_TIMEOUT_MS = 30_000;

// The nonce must strictly increase, so it never repeats, even for parallel requests
let lastNonce = 0;
const nextNonce = (): number => {
    lastNonce = Math.max(Date.now(), lastNonce + 1);
    return lastNonce;
};

// API transport: adds shopId and nonce, signs the request and parses the response
export class ApiClient {
    private readonly baseUrl: string;

    constructor(private readonly options: IApiClientOptions) {
        this.baseUrl = options.apiUrl.replace(/\/+$/, '');
    }

    public async request<T>(endpoint: string, params: ApiParams = {}): Promise<T> {
        const body: IApiRequestBody = {
            ...withoutUndefined(params),
            shopId: this.options.shopId,
            nonce: nextNonce(),
        };
        body.signature = this.sign(body);

        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            method: HTTP_METHOD.POST,
            headers: { [HTTP_HEADER.CONTENT_TYPE]: CONTENT_TYPE.JSON },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        const text = await res.text();
        const data = parseBody<T>(text);
        if (!res.ok || !data || isErrorPayload(data)) {
            const reason = isObject(data) && typeof data.message === 'string' ? data.message : text;
            throw new FreekassaApiError(
                `Freekassa API error (HTTP ${res.status}): ${reason}`,
                res.status,
                data,
            );
        }
        return data;
    }

    // Parameter values ordered by key name, joined with the separator, signed with HMAC-SHA256 using the API key
    private sign(body: IApiRequestBody): string {
        const payload = Object.keys(body)
            .sort()
            .map((key) => String(body[key]))
            .join(SIGNATURE_SEPARATOR);
        return hmacSha256Hex(this.options.key, payload);
    }
}
