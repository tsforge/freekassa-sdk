import { z } from 'zod';
import { CtrConfigCommand } from './ctr-config.command';
import { RECURRENT_PERIOD_VALUES, STATUS_VALUES } from './constants';

export namespace CreateOrderCommand {
    // Recurring payment: the first order is created with recurrent, the next ones with recurrentOrderId
    export const RecurrentSchema = z.object({
        period: z.enum(RECURRENT_PERIOD_VALUES),
        description: z.string().min(10).max(200),
    });

    export const RequestCreateOrderSchema = z.object({
        methodId: z.number().int(),
        ip: z.string(),
        amount: z.number().positive(),
        paymentId: z.string().min(1).optional(),
        currency: CtrConfigCommand.RequestCtrConfigSchema.shape.currency.optional(),
        email: z.string(),
        phone: z.string().optional(),
        successUrl: z.string().optional(),
        failUrl: z.string().optional(),
        notifyUrl: z.string().optional(),
        recurrent: RecurrentSchema.optional(),
        recurrentOrderId: z.number().int().optional(),
    });

    export type ICreateOrder = z.infer<typeof RequestCreateOrderSchema>;
    export type ICreateOrderInput = z.input<typeof RequestCreateOrderSchema>;

    export const ResponseCreateOrderSchema = z.object({
        type: z.enum(STATUS_VALUES),
        orderId: z.number(),
        orderHash: z.string(),
        location: z.string(),
        recurrent_order: z
            .object({
                id: z.number(),
                pay_date_at: z.string(),
            })
            .optional(),
    });
    export type ICreateOrderResponse = z.infer<typeof ResponseCreateOrderSchema>;
}
