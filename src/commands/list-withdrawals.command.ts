import { z } from 'zod';
import { STATUS_VALUES } from './constants';

export namespace ListWithdrawalsCommand {
    export const RequestListWithdrawalsSchema = z.object({
        orderId: z.number().optional(),
        paymentId: z.string().optional(),
        status: z.number().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        page: z.number().optional(),
    });

    export type IListWithdrawals = z.infer<typeof RequestListWithdrawalsSchema>;
    export type IListWithdrawalsInput = z.input<typeof RequestListWithdrawalsSchema>;

    export const ResponseListWithdrawalsSchema = z.object({
        type: z.enum(STATUS_VALUES),
        message: z.string().optional(),
        pages: z.number(),
        orders: z.array(
            z.object({
                id: z.number(),
                amount: z.number(),
                currency: z.string(),
                ext_currency_id: z.number(),
                account: z.string(),
                date: z.string(),
                status: z.number(),
            }),
        ),
    });
    export type IListWithdrawalsResponse = z.infer<typeof ResponseListWithdrawalsSchema>;
}
