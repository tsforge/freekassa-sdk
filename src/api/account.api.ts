import { GetBalanceCommand, GetShopsCommand } from '../commands';
import { API } from './api';
import { ApiClient } from './api-client';

// Account info: balance and shops
export class AccountApi {
    constructor(private readonly client: ApiClient) {}

    public balance(): Promise<GetBalanceCommand.IGetBalanceResponse> {
        return this.client.request(API.BALANCE);
    }

    public shops(): Promise<GetShopsCommand.IGetShopsResponse> {
        return this.client.request(API.SHOPS);
    }
}
