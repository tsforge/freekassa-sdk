import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ZodError } from 'zod';
import { Freekassa } from '../src';

const config = {
    key: 'api-key',
    secretWord1: 'secret',
    secretWord2: 'secret2',
    shopId: 777,
    lang: 'ru',
    currency: 'RUB',
} as const;

describe('config validation', () => {
    it('empty keys, a fractional shopId and URLs without a scheme are rejected', () => {
        assert.throws(() => new Freekassa({ ...config, key: '' }), ZodError);
        assert.throws(() => new Freekassa({ ...config, secretWord1: '' }), ZodError);
        assert.throws(() => new Freekassa({ ...config, shopId: 7.5 }), ZodError);
        assert.throws(() => new Freekassa({ ...config, payUrl: 'pay.fk.money' }), ZodError);
        assert.throws(() => new Freekassa({ ...config, apiUrl: 'api.fk.life/v1' }), ZodError);
    });
});

describe('request validation', () => {
    const sdk = new Freekassa(config);

    it('an empty paymentId and a fractional methodId do not create a link', () => {
        assert.throws(() => sdk.sci.createPaymentLink({ amount: 10, paymentId: '' }), ZodError);
        assert.throws(
            () => sdk.sci.createPaymentLink({ amount: 10, paymentId: 'o-1', methodId: 4.5 }),
            ZodError,
        );
    });

    it('an invalid custom key error names the required prefix', () => {
        assert.throws(
            () =>
                sdk.sci.createPaymentLink({ amount: 10, paymentId: 'o-1', custom: { login: 'x' } }),
            (error: unknown) => {
                assert.ok(error instanceof ZodError);
                assert.match(error.issues[0].message, /us_/);
                return true;
            },
        );
    });

    it('an empty paymentId is not sent in an order', async () => {
        await assert.rejects(
            sdk.api.orders.create({
                methodId: 4,
                ip: '1.2.3.4',
                email: 'a@b.ru',
                amount: 10,
                paymentId: '',
            }),
            ZodError,
        );
    });
});
