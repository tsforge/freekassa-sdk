import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';
import { ZodError } from 'zod';
import { Freekassa, NOTIFICATION_ACK } from '../src';

const md5 = (value: string): string => crypto.createHash('md5').update(value).digest('hex');

const sdk = new Freekassa({
    key: 'api-key',
    secretWord1: 'secret',
    secretWord2: 'secret2',
    shopId: 7012,
    lang: 'ru',
    currency: 'RUB',
});

describe('SCI: payment form', () => {
    it('the signature matches the example in section 1.5 of the documentation', () => {
        assert.equal(sdk.sci.signForm(100.11, '154', 'RUB'), md5('7012:100.11:secret:RUB:154'));
    });

    it('the link contains the documented parameters and the signature', () => {
        const url = new URL(
            sdk.sci.createPaymentLink({
                amount: 100.11,
                paymentId: '154',
                methodId: 4,
                email: 'a@b.ru',
            }),
        );
        assert.equal(`${url.origin}${url.pathname}`, 'https://pay.fk.money/');
        assert.equal(url.searchParams.get('m'), '7012');
        assert.equal(url.searchParams.get('oa'), '100.11');
        assert.equal(url.searchParams.get('currency'), 'RUB');
        assert.equal(url.searchParams.get('o'), '154');
        assert.equal(url.searchParams.get('i'), '4');
        assert.equal(url.searchParams.get('em'), 'a@b.ru');
        assert.equal(url.searchParams.get('lang'), 'ru');
        assert.equal(url.searchParams.get('s'), md5('7012:100.11:secret:RUB:154'));
        assert.equal(url.searchParams.has('success_url'), false);
    });

    it('the amount is rounded to cents and the signature uses the same amount as the link', () => {
        const url = new URL(sdk.sci.createPaymentLink({ amount: 0.1 + 0.2, paymentId: 'o-1' }));
        assert.equal(url.searchParams.get('oa'), '0.3');
        assert.equal(url.searchParams.get('s'), md5('7012:0.3:secret:RUB:o-1'));
    });

    it('passes us_* fields and rejects invalid keys and values', () => {
        const url = new URL(
            sdk.sci.createPaymentLink({
                amount: 10,
                paymentId: 'o-2',
                custom: { us_login: 'ivanov-1' },
            }),
        );
        assert.equal(url.searchParams.get('us_login'), 'ivanov-1');
        assert.throws(
            () =>
                sdk.sci.createPaymentLink({ amount: 10, paymentId: 'o-2', custom: { login: 'x' } }),
            ZodError,
        );
        assert.throws(
            () =>
                sdk.sci.createPaymentLink({
                    amount: 10,
                    paymentId: 'o-2',
                    custom: { us_login: 'a b' },
                }),
            ZodError,
        );
    });
});

describe('SCI: payment notification', () => {
    const notification = {
        MERCHANT_ID: '7012',
        AMOUNT: '100.11',
        MERCHANT_ORDER_ID: '154',
        SIGN: md5('7012:100.11:secret2:154'),
    };

    it('accepts the md5("MERCHANT_ID:AMOUNT:secretWord2:MERCHANT_ORDER_ID") signature', () => {
        assert.equal(sdk.sci.verifyNotification(notification), true);
    });

    it('rejects a changed amount, a signature made with secretWord1 and incomplete data without throwing', () => {
        assert.equal(sdk.sci.verifyNotification({ ...notification, AMOUNT: '999' }), false);
        assert.equal(
            sdk.sci.verifyNotification({ ...notification, SIGN: md5('7012:100.11:secret:154') }),
            false,
        );
        assert.equal(sdk.sci.verifyNotification({ MERCHANT_ID: '7012' }), false);
        assert.equal(sdk.sci.verifyNotification(undefined), false);
    });

    it('checks the sender IP and knows the YES reply', () => {
        assert.equal(sdk.sci.isNotificationIp('168.119.157.136'), true);
        assert.equal(sdk.sci.isNotificationIp('8.8.8.8'), false);
        assert.equal(NOTIFICATION_ACK, 'YES');
    });
});
