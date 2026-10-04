import { IFreekassaApiOptions } from '../interfaces';
import { AccountApi } from './account.api';
import { ApiClient } from './api-client';
import { CurrenciesApi } from './currencies.api';
import { OrdersApi } from './orders.api';
import { WithdrawalsApi } from './withdrawals.api';

// REST API composition: one transport, separate resources on top of it
export class FreekassaApi {
    public readonly client: ApiClient;
    public readonly orders: OrdersApi;
    public readonly withdrawals: WithdrawalsApi;
    public readonly currencies: CurrenciesApi;
    public readonly account: AccountApi;

    constructor(options: IFreekassaApiOptions) {
        this.client = new ApiClient(options);
        this.orders = new OrdersApi(this.client, options.currency);
        this.withdrawals = new WithdrawalsApi(this.client, options.currency);
        this.currencies = new CurrenciesApi(this.client);
        this.account = new AccountApi(this.client);
    }
}
