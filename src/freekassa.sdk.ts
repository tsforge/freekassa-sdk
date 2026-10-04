import { FreekassaApi } from './api';
import {
    CreateOrderCommand,
    CreatePaymentLinkCommand,
    CreateWithdrawalCommand,
    CtrConfigCommand,
    GetBalanceCommand,
    GetCurrenciesCommand,
    GetCurrenciesStatusCommand,
    GetShopsCommand,
    GetWithdrawalsCurrenciesCommand,
    ListOrdersCommand,
    ListWithdrawalsCommand,
    TCurrency,
} from './commands';
import { FreekassaSCI } from './sci';

// Entry point: composition of SCI (payment form and notifications) and the REST API
export class Freekassa {
    public readonly sci: FreekassaSCI;
    public readonly api: FreekassaApi;

    constructor(config: CtrConfigCommand.ICtrInput) {
        const parsed = CtrConfigCommand.RequestCtrConfigSchema.parse(config);
        this.sci = new FreekassaSCI(parsed);
        this.api = new FreekassaApi(parsed);
    }

    // Flat methods of version 0.0.x are kept as wrappers over sdk.sci and sdk.api.
    // Will be removed in version 0.1.5.

    /** @deprecated Use `sdk.sci.signForm` instead. Will be removed in version 0.1.5. */
    public signForm(amount: number, paymentId: string, currency?: TCurrency): string {
        return this.sci.signForm(amount, paymentId, currency);
    }

    /** @deprecated Use `sdk.sci.createPaymentLink` instead. Will be removed in version 0.1.5. */
    public createPaymentLink(dto: CreatePaymentLinkCommand.ICreatePaymentLinkInput): string {
        return this.sci.createPaymentLink(dto);
    }

    /** @deprecated Use `sdk.sci.verifyNotification` instead. Will be removed in version 0.1.5. */
    public verifyNotification(params: unknown): boolean {
        return this.sci.verifyNotification(params);
    }

    /** @deprecated Use `sdk.api.orders.list` instead. Will be removed in version 0.1.5. */
    public listOrders(
        dto?: ListOrdersCommand.IListOrdersInput,
    ): Promise<ListOrdersCommand.IListOrdersResponse> {
        return this.api.orders.list(dto);
    }

    /** @deprecated Use `sdk.api.orders.create` instead. Will be removed in version 0.1.5. */
    public createOrder(
        dto: CreateOrderCommand.ICreateOrderInput,
    ): Promise<CreateOrderCommand.ICreateOrderResponse> {
        return this.api.orders.create(dto);
    }

    /** @deprecated Use `sdk.api.withdrawals.list` instead. Will be removed in version 0.1.5. */
    public listWithdrawals(
        options?: ListWithdrawalsCommand.IListWithdrawalsInput,
    ): Promise<ListWithdrawalsCommand.IListWithdrawalsResponse> {
        return this.api.withdrawals.list(options);
    }

    /** @deprecated Use `sdk.api.withdrawals.create` instead. Will be removed in version 0.1.5. */
    public createWithdrawal(
        options: CreateWithdrawalCommand.ICreateWithdrawalInput,
    ): Promise<CreateWithdrawalCommand.ICreateWithdrawalResponse> {
        return this.api.withdrawals.create(options);
    }

    /** @deprecated Use `sdk.api.account.balance` instead. Will be removed in version 0.1.5. */
    public getBalance(): Promise<GetBalanceCommand.IGetBalanceResponse> {
        return this.api.account.balance();
    }

    /** @deprecated Use `sdk.api.currencies.list` instead. Will be removed in version 0.1.5. */
    public getCurrencies(): Promise<GetCurrenciesCommand.IGetCurrenciesResponse> {
        return this.api.currencies.list();
    }

    /** @deprecated Use `sdk.api.currencies.status` instead. Will be removed in version 0.1.5. */
    public getCurrencyStatus(
        methodId: number,
    ): Promise<GetCurrenciesStatusCommand.IGetCurrenciesStatusResponse> {
        return this.api.currencies.status(methodId);
    }

    /** @deprecated Use `sdk.api.withdrawals.currencies` instead. Will be removed in version 0.1.5. */
    public getWithdrawalCurrencies(): Promise<GetWithdrawalsCurrenciesCommand.IGetWithdrawalsCurrenciesResponse> {
        return this.api.withdrawals.currencies();
    }

    /** @deprecated Use `sdk.api.account.shops` instead. Will be removed in version 0.1.5. */
    public getShops(): Promise<GetShopsCommand.IGetShopsResponse> {
        return this.api.account.shops();
    }
}
