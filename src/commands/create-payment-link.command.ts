import { z } from 'zod';
import { CtrConfigCommand } from './ctr-config.command';

export namespace CreatePaymentLinkCommand {
    export const RequestCreatePaymentLinkSchema = z.object({
        amount: z.number(),
        paymentId: z.string(),
        methodId: z.number().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        successUrl: z.string().optional(),
        failUrl: z.string().optional(),
        notifyUrl: z.string().optional(),
        currency: CtrConfigCommand.RequestCtrConfigSchema.shape.currency.optional(),
    });

    export type ICreatePaymentLink = z.infer<typeof RequestCreatePaymentLinkSchema>;
    export type ICreatePaymentLinkInput = z.input<typeof RequestCreatePaymentLinkSchema>;

    export const ResponseCreatePaymentLinkSchema = z.object({
        type: z.enum(['success', 'error']),
        message: z.string().optional(),
    });
    export type ICreatePaymentLinkResponse = z.infer<typeof ResponseCreatePaymentLinkSchema>;
}
