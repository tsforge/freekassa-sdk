**English** | [Русский](./README.ru.md)

<p align="center">
  <img src="https://i.postimg.cc/NMM7H75M/kassa.png" alt="freekassa-sdk" width="100%">
</p>

# freekassa-sdk

## Install

```bash
npm i @exact-team/freekassa-sdk
```

Requirements: **Node.js 20+** (the SDK uses native `fetch` and `AbortSignal.timeout`), TypeScript 5.0+ if you write TypeScript.

The SDK runs on the server only: signatures are computed with secret keys, so they must never reach the browser.

![GitHub top language](https://img.shields.io/github/languages/top/exact01/freekassa-sdk)
![GitHub Repo stars](https://img.shields.io/github/stars/exact01/freekassa-sdk)

![npm version](https://img.shields.io/npm/v/%40exact-team%2Ffreekassa-sdk)
![GitHub Tag](https://img.shields.io/github/v/tag/exact01/freekassa-sdk)

![Build Status](https://img.shields.io/github/actions/workflow/status/exact01/freekassa-sdk/.github/workflows/ci.yml)
![License](https://img.shields.io/npm/l/%40exact-team%2Ffreekassa-sdk)
![NPM Last Update](https://img.shields.io/npm/last-update/%40exact-team%2Ffreekassa-sdk)

![Downloads per week](https://img.shields.io/npm/dw/%40exact-team%2Ffreekassa-sdk?label=downloads%2Fweek)
![Downloads per month](https://img.shields.io/npm/dm/%40exact-team%2Ffreekassa-sdk?label=downloads%2Fmonth)
![Total downloads](https://img.shields.io/npm/dt/%40exact-team%2Ffreekassa-sdk?label=total%20downloads)

![Known Vulnerabilities](https://snyk.io/test/github/exact01/freekassa-sdk/badge.svg)
![Coverage Status](https://img.shields.io/codecov/c/github/exact01/freekassa-sdk)

Type-safe Node.js / TypeScript SDK for the [FreeKassa](https://freekassa.net) payment system: the payment form (SCI), payment notifications and the REST API — orders, refunds, recurring payments, withdrawals, balance, payment systems and shops.

> **Version 0.x: the API may change between minor versions.** Pin an exact version in `package.json`. The SDK is checked against a mock transport and the official FreeKassa OpenAPI specification, but it has not been validated against the live API under load. Report issues on [GitHub Issues](https://github.com/exact01/freekassa-sdk/issues).

Parameter names, signatures (MD5 for the form and notifications, HMAC-SHA256 for the API), endpoint paths and JSON request bodies match the [FreeKassa documentation](https://docs.freekassa.net). See [Coverage of the official docs](#coverage-of-the-official-docs) for what is implemented.

---

## Table of contents

- [Install](#install)
- [NestJS](#nestjs)
- [Why this SDK](#why-this-sdk)
- [Get your credentials](#get-your-credentials)
- [Quick start](#quick-start)
- [Recipe: accept a payment end-to-end](#recipe-accept-a-payment-end-to-end)
- [Payment form (SCI)](#payment-form-sci)
- [REST API](#rest-api)
- [Recurring payments](#recurring-payments)
- [Withdrawals](#withdrawals)
- [Statuses and constants](#statuses-and-constants)
- [Notifications](#notifications)
- [Error handling](#error-handling)
- [Configuration](#configuration)
- [Coverage of the official docs](#coverage-of-the-official-docs)
- [Deprecated methods](#deprecated-methods)
- [Using modules separately](#using-modules-separately)
- [Retries, timeouts and idempotency](#retries-timeouts-and-idempotency)
- [Architecture](#architecture)
- [Exports map](#exports-map)
- [TypeScript notes](#typescript-notes)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [Release](#release)
- [License](#license)

---

## NestJS

There is a separate wrapper for NestJS: [freekassa-sdk-nestjs](https://github.com/exact01/freekassa-sdk-nestjs).

## Why this SDK

- **One entry point.** `Freekassa` gives you the payment form (`sdk.sci`) and the REST API (`sdk.api`).
- **Validation before sending.** Inputs are checked with `zod`: an empty `paymentId`, a fractional ID, an amount that is not greater than zero, or a bad `us_*` field throws a `ZodError` before any request is made.
- **The SDK signs requests.** Requests are signed with HMAC-SHA256 and the `nonce` strictly increases. Notification signatures are compared in constant time (`crypto.timingSafeEqual`).
- **camelCase in your code.** You write `paymentId`, `successUrl`, `methodId`; the SDK maps them to the names from the documentation (`o`, `success_url`, `i`).
- **Constants instead of magic strings.** Statuses, payment systems, currencies, languages and recurring periods: `ORDER_STATUS.PAID`, `PAYMENT_METHOD.SBP`, `CURRENCY.RUB`, `LANG.ru`, `RECURRENT_PERIOD.MONTH`.
- **Modules on their own.** `FreekassaSCI` and `FreekassaApi` can be created separately.
- **Strict TypeScript.** Request and response types are inferred from the schemas, no `any`.

### Side-by-side: a raw request vs the SDK

Creating an order by hand means computing the signature, building the JSON and parsing the response yourself:

```ts
import crypto from 'node:crypto';

const body: Record<string, string | number> = {
  shopId: 777,
  nonce: Date.now(),
  i: 4, // PAYMENT_METHOD.VISA_RUB
  ip: '203.0.113.10',
  email: 'customer@example.com',
  amount: 1000,
  currency: 'RUB', // CURRENCY.RUB
  paymentId: 'order-1',
};
const payload = Object.keys(body)
  .sort()
  .map((key) => String(body[key]))
  .join('|');
const signature = crypto.createHmac('sha256', API_KEY).update(payload).digest('hex');

const res = await fetch('https://api.fk.life/v1/orders/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...body, signature }),
});
const data = await res.json(); // no type checks, no error mapping
```

The same with the SDK:

```ts
import { PAYMENT_METHOD } from '@exact-team/freekassa-sdk';

const order = await sdk.api.orders.create({
  methodId: PAYMENT_METHOD.VISA_RUB,
  ip: '203.0.113.10',
  email: 'customer@example.com',
  amount: 1000,
  paymentId: 'order-1',
});
```

## Get your credentials

The values come from the [FreeKassa merchant account](https://merchant.freekassa.net/settings), on the shop settings page:

- **Shop ID** (`shopId`) — a number shown in your merchant account.
- **API key** (`key`) — used for REST API requests.
- **Secret word** (`secretWord1`) — signs the payment form.
- **Secret word 2** (`secretWord2`) — verifies payment notifications.

Store them in environment variables and never commit them to git:

```bash
FREEKASSA_SHOP_ID=12345
FREEKASSA_API_KEY=...
FREEKASSA_SECRET_WORD_1=...
FREEKASSA_SECRET_WORD_2=...
```

> The API key is what creates withdrawals (`sdk.api.withdrawals.create`). Keep it on the server and restrict access to it.

## Quick start

### 1. Payment link (payment form)

```ts
import { CURRENCY, Freekassa, LANG, PAYMENT_METHOD } from '@exact-team/freekassa-sdk';

const sdk = new Freekassa({
  key: process.env.FREEKASSA_API_KEY!,
  secretWord1: process.env.FREEKASSA_SECRET_WORD_1!,
  secretWord2: process.env.FREEKASSA_SECRET_WORD_2!,
  shopId: Number(process.env.FREEKASSA_SHOP_ID),
  lang: LANG.ru,
  currency: CURRENCY.RUB,
});

const link = sdk.sci.createPaymentLink({
  amount: 1000,
  paymentId: 'order-1001', // your order number
  methodId: PAYMENT_METHOD.SBP, // optional: preselect a payment method
  email: 'customer@example.com', // optional
});

// Redirect the customer to link
```

### 2. Order through the API

```ts
import { PAYMENT_METHOD } from '@exact-team/freekassa-sdk';

const order = await sdk.api.orders.create({
  methodId: PAYMENT_METHOD.VISA_RUB,
  ip: '203.0.113.10', // customer IP
  email: 'customer@example.com',
  amount: 1000,
  paymentId: 'order-1002',
});

// order.location — the payment page, order.orderId — the FreeKassa order number
```

### 3. Payment notification

```ts
import { NOTIFICATION_ACK } from '@exact-team/freekassa-sdk';

// Handler for the notification URL (GET or POST, as set in the merchant account)
export function handleNotification(ip: string, body: Record<string, unknown>): string {
  if (!sdk.sci.isNotificationIp(ip)) {
    return 'hacking attempt!';
  }
  if (!sdk.sci.verifyNotification(body)) {
    return 'wrong sign';
  }
  // Check the amount and that the order is not paid yet, then credit the customer
  return NOTIFICATION_ACK; // 'YES' — confirms receipt
}
```

## Recipe: accept a payment end-to-end

The customer clicks "Pay": you create an order and redirect the customer to the FreeKassa payment page. After the payment FreeKassa sends a notification to your URL. The example below has no web framework.

> **Illustrative code.** `db` is your own data layer. The snippet shows the flow, not a ready application.

```ts
import {
  CURRENCY,
  Freekassa,
  LANG,
  NOTIFICATION_ACK,
  PAYMENT_METHOD,
} from '@exact-team/freekassa-sdk';

const sdk = new Freekassa({
  key: process.env.FREEKASSA_API_KEY!,
  secretWord1: process.env.FREEKASSA_SECRET_WORD_1!,
  secretWord2: process.env.FREEKASSA_SECRET_WORD_2!,
  shopId: Number(process.env.FREEKASSA_SHOP_ID),
  lang: LANG.ru,
  currency: CURRENCY.RUB,
});

// 1. The customer clicked "Pay": create the order and return the payment link.
export async function checkout(
  orderId: string,
  amount: number,
  ip: string,
  email: string,
): Promise<string> {
  const order = await sdk.api.orders.create({
    methodId: PAYMENT_METHOD.SBP,
    ip,
    email,
    amount,
    paymentId: orderId, // your order number — used to match the notification
  });
  await db.orders.update(orderId, { fkOrderId: order.orderId, status: 'awaiting_payment' });
  return order.location;
}

// 2. FreeKassa sends a notification after the payment.
export async function notify(ip: string, body: Record<string, unknown>): Promise<string> {
  if (!sdk.sci.isNotificationIp(ip) || !sdk.sci.verifyNotification(body)) {
    return 'wrong sign';
  }
  const orderId = String(body.MERCHANT_ORDER_ID);
  const order = await db.orders.findByOrderId(orderId);
  if (!order || order.status === 'paid') {
    return NOTIFICATION_ACK; // already processed: confirm and stop
  }
  if (Number(body.AMOUNT) < order.amount) {
    return 'wrong amount'; // paid less than required
  }
  await db.orders.update(orderId, { status: 'paid', paidAmount: body.AMOUNT });
  return NOTIFICATION_ACK;
}
```

What this recipe does right:

- **Your `paymentId` is the shared key.** It links your order, the FreeKassa order and the notification.
- **The signature is checked before any field is trusted.** Until it matches, `body` is not used.
- **Repeated notifications do not credit twice.** If the order is already paid, the code confirms the notification and stops.
- **The amount is checked against the order.** A notification does not prove that the customer paid the full amount.
- **Replying `YES` confirms receipt.** Without it FreeKassa keeps sending the notification if confirmation is enabled by support.

## Payment form (SCI)

### `sdk.sci.createPaymentLink(input)` → `string`

Returns the payment form URL on `pay.fk.money`. The SDK computes the signature `s` itself.

```ts
import { CURRENCY, LANG, PAYMENT_METHOD } from '@exact-team/freekassa-sdk';

const link = sdk.sci.createPaymentLink({
  amount: 1000,
  paymentId: 'order-1003',
  methodId: PAYMENT_METHOD.YOOMONEY,
  email: 'customer@example.com',
  phone: '+79001234567',
  currency: CURRENCY.USD, // overrides the config currency for this link
  lang: LANG.en, // overrides the config language for this link
  custom: { us_login: 'ivanov', us_plan: 'pro_1' }, // returned in the notification
});
```

| Parameter   | Required | Description                                                                                       |
| ----------- | -------- | ------------------------------------------------------------------------------------------------- |
| `amount`    | yes      | Greater than zero. Rounded to cents                                                               |
| `paymentId` | yes      | Your order number, not empty. Sent as `o`                                                         |
| `methodId`  | no       | Payment system ID, see [Payment systems](#payment-systems-payment_method). Sent as `i`            |
| `email`     | no       | Customer email (`em`)                                                                             |
| `phone`     | no       | Customer phone (`phone`)                                                                          |
| `currency`  | no       | A value from `CURRENCY`: `RUB`, `USD`, `EUR`, `UAH`, `KZT`. Defaults to the config value           |
| `lang`      | no       | A value from `LANG`: `ru` or `en`. Defaults to the config value                                   |
| `custom`    | no       | Extra `us_*` fields that are returned in the notification                                         |

Rules for `custom`: a key starts with `us_` and contains only Latin letters and digits (`us_login`); a value contains only Latin letters, digits, `-` and `_`. An invalid key or value throws a `ZodError` with the path to the field.

### `sdk.sci.signForm(amount, paymentId, currency?)` → `string`

The MD5 signature of the payment form: `md5("shopId:amount:secretWord1:currency:paymentId")`. Usually you do not need it, `createPaymentLink` computes it. It is kept for cases where the form is built by hand.

### `sdk.sci.verifyNotification(params)` → `boolean`

Verifies the notification signature: `md5("MERCHANT_ID:AMOUNT:secretWord2:MERCHANT_ORDER_ID")`. Accepts the request data as is. For incomplete or invalid data it returns `false` and does not throw.

### `sdk.sci.isNotificationIp(ip)` → `boolean`

Checks the sender IP against the FreeKassa list: `168.119.157.136`, `168.119.60.227`, `178.154.197.79`, `51.250.54.238`. If your server is behind a proxy, take the IP from the `X-Real-IP` header, as the documentation shows.

## REST API

All requests are `POST` with a JSON body. The SDK adds `shopId`, `nonce` and `signature` (HMAC-SHA256 over the parameter values sorted by name and joined with `|`). API errors are thrown as `FreekassaApiError`, see [Error handling](#error-handling). The examples use `sdk` from [Quick start](#quick-start). Constants are imported in each example that uses them.

Methods return the parsed API response directly, without a wrapper.

### Orders: `sdk.api.orders`

#### `orders.create(input)`

Creates an order and returns the payment link. Endpoint `POST /orders/create`.

```ts
import { CURRENCY, PAYMENT_METHOD } from '@exact-team/freekassa-sdk';

const order = await sdk.api.orders.create({
  methodId: PAYMENT_METHOD.VISA_RUB, // required, sent as i
  ip: '203.0.113.10', // required, customer IP
  email: 'customer@example.com', // required
  amount: 1000, // required, greater than zero
  paymentId: 'order-1004', // recommended: used to match the notification
  currency: CURRENCY.RUB, // optional, defaults to the config value
  phone: '+79001234567', // optional, sent as tel
  successUrl: 'https://shop.example/success', // see the note below
  failUrl: 'https://shop.example/fail',
  notifyUrl: 'https://shop.example/notify',
});

console.log(order.location, order.orderId, order.orderHash);
```

Response: `{ type, orderId, orderHash, location, recurrent_order? }`.

> `successUrl`, `failUrl` and `notifyUrl` override the addresses set in the merchant account. This option is enabled on request to FreeKassa support.

#### `orders.list(input?)`

Lists orders with filters. Endpoint `POST /orders`.

```ts
import { ORDER_STATUS } from '@exact-team/freekassa-sdk';

const paid = await sdk.api.orders.list({
  status: ORDER_STATUS.PAID, // see "Order statuses"
  dateFrom: '2025-01-01 00:00:00',
  dateTo: '2025-01-31 23:59:59',
  page: 0,
});

for (const item of paid.orders) {
  console.log(item.fk_order_id, item.merchant_order_id, item.amount, item.currency);
}
```

| Parameter   | Description                                                             |
| ----------- | ----------------------------------------------------------------------- |
| `orderId`   | FreeKassa order number                                                  |
| `paymentId` | Your order number                                                       |
| `status`    | A status from `ORDER_STATUS`                                            |
| `dateFrom`  | Start date, format `YYYY-MM-DD HH:MM:SS`                                |
| `dateTo`    | End date, format `YYYY-MM-DD HH:MM:SS`                                  |
| `page`      | Page number (an integer; the documentation examples use `0`)            |

#### `orders.refund(input)`

Refund. Endpoint `POST /orders/refund`. Pass `orderId` or `paymentId` (at least one). Without `amount` the whole payment is refunded.

```ts
await sdk.api.orders.refund({ orderId: 555001, amount: 500 }); // partial refund
await sdk.api.orders.refund({ paymentId: 'order-1004' }); // full refund by your order number
```

Response: `{ type, id, message? }`, where `id` is the refund number.

## Recurring payments

The first payment creates a subscription; the next charges reference its number:

```ts
import { PAYMENT_METHOD, RECURRENT_PERIOD } from '@exact-team/freekassa-sdk';

const first = await sdk.api.orders.create({
  methodId: PAYMENT_METHOD.VISA_RUB,
  ip: '203.0.113.10',
  email: 'customer@example.com',
  amount: 299,
  paymentId: 'sub-1',
  recurrent: { period: RECURRENT_PERIOD.MONTH, description: 'VPN subscription' }, // DAY, WEEK, MONTH or YEAR
});

const subscriptionId = first.recurrent_order?.id; // store it in your database
console.log(first.recurrent_order?.pay_date_at); // date of the next charge

if (subscriptionId !== undefined) {
  await sdk.api.orders.create({
    methodId: PAYMENT_METHOD.VISA_RUB,
    ip: '203.0.113.10',
    email: 'customer@example.com',
    amount: 299,
    paymentId: 'sub-1-2',
    recurrentOrderId: subscriptionId, // the next charge of the subscription
  });
}
```

The subscription `description` must be 10 to 200 characters long.

## Withdrawals

Withdrawals use the same API key and need care: they move money out.

```ts
import { PAYMENT_METHOD } from '@exact-team/freekassa-sdk';

const payout = await sdk.api.withdrawals.create({
  methodId: PAYMENT_METHOD.SBP,
  account: 'ACCOUNT_NUMBER', // where to pay out: account number, card or phone
  amount: 1000,
  paymentId: 'payout-1',
});
console.log(payout.data.id);

const history = await sdk.api.withdrawals.list({ page: 0 });
const methods = await sdk.api.withdrawals.currencies(); // available withdrawal methods
```

`withdrawals.create` accepts `currency` (defaults to the config value). The official documentation does not describe withdrawal statuses, so the SDK does not list them.

## Currencies and account

```ts
import { PAYMENT_METHOD } from '@exact-team/freekassa-sdk';

const currencies = await sdk.api.currencies.list(); // payment systems and their availability
const status = await sdk.api.currencies.status(PAYMENT_METHOD.SBP); // is this system available now
const balance = await sdk.api.account.balance(); // shop balances
const shops = await sdk.api.account.shops(); // shops of the account
```

## Statuses and constants

The examples use constants instead of raw numbers and strings. All of them are exported from the package root.

### Order statuses (`ORDER_STATUS`)

Order statuses from section 2.3 of the documentation:

| Value | Constant                 | Description |
| ----- | ------------------------ | ----------- |
| `0`   | `ORDER_STATUS.NEW`       | New         |
| `1`   | `ORDER_STATUS.PAID`      | Paid        |
| `6`   | `ORDER_STATUS.REFUND`    | Refund      |
| `8`   | `ORDER_STATUS.ERROR`     | Error       |
| `9`   | `ORDER_STATUS.CANCELLED` | Cancelled   |

```ts
import { ORDER_STATUS } from '@exact-team/freekassa-sdk';

const list = await sdk.api.orders.list({ page: 0 });
for (const item of list.orders) {
  if (item.status === ORDER_STATUS.PAID) {
    console.log('paid:', item.fk_order_id);
  }
}
```

### Payment systems (`PAYMENT_METHOD`)

IDs from section 1.8 of the documentation. Used as `methodId` (the `i` parameter).

| ID  | Name in the documentation | Constant              |
| --- | ------------------------- | --------------------- |
| 1   | FK WALLET RUB             | `FK_WALLET_RUB`       |
| 2   | FK WALLET USD             | `FK_WALLET_USD`       |
| 3   | FK WALLET EUR             | `FK_WALLET_EUR`       |
| 4   | VISA RUB                  | `VISA_RUB`            |
| 6   | Yoomoney                  | `YOOMONEY`            |
| 7   | VISA UAH                  | `VISA_UAH`            |
| 8   | MasterCard RUB            | `MASTERCARD_RUB`      |
| 9   | MasterCard UAH            | `MASTERCARD_UAH`      |
| 10  | Qiwi                      | `QIWI`                |
| 11  | VISA EUR                  | `VISA_EUR`            |
| 12  | МИР                       | `MIR`                 |
| 13  | Онлайн банк               | `ONLINE_BANK`         |
| 14  | USDT (ERC20)              | `USDT_ERC20`          |
| 15  | USDT (TRC20)              | `USDT_TRC20`          |
| 16  | Bitcoin Cash              | `BITCOIN_CASH`        |
| 17  | BNB                       | `BNB`                 |
| 18  | DASH                      | `DASH`                |
| 19  | Dogecoin                  | `DOGECOIN`            |
| 20  | ZCash                     | `ZCASH`               |
| 21  | Monero                    | `MONERO`              |
| 22  | Waves                     | `WAVES`               |
| 23  | Ripple                    | `RIPPLE`              |
| 24  | Bitcoin                   | `BITCOIN`             |
| 25  | Litecoin                  | `LITECOIN`            |
| 26  | Ethereum                  | `ETHEREUM`            |
| 27  | SteamPay                  | `STEAMPAY`            |
| 28  | Мегафон                   | `MEGAFON`             |
| 32  | VISA USD                  | `VISA_USD`            |
| 33  | Perfect Money USD         | `PERFECT_MONEY_USD`   |
| 34  | Shiba Inu                 | `SHIBA_INU`           |
| 35  | QIWI API                  | `QIWI_API`            |
| 36  | Card RUB API              | `CARD_RUB_API`        |
| 37  | Google pay                | `GOOGLE_PAY`          |
| 38  | Apple pay                 | `APPLE_PAY`           |
| 39  | Tron                      | `TRON`                |
| 40  | Webmoney WMZ              | `WEBMONEY_WMZ`        |
| 41  | VISA / MasterCard KZT     | `VISA_MASTERCARD_KZT` |
| 42  | СБП                       | `SBP`                 |
| 44  | СБП (API)                 | `SBP_API`             |

### Recurring periods (`RECURRENT_PERIOD`)

Periods of recurring payments from section 2.4 of the documentation. Used as `recurrent.period`.

| Value   | Constant                 | Description |
| ------- | ------------------------ | ----------- |
| `day`   | `RECURRENT_PERIOD.DAY`   | Every day   |
| `week`  | `RECURRENT_PERIOD.WEEK`  | Every week  |
| `month` | `RECURRENT_PERIOD.MONTH` | Every month |
| `year`  | `RECURRENT_PERIOD.YEAR`  | Every year  |

### Currencies and languages

- `CURRENCY` — `RUB`, `USD`, `EUR`, `UAH`, `KZT` (section 1.3). As an array: `CURRENCY_VALUES`.
- `LANG` — `ru`, `en`. As an array: `LANG_VALUES`.
- Guards for strings from external sources: `isCurrencyGuard(value)`, `isLangGuard(value)`, `isStatusGuard(value)`.

```ts
import { CURRENCY, isCurrencyGuard } from '@exact-team/freekassa-sdk';

const currency: unknown = req.query.currency;
if (isCurrencyGuard(currency)) {
  // currency has the type TCurrency here
}
console.log(CURRENCY.USD); // 'USD'
```

## Notifications

After a payment FreeKassa sends the data to the notification URL set in the merchant account (GET or POST, form-data). The SDK verifies `MERCHANT_ID`, `AMOUNT`, `MERCHANT_ORDER_ID` and `SIGN`.

| Field               | Description                                                   |
| ------------------- | ------------------------------------------------------------- |
| `MERCHANT_ID`       | Shop ID                                                       |
| `AMOUNT`            | Payment amount                                                |
| `intid`             | Operation number in FreeKassa                                 |
| `MERCHANT_ORDER_ID` | Your order number (`paymentId`)                               |
| `P_EMAIL`           | Payer email                                                   |
| `P_PHONE`           | Payer phone, if provided                                      |
| `CUR_ID`            | ID of the payment system that was used                        |
| `SIGN`              | MD5 signature, checked by `sdk.sci.verifyNotification`        |
| `us_*`              | Your extra fields from the form                               |
| `payer_account`     | Payer's account or card number                                |
| `commission`        | Commission in the payment currency                            |

Confirmation: the notification script must reply `YES` (`NOTIFICATION_ACK`). If confirmation is enabled by FreeKassa support, the notification is repeated until you reply `YES`. Therefore the handler must be idempotent: check whether the order is already paid and do not credit money twice.

## Error handling

- **`FreekassaApiError`** — the API answered with an error: an HTTP status that is not 2xx, or `type` equal to `STATUS.error` even with HTTP 200. Fields: `status`, `body`. Message: `Freekassa API error (HTTP 400): ...`.
- **`ZodError`** — the input did not pass validation, nothing was sent. The problems are in `error.issues`, each with the path to the field.
- **Network and timeouts** — `fetch` throws a `TypeError` on network failure and a `TimeoutError` after 30 seconds. These are ordinary errors and can be caught as `Error`.

```ts
import { FreekassaApiError } from '@exact-team/freekassa-sdk';
import { ZodError } from 'zod';

try {
  await sdk.api.orders.refund({ orderId: 555001 });
} catch (error) {
  if (error instanceof FreekassaApiError) {
    console.error(error.status, error.message, error.body); // the API answered with an error
  } else if (error instanceof ZodError) {
    console.error(error.issues); // invalid input, nothing was sent
  } else {
    throw error; // network failure or timeout
  }
}
```

## Configuration

```ts
new Freekassa({
  // required
  key: string, // API key, not empty
  secretWord1: string, // secret word for the form signature, not empty
  secretWord2: string, // secret word 2 for notifications, not empty
  shopId: number, // shop ID, positive integer
  lang: TLang, // a value of LANG: language of the payment form
  currency: TCurrency, // a value of CURRENCY: default currency

  // optional
  payUrl?: string, // default 'https://pay.fk.money/', must be a URL
  apiUrl?: string, // default 'https://api.fk.life/v1/', must be a URL
});
```

An invalid configuration throws a `ZodError` when `Freekassa` is created, not on the first request.

## Coverage of the official docs

The methods from the [FreeKassa documentation](https://docs.freekassa.net) are implemented and checked against its OpenAPI specification:

| Documentation                                     | SDK                                |
| ------------------------------------------------- | ---------------------------------- |
| SCI: payment form, `GET pay.fk.money`            | `sdk.sci.createPaymentLink`        |
| SCI: form signature (1.5)                         | `sdk.sci.signForm`                 |
| SCI: notification and signature check (1.4, 1.7) | `sdk.sci.verifyNotification`       |
| SCI: notification sender IP check (1.4)           | `sdk.sci.isNotificationIp`         |
| SCI: `YES` reply to a notification (1.4)          | `NOTIFICATION_ACK`                 |
| `POST /orders`                                    | `sdk.api.orders.list`              |
| `POST /orders/create`                             | `sdk.api.orders.create`            |
| `POST /orders/refund`                             | `sdk.api.orders.refund`            |
| `POST /withdrawals`                               | `sdk.api.withdrawals.list`         |
| `POST /withdrawals/create`                        | `sdk.api.withdrawals.create`       |
| `POST /withdrawals/currencies`                    | `sdk.api.withdrawals.currencies`   |
| `POST /currencies`                                | `sdk.api.currencies.list`          |
| `POST /currencies/{id}/status`                    | `sdk.api.currencies.status`        |
| `POST /balance`                                   | `sdk.api.account.balance`          |
| `POST /shops`                                     | `sdk.api.account.shops`            |

Payment system codes (section 1.8) are `PAYMENT_METHOD`, order statuses (2.3) are `ORDER_STATUS`, recurring payments (2.4) are the fields of `orders.create`, and their periods are `RECURRENT_PERIOD`.

**Not implemented:** the `fields` parameter of `getCurrencies`, mentioned in the description of `/orders/create`. The specification has it neither in the request nor in the response.

## Deprecated methods

The flat methods of version 0.0.x (`sdk.createOrder`, `sdk.getBalance`, etc.) remain as wrappers over the new modules and are marked `@deprecated`. They will be removed in version **0.1.5**.

| Old                           | New                              |
| ----------------------------- | -------------------------------- |
| `sdk.createPaymentLink`       | `sdk.sci.createPaymentLink`      |
| `sdk.verifyNotification`      | `sdk.sci.verifyNotification`     |
| `sdk.signForm`                | `sdk.sci.signForm`               |
| `sdk.createOrder`             | `sdk.api.orders.create`          |
| `sdk.listOrders`              | `sdk.api.orders.list`            |
| `sdk.createWithdrawal`        | `sdk.api.withdrawals.create`     |
| `sdk.listWithdrawals`         | `sdk.api.withdrawals.list`       |
| `sdk.getWithdrawalCurrencies` | `sdk.api.withdrawals.currencies` |
| `sdk.getCurrencies`           | `sdk.api.currencies.list`        |
| `sdk.getCurrencyStatus`       | `sdk.api.currencies.status`      |
| `sdk.getBalance`              | `sdk.api.account.balance`        |
| `sdk.getShops`                | `sdk.api.account.shops`          |

The `successUrl`, `failUrl` and `notifyUrl` arguments were removed from `createPaymentLink`: the SCI payment form does not support them, the return and notification addresses are set in the merchant account.

## Using modules separately

If you need only the form or only the API, create the module directly:

```ts
import {
  CURRENCY,
  DEFAULT_API_URL,
  DEFAULT_PAY_URL,
  FreekassaApi,
  FreekassaSCI,
  LANG,
} from '@exact-team/freekassa-sdk';

const sci = new FreekassaSCI({
  shopId: 12345,
  secretWord1: process.env.FREEKASSA_SECRET_WORD_1!,
  secretWord2: process.env.FREEKASSA_SECRET_WORD_2!,
  payUrl: DEFAULT_PAY_URL,
  lang: LANG.en,
  currency: CURRENCY.USD,
});

const api = new FreekassaApi({
  key: process.env.FREEKASSA_API_KEY!,
  shopId: 12345,
  apiUrl: DEFAULT_API_URL,
  currency: CURRENCY.USD,
});
```

## Retries, timeouts and idempotency

- **No retries.** The SDK does not retry requests. Handle network errors and 5xx responses in your code.
- **A 30-second timeout** for each request. The value is fixed and cannot be configured.
- **Creating an order is not idempotent.** Before creating an order again, check the list: `sdk.api.orders.list({ paymentId })`.
- **Notifications can repeat.** Check whether the order is already processed before crediting money.

## Architecture

```
Freekassa (entry point)
 ├── sci → FreekassaSCI          payment link, signatures, notifications
 └── api → FreekassaApi          REST API
        ├── client      → ApiClient       JSON POST, signature, nonce, timeout, errors
        ├── orders      → OrdersApi       create, list, refund
        ├── withdrawals → WithdrawalsApi  create, list, currencies
        ├── currencies  → CurrenciesApi   list, status
        └── account     → AccountApi      balance, shops

commands/    zod schemas of requests and responses, types, constants
core/        MD5, HMAC-SHA256, signature comparison, amount rounding
common/      helper functions (parsing the response body, checks)
```

## Exports map

Everything listed below is available from the package root (`import { ... } from '@exact-team/freekassa-sdk'`):

```
Classes:    Freekassa, FreekassaSCI, FreekassaApi, ApiClient,
            OrdersApi, WithdrawalsApi, CurrenciesApi, AccountApi,
            FreekassaApiError
Commands:   CreateOrderCommand, CreatePaymentLinkCommand, CreateWithdrawalCommand,
            CtrConfigCommand, GetBalanceCommand, GetCurrenciesCommand,
            GetCurrenciesStatusCommand, GetShopsCommand, GetWithdrawalsCurrenciesCommand,
            ListOrdersCommand, ListWithdrawalsCommand, NotificationCommand, RefundOrderCommand
Constants:  API, HTTP_METHOD, HTTP_HEADER, CONTENT_TYPE, SIGNATURE_SEPARATOR,
            CURRENCY, CURRENCY_VALUES, LANG, LANG_VALUES, STATUS, STATUS_VALUES,
            ORDER_STATUS, PAYMENT_METHOD, NOTIFICATION_ACK, FREEKASSA_NOTIFICATION_IPS,
            DEFAULT_PAY_URL, DEFAULT_API_URL, CUSTOM_FIELD_PREFIX,
            RECURRENT_FLAG, RECURRENT_PERIOD, RECURRENT_PERIOD_VALUES
Guards:     isCurrencyGuard, isLangGuard, isStatusGuard
Types:      IFreekassaSCIOptions, IFreekassaApiOptions, IApiClientOptions, IApiRequestBody, TCurrency, TLang, TOrderStatus, TPaymentMethod, TRecurrentPeriod
```

## TypeScript notes

- The Node.js build is CommonJS (`build/backend/index.js`) with types in `build/backend/index.d.ts`.
- Checked with TypeScript 5.0.4 and 5.5.4.
- `zod` 4 is a runtime dependency and is installed automatically.
- The `browser` field in `package.json` points to a build that uses `node:crypto`, so the SDK does not work in the browser.

## Scripts

```bash
npm run build          # clean, CommonJS build and frontend build
npm run typecheck      # tsc --noEmit
npm test               # tests (node:test through ts-node)
npm run test:coverage  # tests with coverage, lcov report in coverage/
npm run lint           # ESLint over src, tests and index.ts
npm run format         # Prettier --write
npm run format:check   # Prettier --check
```

## Contributing

Found a bug? Open an [Issue](https://github.com/exact01/freekassa-sdk/issues). Describe what you did, what you expected and what you got (the error code, the module, the SDK and Node versions). Never include real API keys or transaction data in an issue.

Want to propose a change? Send a Pull Request from a fork:

1. Fork the repository with the "Fork" button and clone your fork.
2. Create a branch from `main`:

   ```bash
   git clone git@github.com:<your-login>/freekassa-sdk.git
   cd freekassa-sdk
   npm install
   git checkout -b fix/my-fix
   ```

   The linter needs Node.js 20.19+, 22.13+ or 24+.

3. Make your changes and check them:

   ```bash
   npm run typecheck     # TypeScript
   npm run lint          # ESLint
   npm run format:check  # Prettier (to fix: npm run format)
   npm test              # tests
   npm run build         # build
   ```

4. Add tests for new behaviour. The request contract is in `tests/contract.test.ts`, the signatures are in `tests/sci.test.ts` and `tests/api.test.ts`.
5. Keep code comments in English.
6. Commit with a Conventional Commits prefix that matches the history: `feat(...)`, `fix(...)`, `docs: ...`, `chore: ...`.
7. Push the branch to your fork and open a Pull Request into `main`. Describe what you changed and why. If the PR closes an issue, reference it with `Closes #N`.

`npm install` makes Husky install the git hooks from `.husky/`: `pre-commit` checks formatting, the linter and types, `pre-push` runs the tests. You can skip them once with `--no-verify`, but CI runs the same checks.

## Release

Maintainers make releases. They change `version` in `package.json` and push a tag equal to that version without the `v` prefix, for example `0.0.25`. The tag starts `deploy-lib.yml`, which checks the version, runs the linter and tests, builds, and publishes to npm with provenance. Contributors do not need to change the version or create tags.

## License

ISC. See [LICENSE](./LICENSE).
