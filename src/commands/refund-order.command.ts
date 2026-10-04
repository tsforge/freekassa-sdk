import { z } from 'zod';
import { STATUS_VALUES } from './constants';

export namespace RefundOrderCommand {
    export const RequestRefundOrderSchema = z
        .object({
            orderId: z.number().int().optional(),
            paymentId: z.string().min(1).optional(),
            // Without an amount, the whole payment is refunded
            amount: z.number().positive().optional(),
        })
        .refine((value) => value.orderId !== undefined || value.paymentId !== undefined, {
            message: 'Provide orderId or paymentId',
        });

    export type IRefundOrder = z.infer<typeof RequestRefundOrderSchema>;
    export type IRefundOrderInput = z.input<typeof RequestRefundOrderSchema>;

    export const ResponseRefundOrderSchema = z.object({
        type: z.enum(STATUS_VALUES),
        id: z.number(),
        message: z.string().optional(),
    });
    export type IRefundOrderResponse = z.infer<typeof ResponseRefundOrderSchema>;
}
