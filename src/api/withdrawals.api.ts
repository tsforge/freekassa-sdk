import {
    CreateWithdrawalCommand,
    GetWithdrawalsCurrenciesCommand,
    ListWithdrawalsCommand,
    TCurrency,
} from '../commands';
import { normalizeAmount } from '../core';
import { API } from './api';
import { ApiClient } from './api-client';

// Withdrawals: list, create, payment systems available for withdrawals
export class WithdrawalsApi {
    constructor(
        private readonly client: ApiClient,
        private readonly currency: TCurrency,
    ) {}

    public async list(
        dto: ListWithdrawalsCommand.IListWithdrawalsInput = {},
    ): Promise<ListWithdrawalsCommand.IListWithdrawalsResponse> {
        const filter = ListWithdrawalsCommand.RequestListWithdrawalsSchema.parse(dto);
        return this.client.request(API.WITHDRAWALS, {
            orderId: filter.orderId,
            paymentId: filter.paymentId,
            orderStatus: filter.status,
            dateFrom: filter.dateFrom,
            dateTo: filter.dateTo,
            page: filter.page,
        });
    }

    public async create(
        dto: CreateWithdrawalCommand.ICreateWithdrawalInput,
    ): Promise<CreateWithdrawalCommand.ICreateWithdrawalResponse> {
        const withdrawal = CreateWithdrawalCommand.RequestCreateWithdrawalSchema.parse(dto);
        return this.client.request(API.CREATE_WITHDRAWAL, {
            i: withdrawal.methodId,
            account: withdrawal.account,
            amount: normalizeAmount(withdrawal.amount),
            currency: withdrawal.currency ?? this.currency,
            paymentId: withdrawal.paymentId,
        });
    }

    public currencies(): Promise<GetWithdrawalsCurrenciesCommand.IGetWithdrawalsCurrenciesResponse> {
        return this.client.request(API.WITHDRAWAL_CURRENCIES);
    }
}
