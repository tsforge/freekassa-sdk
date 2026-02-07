import { z } from 'zod';
import { STATUS_VALUES } from './constants';

export namespace ListOrdersCommand {
    export const RequestListOrdersSchema = z.object({
        paymentId: z.string().optional(),
        orderId: z.number().optional(),
        status: z.union([z.literal(0), z.literal(1), z.literal(8), z.literal(9)]).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        page: z.number().optional(),
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
