import crypto from 'node:crypto';
import {
    CreateOrderCommand,
    CreatePaymentLinkCommand,
    CtrConfigCommand,
    ListOrdersCommand,
    NotificationCommand,
    ListWithdrawalsCommand,
    CreateWithdrawalCommand,
    GetBalanceCommand,
    GetCurrenciesCommand,
    GetCurrenciesStatusCommand,
    GetWithdrawalsCurrenciesCommand,
    GetShopsCommand,
} from './commands';
import { API } from './api';
import { ApiRequestBody } from './interfaces';

export class Freekassa {
    private readonly key: CtrConfigCommand.ICtrConfig['key'];
    private readonly secretWord1: CtrConfigCommand.ICtrConfig['secretWord1'];
    private readonly secretWord2: CtrConfigCommand.ICtrConfig['secretWord2'];
    private readonly shopId: CtrConfigCommand.ICtrConfig['shopId'];
    private readonly payUrl: CtrConfigCommand.ICtrConfig['payUrl'];
    private readonly apiUrl: CtrConfigCommand.ICtrConfig['apiUrl'];
    private readonly lang: CtrConfigCommand.ICtrConfig['lang'];
    private readonly currency: CtrConfigCommand.ICtrConfig['currency'];

    constructor(config: CtrConfigCommand.ICtrConfig) {
        const parsedConfig = CtrConfigCommand.RequestCtrConfigSchema.parse(config);
        this.key = parsedConfig.key;
        this.secretWord1 = parsedConfig.secretWord1;
        this.secretWord2 = parsedConfig.secretWord2;
        this.shopId = parsedConfig.shopId;
        this.payUrl = parsedConfig.payUrl;
        this.apiUrl = parsedConfig.apiUrl;
        this.lang = parsedConfig.lang;
        this.currency = parsedConfig.currency;
    }

    private async request<T>(endpoint: string, data: ApiRequestBody): Promise<T> {
        const body = { ...data, nonce: Date.now().toString() };
        body.signature = this.signApi(body);

        const res = await fetch(`${this.apiUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Freekassa API error ${res.status}: ${text}`);
        }
        return res.json() as Promise<T>;
    }

    public signForm(
        amount: number,
        paymentId: string,
        currency: CtrConfigCommand.ICtrConfig['currency'],
    ): string {
        const str = `${this.shopId}:${amount}:${this.secretWord1}:${currency}:${paymentId}`;
        return crypto.createHash('md5').update(str).digest('hex');
    }

    // Построение URL для перенаправления на страницу оплаты
    public createPaymentLink(dto: CreatePaymentLinkCommand.ICreatePaymentLink): string {
        const params = CreatePaymentLinkCommand.RequestCreatePaymentLinkSchema.parse(dto);
        const actualCurrency = params.currency ? params.currency : this.currency;
        const s = this.signForm(params.amount, params.paymentId, actualCurrency);

        const q: Record<string, string> = {
            m: String(this.shopId),
            oa: String(params.amount),
            currency: actualCurrency,
            o: params.paymentId,
            s,
            lang: this.lang,
        };

        if (params.methodId) {
            q.i = String(params.methodId);
        }
        if (params.email) {
            q.em = params.email;
        }
        if (params.phone) {
            q.phone = params.phone;
        }
        if (params.successUrl) {
            q.success_url = params.successUrl;
        }
        if (params.failUrl) {
            q.failure_url = params.failUrl;
        }

        if (params.notifyUrl) {
            q.notification_url = params.notifyUrl;
        }

        return `${this.payUrl}?${new URLSearchParams(q).toString()}`;
    }

    // HMAC-SHA256 подпись для API-запросов
    private signApi(body: ApiRequestBody): string {
        const sorted = Object.keys(body)
            .sort()
            .map((k) => body[k])
            .join('|');
        return crypto.createHmac('sha256', this.key).update(sorted).digest('hex');
    }

    public verifyNotification(params: NotificationCommand.INotification): boolean {
        const { MERCHANT_ID, AMOUNT, MERCHANT_ORDER_ID, SIGN } = params;
        const raw = `${MERCHANT_ID}:${AMOUNT}:${this.secretWord2}:${MERCHANT_ORDER_ID}`;
        const expected = crypto.createHash('md5').update(raw).digest('hex');
        return expected.toLowerCase() === SIGN.toLowerCase();
    }

    public async listOrders(
        dto: ListOrdersCommand.IListOrders,
    ): Promise<ListOrdersCommand.IListOrdersResponse> {
        const options = ListOrdersCommand.RequestListOrdersSchema.parse(dto);

        const body: ApiRequestBody = { shopId: this.shopId };
        if (options) {
            if (options.paymentId) {
                body.paymentId = options.paymentId;
            }
            if (options.orderId) {
                body.orderId = options.orderId;
            }
            if (options.status !== undefined) {
                body.orderStatus = options.status;
            }
            if (options.dateFrom) {
                body.dateFrom = options.dateFrom;
            }
            if (options.dateTo) {
                body.dateTo = options.dateTo;
            }
            if (options.page) {
                body.page = options.page;
            }
        }
        return this.request(API.LIST_ORDERS, body);
    }

    public async createOrder(
        dto: CreateOrderCommand.ICreateOrder,
    ): Promise<CreateOrderCommand.ICreateOrderResponse> {
        const dtoParsed = CreateOrderCommand.RequestCreateOrderSchema.parse(dto);
        const body: ApiRequestBody = {
            shopId: this.shopId,
            i: dtoParsed.methodId,
            ip: dtoParsed.ip,
            email: dtoParsed.email,
            amount: dtoParsed.amount,
            currency: dto.currency ? dto.currency : this.currency,
            paymentId: dtoParsed.paymentId,
        };

        if (dtoParsed.phone) {
            body.tel = dtoParsed.phone;
        }

        if (dtoParsed.successUrl) {
            body.success_url = dtoParsed.successUrl;
        }

        if (dtoParsed.failUrl) {
            body.failure_url = dtoParsed.failUrl;
        }

        if (dtoParsed.notifyUrl) {
            body.notification_url = dtoParsed.notifyUrl;
        }

        return this.request(API.CREATE_ORDER, body);
    }

    // Список и создание выплат
    public async listWithdrawals(
        options?: ListWithdrawalsCommand.IListWithdrawals,
    ): Promise<ListWithdrawalsCommand.IListWithdrawalsResponse> {
        const body: ApiRequestBody = { shopId: this.shopId };
        if (options) {
            if (options.orderId) {
                body.orderId = options.orderId;
            }
            if (options.paymentId) {
                body.paymentId = options.paymentId;
            }
            if (options.status !== undefined) {
                body.orderStatus = options.status;
            }
            if (options.dateFrom) {
                body.dateFrom = options.dateFrom;
            }
            if (options.dateTo) {
                body.dateTo = options.dateTo;
            }
            if (options.page) {
                body.page = options.page;
            }
        }
        return this.request(API.WITHDRAWALS, body);
    }

    public async createWithdrawal(
        options: CreateWithdrawalCommand.ICreateWithdrawal,
    ): Promise<CreateWithdrawalCommand.ICreateWithdrawalResponse> {
        const body: ApiRequestBody = {
            shopId: this.shopId,
            i: options.methodId,
            account: options.account,
            amount: options.amount,
            currency: this.currency,
            paymentId: options.paymentId,
        };
        return this.request(API.CREATE_WITHDRAWAL, body);
    }

    public async getBalance(): Promise<GetBalanceCommand.IGetBalanceResponse> {
        return this.request<GetBalanceCommand.IGetBalanceResponse>(API.BALANCE, {
            shopId: this.shopId,
        });
    }

    public async getCurrencies(): Promise<GetCurrenciesCommand.IGetCurrenciesResponse> {
        return this.request<GetCurrenciesCommand.IGetCurrenciesResponse>(API.CURRENCIES, {
            shopId: this.shopId,
        });
    }

    public async getCurrencyStatus(
        methodId: number,
    ): Promise<GetCurrenciesStatusCommand.IGetCurrenciesStatusResponse> {
        return this.request<GetCurrenciesStatusCommand.IGetCurrenciesStatusResponse>(
            API.CURRENCY_STATUS(methodId),
            { shopId: this.shopId },
        );
    }

    public async getWithdrawalCurrencies(): Promise<GetWithdrawalsCurrenciesCommand.IGetWithdrawalsCurrenciesResponse> {
        return this.request<GetWithdrawalsCurrenciesCommand.IGetWithdrawalsCurrenciesResponse>(
            API.WITHDRAWAL_CURRENCIES,
            { shopId: this.shopId },
        );
    }

    public async getShops(): Promise<GetShopsCommand.IGetShopsResponse> {
        return this.request<GetShopsCommand.IGetShopsResponse>(API.SHOPS, { shopId: this.shopId });
    }
}
