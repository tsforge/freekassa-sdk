import { GetCurrenciesCommand, GetCurrenciesStatusCommand } from '../commands';
import { API } from './api';
import { ApiClient } from './api-client';

// Payment systems available for accepting payments
export class CurrenciesApi {
    constructor(private readonly client: ApiClient) {}

    public list(): Promise<GetCurrenciesCommand.IGetCurrenciesResponse> {
        return this.client.request(API.CURRENCIES);
    }

    // methodId — payment system ID, see PAYMENT_METHOD
    public async status(
        methodId: number,
    ): Promise<GetCurrenciesStatusCommand.IGetCurrenciesStatusResponse> {
        const { methodId: id } = GetCurrenciesStatusCommand.RequestGetCurrenciesStatusSchema.parse({
            methodId,
        });
        return this.client.request(API.CURRENCY_STATUS(id));
    }
}
