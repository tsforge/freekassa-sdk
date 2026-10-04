import { z } from 'zod';
import { ORDER_STATUS, STATUS_VALUES } from './constants';

export namespace ListOrdersCommand {
    export const RequestListOrdersSchema = z.object({
        paymentId: z.string().optional(),
        orderId: z.number().int().optional(),
        status: z.nativeEnum(ORDER_STATUS).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        page: z.number().int().min(0).optional(),
    });

    export type IListOrders = z.infer<typeof RequestListOrdersSchema>;
    export type IListOrdersInput = z.input<typeof RequestListOrdersSchema>;

    export const ResponseListOrdersSchema = z.object({
        type: z.enum(STATUS_VALUES),
        pages: z.number(),
        orders: z.array(
            z.object({
                merchant_order_id: z.string(),
                fk_order_id: z.number(),
                amount: z.number(),
                currency: z.string(),
                email: z.string(),
                account: z.string(),
                date: z.string(),
                status: z.number(),
            }),
        ),
    });
    export type IListOrdersResponse = z.infer<typeof ResponseListOrdersSchema>;
}
