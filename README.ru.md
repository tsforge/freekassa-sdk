[English](./README.md) | **Русский**

<p align="center">
  <img src="https://i.postimg.cc/t48NxVF2/kassa.webp" alt="FreeKassa SDK for TypeScript" width="100%">
</p>

## Установка

```bash
npm i @exact-team/freekassa-sdk
```

Требования: **Node.js 20+** (SDK использует нативный `fetch` и `AbortSignal.timeout`), TypeScript 5.0+ если вы пишете на TypeScript.

SDK работает только на сервере: подписи считаются секретными ключами, их нельзя передавать в браузер.

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

Type-safe Node.js / TypeScript SDK для платёжной системы [FreeKassa](https://freekassa.net): платёжная форма (SCI), оповещения о платеже и REST API — заказы, возвраты, рекуррентные платежи, выплаты, баланс, платёжные системы и магазины.

> **Версия 0.x: API может меняться между минорными версиями.** Закрепите точную версию в `package.json`. SDK проверен на мок-транспорте и на официальной OpenAPI-спецификации FreeKassa, но не проверен на боевом API под нагрузкой. Найденные ошибки пишите в [Issues](https://github.com/exact01/freekassa-sdk/issues).

Имена параметров, подписи (MD5 для формы и оповещений, HMAC-SHA256 для API), пути эндпоинтов и JSON-тела запросов совпадают с [документацией FreeKassa](https://docs.freekassa.net). Что реализовано — в разделе [Соответствие документации](#соответствие-документации).

---

## Содержание

- [Установка](#установка)
- [NestJS](#nestjs)
- [Почему этот SDK](#почему-этот-sdk)
- [Получение данных для подключения](#получение-данных-для-подключения)
- [Быстрый старт](#быстрый-старт)
- [Рецепт: принять оплату от начала до конца](#рецепт-принять-оплату-от-начала-до-конца)
- [Платёжная форма (SCI)](#платёжная-форма-sci)
- [REST API](#rest-api)
- [Рекуррентные платежи](#рекуррентные-платежи)
- [Выплаты](#выплаты)
- [Статусы и константы](#статусы-и-константы)
- [Оповещения о платеже](#оповещения-о-платеже)
- [Обработка ошибок](#обработка-ошибок)
- [Конфигурация](#конфигурация)
- [Соответствие документации](#соответствие-документации)
- [Устаревшие методы](#устаревшие-методы)
- [Использование модулей отдельно](#использование-модулей-отдельно)
- [Повторы, таймауты и идемпотентность](#повторы-таймауты-и-идемпотентность)
- [Архитектура](#архитектура)
- [Карта экспортов](#карта-экспортов)
- [Заметки по TypeScript](#заметки-по-typescript)
- [Скрипты](#скрипты)
- [Вклад в проект](#вклад-в-проект)
- [Релиз](#релиз)
- [Лицензия](#лицензия)

---

## NestJS

Для NestJS есть отдельная обёртка: [freekassa-sdk-nestjs](https://github.com/exact01/freekassa-sdk-nestjs).

## Почему этот SDK

- **Одна точка входа.** `Freekassa` даёт платёжную форму (`sdk.sci`) и REST API (`sdk.api`).
- **Проверка до отправки.** Входные данные проверяются `zod`: пустой `paymentId`, дробный ID, сумма не больше нуля или неверное поле `us_*` дают `ZodError`, запрос в сеть не уходит.
- **Подписи считает SDK.** Запросы подписываются HMAC-SHA256, `nonce` строго возрастает. Подпись оповещения сравнивается без утечки по времени (`crypto.timingSafeEqual`).
- **camelCase в коде.** Вы пишете `paymentId`, `successUrl`, `methodId`. SDK сам переводит их в имена из документации (`o`, `success_url`, `i`).
- **Константы вместо строк.** Статусы, платёжные системы, валюты, языки и периоды рекуррентных платежей: `ORDER_STATUS.PAID`, `PAYMENT_METHOD.SBP`, `CURRENCY.RUB`, `LANG.ru`, `RECURRENT_PERIOD.MONTH`.
- **Модули по отдельности.** `FreekassaSCI` и `FreekassaApi` можно создавать отдельно друг от друга.
- **Строгий TypeScript.** Типы запросов и ответов выводятся из схем, без `any`.

### Сравнение: запрос руками и через SDK

Создать заказ руками — нужно считать подпись, собрать JSON и разобрать ответ:

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
const data = await res.json(); // без проверки типов и без обработки ошибок
```

То же через SDK:

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

## Получение данных для подключения

Данные берутся в [личном кабинете FreeKassa](https://merchant.freekassa.net/settings), на странице настроек магазина:

- **ID магазина** (`shopId`) — число, указано в личном кабинете магазина.
- **API-ключ** (`key`) — для запросов к REST API.
- **Секретное слово** (`secretWord1`) — подпись платёжной формы.
- **Секретное слово 2** (`secretWord2`) — проверка оповещений о платеже.

Храните их в переменных окружения и не коммитьте в git:

```bash
FREEKASSA_SHOP_ID=12345
FREEKASSA_API_KEY=...
FREEKASSA_SECRET_WORD_1=...
FREEKASSA_SECRET_WORD_2=...
```

> С API-ключом доступны выплаты (`sdk.api.withdrawals.create`). Держите ключ только на сервере и ограничьте доступ к нему.

## Быстрый старт

### 1. Ссылка на оплату (платёжная форма)

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
  paymentId: 'order-1001', // номер заказа в вашей системе
  methodId: PAYMENT_METHOD.SBP, // необязательно: выбрать способ оплаты
  email: 'customer@example.com', // необязательно
});

// Перенаправьте покупателя на link
```

### 2. Заказ через API

```ts
import { PAYMENT_METHOD } from '@exact-team/freekassa-sdk';

const order = await sdk.api.orders.create({
  methodId: PAYMENT_METHOD.VISA_RUB,
  ip: '203.0.113.10', // IP покупателя
  email: 'customer@example.com',
  amount: 1000,
  paymentId: 'order-1002',
});

// order.location — страница оплаты, order.orderId — номер заказа во FreeKassa
```

### 3. Оповещение о платеже

```ts
import { NOTIFICATION_ACK } from '@exact-team/freekassa-sdk';

// Обработчик URL оповещения (GET или POST — как настроено в личном кабинете)
export function handleNotification(ip: string, body: Record<string, unknown>): string {
  if (!sdk.sci.isNotificationIp(ip)) {
    return 'hacking attempt!';
  }
  if (!sdk.sci.verifyNotification(body)) {
    return 'wrong sign';
  }
  // Проверьте сумму и что заказ ещё не оплачен, затем зачислите средства
  return NOTIFICATION_ACK; // 'YES' — подтверждение получения
}
```

## Рецепт: принять оплату от начала до конца

Покупатель нажимает «Оплатить»: вы создаёте заказ и перенаправляете его на страницу FreeKassa. После оплаты FreeKassa присылает оповещение на ваш URL. Ниже — схема без веб-фреймворка.

> **Иллюстративный код.** `db` — ваш слой данных. Код показывает поток, а не готовое приложение.

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

// 1. Покупатель нажал «Оплатить»: создаём заказ и возвращаем ссылку на оплату.
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
    paymentId: orderId, // ваш номер заказа, по нему сопоставляем оповещение
  });
  await db.orders.update(orderId, { fkOrderId: order.orderId, status: 'awaiting_payment' });
  return order.location;
}

// 2. FreeKassa присылает оповещение после оплаты.
export async function notify(ip: string, body: Record<string, unknown>): Promise<string> {
  if (!sdk.sci.isNotificationIp(ip) || !sdk.sci.verifyNotification(body)) {
    return 'wrong sign';
  }
  const orderId = String(body.MERCHANT_ORDER_ID);
  const order = await db.orders.findByOrderId(orderId);
  if (!order || order.status === 'paid') {
    return NOTIFICATION_ACK; // уже обработано: подтверждаем и выходим
  }
  if (Number(body.AMOUNT) < order.amount) {
    return 'wrong amount'; // оплачено меньше, чем нужно
  }
  await db.orders.update(orderId, { status: 'paid', paidAmount: body.AMOUNT });
  return NOTIFICATION_ACK;
}
```

Что делает этот рецепт правильно:

- **Ваш `paymentId` — общий ключ.** По нему связаны заказ в вашей базе, заказ во FreeKassa и оповещение.
- **Подпись проверяется до того, как доверять полям.** Пока подпись не сошлась, `body` не используется.
- **Повторные оповещения не дублируют зачисление.** Если заказ уже оплачен, код подтверждает оповещение и выходит.
- **Сумма сверяется с заказом.** Оповещение не доказывает, что покупатель заплатил всю сумму.
- **Ответ `YES` подтверждает получение.** Без него FreeKassa будет присылать оповещение повторно, если подтверждение включено в поддержке.

## Платёжная форма (SCI)

### `sdk.sci.createPaymentLink(input)` → `string`

Возвращает URL платёжной формы на `pay.fk.money`. Подпись `s` SDK считает сам.

```ts
import { CURRENCY, LANG, PAYMENT_METHOD } from '@exact-team/freekassa-sdk';

const link = sdk.sci.createPaymentLink({
  amount: 1000,
  paymentId: 'order-1003',
  methodId: PAYMENT_METHOD.YOOMONEY,
  email: 'customer@example.com',
  phone: '+79001234567',
  currency: CURRENCY.USD, // переопределяет валюту из конфига для этой ссылки
  lang: LANG.en, // переопределяет язык из конфига для этой ссылки
  custom: { us_login: 'ivanov', us_plan: 'pro_1' }, // вернутся в оповещении
});
```

| Параметр    | Обязательный | Описание                                                                                    |
| ----------- | ------------ | ------------------------------------------------------------------------------------------- |
| `amount`    | да           | Сумма больше нуля. Округляется до копеек                                                    |
| `paymentId` | да           | Ваш номер заказа, не пустой. Передаётся как `o`                                             |
| `methodId`  | нет          | ID платёжной системы, см. [Платёжные системы](#платёжные-системы-payment_method). Передаётся как `i` |
| `email`     | нет          | Email покупателя (`em`)                                                                     |
| `phone`     | нет          | Телефон покупателя (`phone`)                                                                |
| `currency`  | нет          | Значение из `CURRENCY`: `RUB`, `USD`, `EUR`, `UAH`, `KZT`. По умолчанию — из конфига       |
| `lang`      | нет          | Значение из `LANG`: `ru` или `en`. По умолчанию — из конфига                                |
| `custom`    | нет          | Дополнительные поля `us_*`, которые вернутся в оповещении                                   |

Правила для `custom`: ключ начинается с `us_` и содержит только латиницу и цифры (`us_login`), значение содержит только латиницу, цифры, `-` и `_`. Неверный ключ или значение дают `ZodError`, в сообщении указан путь к полю.

### `sdk.sci.signForm(amount, paymentId, currency?)` → `string`

MD5-подпись платёжной формы: `md5("shopId:amount:secretWord1:currency:paymentId")`. Обычно не нужна, `createPaymentLink` считает её сам. Метод оставлен для случаев, когда форму собирают вручную.

### `sdk.sci.verifyNotification(params)` → `boolean`

Проверяет подпись оповещения: `md5("MERCHANT_ID:AMOUNT:secretWord2:MERCHANT_ORDER_ID")`. Принимает данные запроса как есть. Для неполных или неверных данных возвращает `false` и не бросает исключение.

### `sdk.sci.isNotificationIp(ip)` → `boolean`

Проверяет IP отправителя по списку FreeKassa: `168.119.157.136`, `168.119.60.227`, `178.154.197.79`, `51.250.54.238`. Если сервер стоит за прокси, берите IP из заголовка `X-Real-IP`, как в документации.

## REST API

Все запросы — `POST` с JSON-телом. SDK добавляет `shopId`, `nonce` и `signature` (HMAC-SHA256 по значениям параметров, отсортированным по именам, через `|`). Ошибки API выбрасываются как `FreekassaApiError`, см. [Обработка ошибок](#обработка-ошибок). Примеры используют `sdk` из [Быстрого старта](#быстрый-старт). Константы импортируются в каждом примере, где они используются.

Методы возвращают разобранный ответ API напрямую, без обёртки.

### Заказы: `sdk.api.orders`

#### `orders.create(input)`

Создаёт заказ и возвращает ссылку на оплату. Эндпоинт `POST /orders/create`.

```ts
import { CURRENCY, PAYMENT_METHOD } from '@exact-team/freekassa-sdk';

const order = await sdk.api.orders.create({
  methodId: PAYMENT_METHOD.VISA_RUB, // обязательный, передаётся как i
  ip: '203.0.113.10', // обязательный, IP покупателя
  email: 'customer@example.com', // обязательный
  amount: 1000, // обязательный, больше нуля
  paymentId: 'order-1004', // рекомендуется: по нему сопоставляем оповещение
  currency: CURRENCY.RUB, // необязательный, по умолчанию из конфига
  phone: '+79001234567', // необязательный, передаётся как tel
  successUrl: 'https://shop.example/success', // см. ниже
  failUrl: 'https://shop.example/fail',
  notifyUrl: 'https://shop.example/notify',
});

console.log(order.location, order.orderId, order.orderHash);
```

Ответ: `{ type, orderId, orderHash, location, recurrent_order? }`.

> `successUrl`, `failUrl` и `notifyUrl` переопределяют адреса из настроек магазина. Эта возможность включается по запросу в техподдержку FreeKassa.

#### `orders.list(input?)`

Список заказов по фильтрам. Эндпоинт `POST /orders`.

```ts
import { ORDER_STATUS } from '@exact-team/freekassa-sdk';

const paid = await sdk.api.orders.list({
  status: ORDER_STATUS.PAID, // см. «Статусы заказов»
  dateFrom: '2025-01-01 00:00:00',
  dateTo: '2025-01-31 23:59:59',
  page: 0,
});

for (const item of paid.orders) {
  console.log(item.fk_order_id, item.merchant_order_id, item.amount, item.currency);
}
```

| Параметр    | Описание                                           |
| ----------- | -------------------------------------------------- |
| `orderId`   | Номер заказа во FreeKassa                          |
| `paymentId` | Ваш номер заказа                                   |
| `status`    | Статус из `ORDER_STATUS`                           |
| `dateFrom`  | Дата начала, формат `YYYY-MM-DD HH:MM:SS`          |
| `dateTo`    | Дата окончания, формат `YYYY-MM-DD HH:MM:SS`       |
| `page`      | Номер страницы (целое число, в примерах документации — `0`) |

#### `orders.refund(input)`

Возврат. Эндпоинт `POST /orders/refund`. Укажите `orderId` или `paymentId` (хотя бы один). Без `amount` возвращается весь платёж.

```ts
await sdk.api.orders.refund({ orderId: 555001, amount: 500 }); // частичный возврат
await sdk.api.orders.refund({ paymentId: 'order-1004' }); // полный возврат по вашему номеру
```

Ответ: `{ type, id, message? }`, где `id` — номер возврата.

## Рекуррентные платежи

Первый платёж создаёт подписку, следующие списания идут по её номеру:

```ts
import { PAYMENT_METHOD, RECURRENT_PERIOD } from '@exact-team/freekassa-sdk';

const first = await sdk.api.orders.create({
  methodId: PAYMENT_METHOD.VISA_RUB,
  ip: '203.0.113.10',
  email: 'customer@example.com',
  amount: 299,
  paymentId: 'sub-1',
  recurrent: { period: RECURRENT_PERIOD.MONTH, description: 'VPN subscription' }, // DAY, WEEK, MONTH или YEAR
});

const subscriptionId = first.recurrent_order?.id; // сохраните в своей базе
console.log(first.recurrent_order?.pay_date_at); // дата следующего списания

if (subscriptionId !== undefined) {
  await sdk.api.orders.create({
    methodId: PAYMENT_METHOD.VISA_RUB,
    ip: '203.0.113.10',
    email: 'customer@example.com',
    amount: 299,
    paymentId: 'sub-1-2',
    recurrentOrderId: subscriptionId, // следующее списание по подписке
  });
}
```

Описание подписки (`description`) — от 10 до 200 символов.

## Выплаты

Выплаты используют тот же API-ключ и требуют осторожности: это вывод денег.

```ts
import { PAYMENT_METHOD } from '@exact-team/freekassa-sdk';

const payout = await sdk.api.withdrawals.create({
  methodId: PAYMENT_METHOD.SBP,
  account: 'ACCOUNT_NUMBER', // куда выплатить (номер счёта, карты или телефон)
  amount: 1000,
  paymentId: 'payout-1',
});
console.log(payout.data.id);

const history = await sdk.api.withdrawals.list({ page: 0 });
const methods = await sdk.api.withdrawals.currencies(); // доступные способы выплаты
```

`withdrawals.create` принимает `currency` (по умолчанию из конфига). Документация не описывает статусы выплат, поэтому SDK их не перечисляет.

## Валюты и аккаунт

```ts
import { PAYMENT_METHOD } from '@exact-team/freekassa-sdk';

const currencies = await sdk.api.currencies.list(); // платёжные системы и их доступность
const status = await sdk.api.currencies.status(PAYMENT_METHOD.SBP); // доступна ли система сейчас
const balance = await sdk.api.account.balance(); // балансы магазина
const shops = await sdk.api.account.shops(); // магазины аккаунта
```

## Статусы и константы

В примерах везде используются константы, а не числа и строки. Все они экспортируются из корня пакета.

### Статусы заказов (`ORDER_STATUS`)

Статусы заказа из раздела 2.3 документации:

| Значение | Константа                | Описание |
| -------- | ------------------------ | -------- |
| `0`      | `ORDER_STATUS.NEW`       | Новый    |
| `1`      | `ORDER_STATUS.PAID`      | Оплачен  |
| `6`      | `ORDER_STATUS.REFUND`    | Возврат  |
| `8`      | `ORDER_STATUS.ERROR`     | Ошибка   |
| `9`      | `ORDER_STATUS.CANCELLED` | Отмена   |

```ts
import { ORDER_STATUS } from '@exact-team/freekassa-sdk';

const list = await sdk.api.orders.list({ page: 0 });
for (const item of list.orders) {
  if (item.status === ORDER_STATUS.PAID) {
    console.log('оплачен:', item.fk_order_id);
  }
}
```

### Платёжные системы (`PAYMENT_METHOD`)

ID из раздела 1.8 документации. Используются как `methodId` (параметр `i`).

| ID  | Название в документации   | Константа             |
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

### Периоды рекуррентных платежей (`RECURRENT_PERIOD`)

Периоды из раздела 2.4 документации. Используются в `recurrent.period`.

| Значение | Константа                | Описание      |
| -------- | ------------------------ | ------------- |
| `day`    | `RECURRENT_PERIOD.DAY`   | Каждый день   |
| `week`   | `RECURRENT_PERIOD.WEEK`  | Каждую неделю |
| `month`  | `RECURRENT_PERIOD.MONTH` | Каждый месяц  |
| `year`   | `RECURRENT_PERIOD.YEAR`  | Каждый год    |

### Валюты и языки

- `CURRENCY` — `RUB`, `USD`, `EUR`, `UAH`, `KZT` (раздел 1.3). Список как массив: `CURRENCY_VALUES`.
- `LANG` — `ru`, `en`. Список: `LANG_VALUES`.
- Гарды для проверки строк из внешних источников: `isCurrencyGuard(value)`, `isLangGuard(value)`, `isStatusGuard(value)`.

```ts
import { CURRENCY, isCurrencyGuard } from '@exact-team/freekassa-sdk';

const currency: unknown = req.query.currency;
if (isCurrencyGuard(currency)) {
  // currency имеет тип TCurrency
}
console.log(CURRENCY.USD); // 'USD'
```

## Оповещения о платеже

После оплаты FreeKassa отправляет данные на URL оповещения, который указан в настройках магазина (GET или POST, form-data). SDK проверяет поля `MERCHANT_ID`, `AMOUNT`, `MERCHANT_ORDER_ID` и `SIGN`.

| Поле                | Описание                                             |
| ------------------- | ---------------------------------------------------- |
| `MERCHANT_ID`       | ID магазина                                          |
| `AMOUNT`            | Сумма платежа                                        |
| `intid`             | Номер операции во FreeKassa                          |
| `MERCHANT_ORDER_ID` | Ваш номер заказа (`paymentId`)                       |
| `P_EMAIL`           | Email плательщика                                    |
| `P_PHONE`           | Телефон плательщика, если указан                     |
| `CUR_ID`            | ID платёжной системы, которой заплатили              |
| `SIGN`              | MD5-подпись, проверяется `sdk.sci.verifyNotification` |
| `us_*`              | Ваши дополнительные поля из формы                    |
| `payer_account`     | Номер счёта или карты плательщика                    |
| `commission`        | Комиссия в валюте платежа                            |

Подтверждение: скрипт оповещения должен вернуть `YES` (`NOTIFICATION_ACK`). Если подтверждение включено в техподдержке FreeKassa, оповещение будет повторяться, пока вы не ответите `YES`. Поэтому обработка должна быть идемпотентной: проверяйте, не оплачен ли заказ уже, и не зачисляйте деньги дважды.

## Обработка ошибок

- **`FreekassaApiError`** — API ответил ошибкой: HTTP-статус не 2xx или `type` равен `STATUS.error` даже при HTTP 200. Поля: `status`, `body`. Сообщение: `Freekassa API error (HTTP 400): ...`.
- **`ZodError`** — входные данные не прошли проверку, запрос не отправлен. Список проблем в `error.issues`, у каждой указан путь к полю.
- **Сеть и таймаут** — `fetch` выбрасывает `TypeError` при сбое сети, после 30 секунд — `TimeoutError`. Это обычные ошибки, их можно поймать как `Error`.

```ts
import { FreekassaApiError } from '@exact-team/freekassa-sdk';
import { ZodError } from 'zod';

try {
  await sdk.api.orders.refund({ orderId: 555001 });
} catch (error) {
  if (error instanceof FreekassaApiError) {
    console.error(error.status, error.message, error.body); // API ответил ошибкой
  } else if (error instanceof ZodError) {
    console.error(error.issues); // неверные входные данные, запрос не отправлен
  } else {
    throw error; // сеть или таймаут
  }
}
```

## Конфигурация

```ts
new Freekassa({
  // обязательные
  key: string, // API-ключ, не пустой
  secretWord1: string, // секретное слово для подписи формы, не пустое
  secretWord2: string, // секретное слово 2 для оповещений, не пустое
  shopId: number, // ID магазина, целое положительное число
  lang: TLang, // значение LANG: язык платёжной формы
  currency: TCurrency, // значение CURRENCY: валюта по умолчанию

  // необязательные
  payUrl?: string, // по умолчанию 'https://pay.fk.money/', должен быть URL
  apiUrl?: string, // по умолчанию 'https://api.fk.life/v1/', должен быть URL
});
```

Неверная конфигурация выбрасывает `ZodError` при создании `Freekassa`, а не при первом запросе.

## Соответствие документации

Методы из [документации FreeKassa](https://docs.freekassa.net) реализованы и сверены с её OpenAPI-спецификацией:

| Документация                                   | SDK                                 |
| ---------------------------------------------- | ----------------------------------- |
| SCI: платёжная форма, `GET pay.fk.money`       | `sdk.sci.createPaymentLink`         |
| SCI: подпись формы (1.5)                       | `sdk.sci.signForm`                  |
| SCI: проверка оповещения и подписи (1.4, 1.7)  | `sdk.sci.verifyNotification`        |
| SCI: проверка IP отправителя оповещения (1.4)  | `sdk.sci.isNotificationIp`          |
| SCI: ответ `YES` на оповещение (1.4)           | `NOTIFICATION_ACK`                  |
| `POST /orders`                                 | `sdk.api.orders.list`               |
| `POST /orders/create`                          | `sdk.api.orders.create`             |
| `POST /orders/refund`                          | `sdk.api.orders.refund`             |
| `POST /withdrawals`                            | `sdk.api.withdrawals.list`          |
| `POST /withdrawals/create`                     | `sdk.api.withdrawals.create`        |
| `POST /withdrawals/currencies`                 | `sdk.api.withdrawals.currencies`    |
| `POST /currencies`                             | `sdk.api.currencies.list`           |
| `POST /currencies/{id}/status`                 | `sdk.api.currencies.status`         |
| `POST /balance`                                | `sdk.api.account.balance`           |
| `POST /shops`                                  | `sdk.api.account.shops`             |

Коды платёжных систем (раздел 1.8) — `PAYMENT_METHOD`, статусы заказов (2.3) — `ORDER_STATUS`, рекуррентные платежи (2.4) — поля `orders.create`, их периоды — `RECURRENT_PERIOD`.

**Не реализовано:** параметр `fields` у `getCurrencies`, о котором написано в описании `/orders/create`. В спецификации его нет ни в запросе, ни в ответе.

## Устаревшие методы

Плоские методы версии 0.0.x (`sdk.createOrder`, `sdk.getBalance` и т. д.) остаются обёртками над новыми модулями и помечены как `@deprecated`. Они будут удалены в версии **0.1.5**.

| Было                          | Стало                               |
| ----------------------------- | ----------------------------------- |
| `sdk.createPaymentLink`       | `sdk.sci.createPaymentLink`         |
| `sdk.verifyNotification`      | `sdk.sci.verifyNotification`        |
| `sdk.signForm`                | `sdk.sci.signForm`                  |
| `sdk.createOrder`             | `sdk.api.orders.create`             |
| `sdk.listOrders`              | `sdk.api.orders.list`               |
| `sdk.createWithdrawal`        | `sdk.api.withdrawals.create`        |
| `sdk.listWithdrawals`         | `sdk.api.withdrawals.list`          |
| `sdk.getWithdrawalCurrencies` | `sdk.api.withdrawals.currencies`    |
| `sdk.getCurrencies`           | `sdk.api.currencies.list`           |
| `sdk.getCurrencyStatus`       | `sdk.api.currencies.status`         |
| `sdk.getBalance`              | `sdk.api.account.balance`           |
| `sdk.getShops`                | `sdk.api.account.shops`             |

Аргументы `successUrl`, `failUrl` и `notifyUrl` удалены из `createPaymentLink`: в платёжной форме SCI они не поддерживаются, адреса возврата и оповещения задаются в настройках магазина.

## Использование модулей отдельно

Если нужна только форма или только API, создавайте модуль напрямую:

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

## Повторы, таймауты и идемпотентность

- **Повторов нет.** SDK не повторяет запросы сам. Ошибку сети или 5xx обрабатывайте в своём коде.
- **Таймаут 30 секунд** на каждый запрос. Значение фиксированное, настраивать его нельзя.
- **Создание заказа не идемпотентно.** Прежде чем создавать заказ повторно, проверьте список: `sdk.api.orders.list({ paymentId })`.
- **Оповещения могут повторяться.** Проверяйте, не обработан ли заказ, до зачисления денег.

## Архитектура

```
Freekassa (точка входа)
 ├── sci → FreekassaSCI         ссылка на форму, подписи, оповещения
 └── api → FreekassaApi         REST API
        ├── client      → ApiClient       JSON POST, подпись, nonce, таймаут, ошибки
        ├── orders      → OrdersApi       create, list, refund
        ├── withdrawals → WithdrawalsApi  create, list, currencies
        ├── currencies  → CurrenciesApi   list, status
        └── account     → AccountApi      balance, shops

commands/    zod-схемы запросов и ответов, типы, константы
core/        md5, HMAC-SHA256, сравнение подписей, округление сумм
common/      вспомогательные функции (разбор тела ответа, проверки)
```

## Карта экспортов

Всё перечисленное доступно из корня пакета (`import { ... } from '@exact-team/freekassa-sdk'`):

```
Классы:      Freekassa, FreekassaSCI, FreekassaApi, ApiClient,
             OrdersApi, WithdrawalsApi, CurrenciesApi, AccountApi,
             FreekassaApiError
Команды:     CreateOrderCommand, CreatePaymentLinkCommand, CreateWithdrawalCommand,
             CtrConfigCommand, GetBalanceCommand, GetCurrenciesCommand,
             GetCurrenciesStatusCommand, GetShopsCommand, GetWithdrawalsCurrenciesCommand,
             ListOrdersCommand, ListWithdrawalsCommand, NotificationCommand, RefundOrderCommand
Константы:   API, HTTP_METHOD, HTTP_HEADER, CONTENT_TYPE, SIGNATURE_SEPARATOR,
             CURRENCY, CURRENCY_VALUES, LANG, LANG_VALUES, STATUS, STATUS_VALUES,
             ORDER_STATUS, PAYMENT_METHOD, NOTIFICATION_ACK, FREEKASSA_NOTIFICATION_IPS,
             DEFAULT_PAY_URL, DEFAULT_API_URL, CUSTOM_FIELD_PREFIX,
             RECURRENT_FLAG, RECURRENT_PERIOD, RECURRENT_PERIOD_VALUES
Гарды:       isCurrencyGuard, isLangGuard, isStatusGuard
Типы:        IFreekassaSCIOptions, IFreekassaApiOptions, IApiClientOptions, IApiRequestBody, TCurrency, TLang, TOrderStatus, TPaymentMethod, TRecurrentPeriod
```

## Заметки по TypeScript

- Сборка для Node.js: CommonJS (`build/backend/index.js`) с типами `build/backend/index.d.ts`.
- Проверено на TypeScript 5.0.4 и 5.5.4.
- `zod` 4 — runtime-зависимость, ставится автоматически.
- Поле `browser` в `package.json` указывает на сборку, которая использует `node:crypto`, поэтому в браузере SDK не работает.

## Скрипты

```bash
npm run build          # очистка, сборка CommonJS и сборка для фронтенда
npm run typecheck      # tsc --noEmit
npm test               # тесты (node:test через ts-node)
npm run test:coverage  # тесты с покрытием, отчёт lcov в coverage/
npm run lint           # ESLint по src, tests и index.ts
npm run format         # Prettier --write
npm run format:check   # Prettier --check
```

## Вклад в проект

Нашли ошибку? Откройте [Issue](https://github.com/exact01/freekassa-sdk/issues). Опишите, что вы делали, что ожидали и что получили (код ошибки, модуль, версии SDK и Node). Не добавляйте в issue реальные API-ключи и данные транзакций.

Хотите предложить изменение? Пишите Pull Request из форка:

1. Сделайте форк репозитория кнопкой «Fork» и клонируйте его.
2. Создайте ветку от `main`:

   ```bash
   git clone git@github.com:<your-login>/freekassa-sdk.git
   cd freekassa-sdk
   npm install
   git checkout -b fix/my-fix
   ```

   Для линтера нужен Node.js 20.19+, 22.13+ или 24+.

3. Внесите изменения и проверьте:

   ```bash
   npm run typecheck     # TypeScript
   npm run lint          # ESLint
   npm run format:check  # Prettier (исправить: npm run format)
   npm test              # тесты
   npm run build         # сборка
   ```

4. Добавьте тесты для нового поведения. Контракт запросов — в `tests/contract.test.ts`, подписи — в `tests/sci.test.ts` и `tests/api.test.ts`.
5. Комментарии в коде пишите на английском.
6. Коммиты оформляйте с префиксом Conventional Commits, как в истории: `feat(...)`, `fix(...)`, `docs: ...`, `chore: ...`.
7. Отправьте ветку в свой форк и откройте Pull Request в `main`. Опишите, что изменили и зачем. Если PR закрывает issue, укажите `Closes #N`.

При установке через `npm install` Husky ставит git-хуки из `.husky/`: `pre-commit` проверяет формат, линтер и типы, `pre-push` запускает тесты. Пропустить их разово можно флагом `--no-verify`, но CI проверит те же шаги.

## Релиз

Релизы делают мейнтейнеры. Они меняют `version` в `package.json` и пушат тег, совпадающий с версией, без префикса `v`, например `0.0.25`. Тег запускает `deploy-lib.yml`: проверку версии, линтер, тесты, сборку и публикацию в npm с provenance. Контрибьюторам менять версию и создавать теги не нужно.

## Лицензия

ISC. См. [LICENSE](./LICENSE).
