import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { Freekassa } from '../src';

// Request parameters from the docs.freekassa.net specification: [type, required]
// shopId, nonce and signature are in every request, so they are described separately
type Kind = 'integer' | 'numeric' | 'string';
type Param = [Kind, boolean];

const COMMON: Record<string, Param> = {
    shopId: ['integer', true],
    nonce: ['integer', true],
    signature: ['string', true],
};

const CONTRACT: Record<string, Record<string, Param>> = {
    '/orders': {
        orderId: ['integer', false],
        paymentId: ['string', false],
        orderStatus: ['integer', false],
        dateFrom: ['string', false],
        dateTo: ['string', false],
        page: ['integer', false],
    },
    '/orders/create': {
        paymentId: ['string', false],
        i: ['integer', true],
        email: ['string', true],
        ip: ['string', true],
        amount: ['numeric', true],
        currency: ['string', true],
        tel: ['string', false],
        success_url: ['string', false],
        failure_url: ['string', false],
        notification_url: ['string', false],
        recurrent: ['string', false],
        recurrent_period: ['string', false],
        recurrent_description: ['string', false],
        recurrent_order_id: ['numeric', false],
    },
    '/orders/refund': {
        orderId: ['integer', false],
        paymentId: ['string', false],
        orderAmount: ['numeric', false],
    },
    '/withdrawals': {
        orderId: ['integer', false],
        paymentId: ['string', false],
        orderStatus: ['integer', false],
        dateFrom: ['string', false],
        dateTo: ['string', false],
        page: ['integer', false],
    },
    '/withdrawals/create': {
        paymentId: ['string', false],
        i: ['integer', true],
        account: ['string', true],
        amount: ['numeric', true],
        currency: ['string', true],
    },
    '/balance': {},
    '/currencies': {},
    '/currencies/{id}/status': {},
    '/withdrawals/currencies': {},
    '/shops': {},
};

const matches = (kind: Kind, value: unknown): boolean => {
    if (kind === 'string') return typeof value === 'string';
    if (kind === 'integer') return Number.isInteger(value);
    return typeof value === 'number';
};

// No extra parameters, types match, required parameters are sent.
// full: all parameters are sent, so the SDK can send every documented parameter
const checkContract = (endpoint: string, body: Record<string, unknown>, full: boolean): void => {
    const contract = { ...COMMON, ...CONTRACT[endpoint] };
    const sentKeys = Object.keys(body).filter((key) => key !== 'signature');
    for (const key of sentKeys) {
        assert.ok(
            key in contract,
            `${endpoint}: parameter ${key} is not described in the documentation`,
        );
        assert.ok(
            matches(contract[key][0], body[key]),
            `${endpoint}: ${key} must be ${contract[key][0]}`,
        );
    }
    for (const [key, [, required]] of Object.entries(contract)) {
        if (required) {
            assert.ok(key in body, `${endpoint}: required parameter ${key} is not sent`);
        }
    }
    if (full) {
        const documented = Object.keys(contract).filter((key) => key !== 'signature');
        assert.deepEqual(
            sentKeys.sort(),
            documented.sort(),
            `${endpoint}: not all parameters are sent`,
        );
    }
};

const originalFetch = globalThis.fetch;
let sentBodies: Record<string, unknown>[] = [];

// Calls the SDK and returns the body of the request that was sent to the API
const bodyOf = async (call: () => Promise<unknown>): Promise<Record<string, unknown>> => {
    sentBodies = [];
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
        sentBodies.push(JSON.parse(String(init?.body)));
        return new Response(JSON.stringify({ type: 'success' }), { status: 200 });
    }) as typeof fetch;
    await call();
    return sentBodies[0];
};

afterEach(() => {
    globalThis.fetch = originalFetch;
});

const sdk = new Freekassa({
    key: 'api-key',
    secretWord1: 'secret',
    secretWord2: 'secret2',
    shopId: 777,
    lang: 'ru',
    currency: 'RUB',
});

const cases: [string, () => Promise<unknown>, boolean][] = [
    [
        '/orders',
        () =>
            sdk.api.orders.list({
                orderId: 1,
                paymentId: 'p',
                status: 1,
                dateFrom: '2024-01-01 00:00:00',
                dateTo: '2024-02-01 00:00:00',
                page: 0,
            }),
        true,
    ],
    [
        '/orders/create',
        () =>
            sdk.api.orders.create({
                methodId: 6,
                ip: '1.2.3.4',
                email: 'a@b.ru',
                amount: 10,
                paymentId: 'p',
                currency: 'USD',
                phone: '+79001234567',
                successUrl: 'https://a/s',
                failUrl: 'https://a/f',
                notifyUrl: 'https://a/n',
                recurrent: { period: 'month', description: 'VPN subscription' },
                recurrentOrderId: 5,
            }),
        true,
    ],
    [
        '/orders/create',
        () => sdk.api.orders.create({ methodId: 6, ip: '1.2.3.4', email: 'a@b.ru', amount: 10 }),
        false,
    ],
    [
        '/orders/refund',
        () => sdk.api.orders.refund({ orderId: 1, paymentId: 'p', amount: 5 }),
        true,
    ],
    [
        '/withdrawals',
        () =>
            sdk.api.withdrawals.list({
                orderId: 1,
                paymentId: 'p',
                status: 1,
                dateFrom: 'a',
                dateTo: 'b',
                page: 0,
            }),
        true,
    ],
    [
        '/withdrawals/create',
        () =>
            sdk.api.withdrawals.create({
                methodId: 4,
                account: '5500000000000004',
                amount: 10,
                paymentId: 'p',
                currency: 'EUR',
            }),
        true,
    ],
    [
        '/withdrawals/create',
        () => sdk.api.withdrawals.create({ methodId: 4, account: '5500000000000004', amount: 10 }),
        false,
    ],
    ['/balance', () => sdk.api.account.balance(), true],
    ['/currencies', () => sdk.api.currencies.list(), true],
    ['/currencies/{id}/status', () => sdk.api.currencies.status(4), true],
    ['/withdrawals/currencies', () => sdk.api.withdrawals.currencies(), true],
    ['/shops', () => sdk.api.account.shops(), true],
];

describe('API contract: parameters and types as in the specification', () => {
    for (const [endpoint, call, full] of cases) {
        it(`${endpoint} ${full ? '(all parameters)' : '(minimum)'}`, async () => {
            checkContract(endpoint, await bodyOf(call), full);
        });
    }
});

describe('SCI contract: payment form parameters as in section 1.3', () => {
    it('the link contains only documented parameters', () => {
        const url = new URL(
            sdk.sci.createPaymentLink({
                amount: 10,
                paymentId: 'p',
                methodId: 4,
                email: 'a@b.ru',
                phone: '+79001234567',
                currency: 'USD',
                lang: 'en',
                custom: { us_login: 'a1' },
            }),
        );
        const documented = ['m', 'oa', 'currency', 'o', 's', 'i', 'phone', 'em', 'lang'];
        for (const key of url.searchParams.keys()) {
            assert.ok(
                documented.includes(key) || /^us_[A-Za-z0-9]+$/.test(key),
                `parameter ${key} is not described in the form`,
            );
        }
        for (const key of ['m', 'oa', 'currency', 'o', 's']) {
            assert.ok(url.searchParams.has(key), `required parameter ${key} is not sent`);
        }
    });
});
