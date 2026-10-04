import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { afterEach, describe, it } from 'node:test';
import { ZodError } from 'zod';
import { Freekassa, FreekassaApiError } from '../src';

type SentRequest = {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: Record<string, unknown>;
};

const originalFetch = globalThis.fetch;
let sent: SentRequest[] = [];

// Replace fetch: remember the request and respond with the given status and body
const respondWith = (status: number, payload: unknown): void => {
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
        sent.push({
            url: String(input),
            method: String(init?.method),
            headers: { ...(init?.headers as Record<string, string>) },
            body: JSON.parse(String(init?.body)),
        });
        return new Response(JSON.stringify(payload), {
            status,
            headers: { 'Content-Type': 'application/json' },
        });
    }) as typeof fetch;
};

const last = (): SentRequest => sent[sent.length - 1];

const sdk = new Freekassa({
    key: 'api-key',
    secretWord1: 'secret',
    secretWord2: 'secret2',
    shopId: 777,
    lang: 'ru',
    currency: 'RUB',
});

afterEach(() => {
    globalThis.fetch = originalFetch;
    sent = [];
});

describe('API: transport', () => {
    it('request URL has no double slash', async () => {
        respondWith(200, { type: 'success', balance: [] });
        await sdk.api.account.balance();
        assert.equal(last().url, 'https://api.fk.life/v1/balance');
    });

    it('all requests are sent with POST and a JSON body', async () => {
        respondWith(200, { type: 'success', balance: [] });
        await sdk.api.account.balance();
        assert.equal(last().method, 'POST');
        assert.equal(last().headers['Content-Type'], 'application/json');
    });

    it('nonce is an integer, the HMAC-SHA256 signature follows section 2.2', async () => {
        respondWith(200, { type: 'success', balance: [] });
        await sdk.api.account.balance();
        const { signature, ...signed } = last().body;
        const payload = Object.keys(signed)
            .sort()
            .map((key) => String(signed[key]))
            .join('|');
        assert.equal(typeof signed.nonce, 'number');
        assert.equal(
            signature,
            crypto.createHmac('sha256', 'api-key').update(payload).digest('hex'),
        );
    });

    it('parallel requests get strictly increasing nonce values', async () => {
        respondWith(200, { type: 'success', balance: [] });
        await Promise.all([
            sdk.api.account.balance(),
            sdk.api.account.balance(),
            sdk.api.account.balance(),
        ]);
        const [first, second, third] = sent.map((request) => request.body.nonce as number);
        assert.ok(first < second && second < third);
    });

    it('does not send empty parameters', async () => {
        respondWith(200, { type: 'success', pages: 0, orders: [] });
        await sdk.api.orders.list({});
        assert.deepEqual(Object.keys(last().body).sort(), ['nonce', 'shopId', 'signature']);
    });

    it('HTTP 400 becomes FreekassaApiError with the API error text', async () => {
        respondWith(400, { type: 'error', message: 'bad sign' });
        await assert.rejects(sdk.api.account.balance(), (error: unknown) => {
            assert.ok(error instanceof FreekassaApiError);
            assert.equal(error.status, 400);
            assert.match(error.message, /bad sign/);
            return true;
        });
    });

    it('an error with HTTP 200 (type: error) is thrown too', async () => {
        respondWith(200, { type: 'error', message: 'Order not found' });
        await assert.rejects(sdk.api.orders.list(), FreekassaApiError);
    });
});

describe('API: methods', () => {
    it('order creation works without ip and email and sends neither', async () => {
        respondWith(200, {
            type: 'success',
            orderId: 1,
            orderHash: 'h',
            location: 'https://pay/1',
        });
        await sdk.api.orders.create({ methodId: 4, amount: 100 });
        assert.ok(!('ip' in last().body));
        assert.ok(!('email' in last().body));
        assert.equal(last().body.i, 4);
    });

    it('order creation sends the documented fields and a recurring payment', async () => {
        respondWith(200, {
            type: 'success',
            orderId: 1,
            orderHash: 'h',
            location: 'https://pay.freekassa.net/form/1/h',
            recurrent_order: { id: 555, pay_date_at: '2026-11-04 10:00:00' },
        });
        const order = await sdk.api.orders.create({
            methodId: 6,
            ip: '85.8.8.8',
            email: 'user@site.ru',
            amount: 100 + 0.1,
            paymentId: 'o-1',
            phone: '+79261231212',
            notifyUrl: 'https://site.ru/notify',
            recurrent: { period: 'month', description: 'VPN subscription' },
        });
        const { body } = last();
        assert.equal(last().url, 'https://api.fk.life/v1/orders/create');
        assert.equal(body.i, 6);
        assert.equal(body.currency, 'RUB');
        assert.equal(body.amount, 100.1);
        assert.equal(body.tel, '+79261231212');
        assert.equal(body.notification_url, 'https://site.ru/notify');
        assert.equal(body.recurrent, 'Y');
        assert.equal(body.recurrent_period, 'month');
        assert.equal(body.recurrent_description, 'VPN subscription');
        assert.equal(order.recurrent_order?.id, 555);
    });

    it('the next subscription charge is sent as recurrent_order_id', async () => {
        respondWith(200, { type: 'success', orderId: 2, orderHash: 'h', location: 'x' });
        await sdk.api.orders.create({
            methodId: 6,
            ip: '85.8.8.8',
            email: 'user@site.ru',
            amount: 10,
            paymentId: 'o-2',
            recurrentOrderId: 555,
        });
        assert.equal(last().body.recurrent_order_id, 555);
        assert.equal('recurrent' in last().body, false);
    });

    it('refund requires orderId or paymentId and sends a partial amount', async () => {
        respondWith(200, { type: 'success', id: 42 });
        const refund = await sdk.api.orders.refund({ paymentId: 'o-1', amount: 50 });
        assert.equal(last().url, 'https://api.fk.life/v1/orders/refund');
        assert.equal(last().body.paymentId, 'o-1');
        assert.equal(last().body.orderAmount, 50);
        assert.equal(refund.id, 42);
        await assert.rejects(sdk.api.orders.refund({}), ZodError);
    });

    it('orders filter accepts status "Refund" (6) and page 0', async () => {
        respondWith(200, { type: 'success', pages: 1, orders: [] });
        await sdk.api.orders.list({ status: 6, page: 0 });
        assert.equal(last().body.orderStatus, 6);
        assert.equal(last().body.page, 0);
    });

    it('withdrawal uses the default currency and the payment system ID', async () => {
        respondWith(200, { type: 'success', data: { id: 185 } });
        await sdk.api.withdrawals.create({
            methodId: 4,
            account: '5500000000000004',
            amount: 100.23,
            paymentId: 'w-1',
        });
        assert.equal(last().url, 'https://api.fk.life/v1/withdrawals/create');
        assert.equal(last().body.i, 4);
        assert.equal(last().body.currency, 'RUB');
        assert.equal(last().body.amount, 100.23);
    });

    it('flat methods of version 0.0.x still work', async () => {
        respondWith(200, { type: 'success', balance: [] });
        await sdk.getBalance();
        assert.equal(last().url, 'https://api.fk.life/v1/balance');
    });
});
