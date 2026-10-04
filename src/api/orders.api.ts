import {
    CreateOrderCommand,
    ListOrdersCommand,
    RECURRENT_FLAG,
    RefundOrderCommand,
    TCurrency,
} from '../commands';
import { normalizeAmount } from '../core';
import { API } from './api';
import { ApiClient } from './api-client';

// Orders: list, create an order with a payment link, refund
export class OrdersApi {
    constructor(
        private readonly client: ApiClient,
        private readonly currency: TCurrency,
    ) {}

    public async list(
        dto: ListOrdersCommand.IListOrdersInput = {},
    ): Promise<ListOrdersCommand.IListOrdersResponse> {
        const filter = ListOrdersCommand.RequestListOrdersSchema.parse(dto);
        return this.client.request(API.LIST_ORDERS, {
            orderId: filter.orderId,
            paymentId: filter.paymentId,
            orderStatus: filter.status,
            dateFrom: filter.dateFrom,
            dateTo: filter.dateTo,
            page: filter.page,
        });
    }

    public async create(
        dto: CreateOrderCommand.ICreateOrderInput,
    ): Promise<CreateOrderCommand.ICreateOrderResponse> {
        const order = CreateOrderCommand.RequestCreateOrderSchema.parse(dto);
        return this.client.request(API.CREATE_ORDER, {
            i: order.methodId,
            ip: order.ip,
            email: order.email,
            amount: normalizeAmount(order.amount),
            currency: order.currency ?? this.currency,
            paymentId: order.paymentId,
            tel: order.phone,
            success_url: order.successUrl,
            failure_url: order.failUrl,
            notification_url: order.notifyUrl,
            recurrent: order.recurrent ? RECURRENT_FLAG : undefined,
            recurrent_period: order.recurrent?.period,
            recurrent_description: order.recurrent?.description,
            recurrent_order_id: order.recurrentOrderId,
        });
    }

    public async refund(
        dto: RefundOrderCommand.IRefundOrderInput,
    ): Promise<RefundOrderCommand.IRefundOrderResponse> {
        const refund = RefundOrderCommand.RequestRefundOrderSchema.parse(dto);
        return this.client.request(API.REFUND_ORDER, {
            orderId: refund.orderId,
            paymentId: refund.paymentId,
            orderAmount: refund.amount !== undefined ? normalizeAmount(refund.amount) : undefined,
        });
    }
}
