import { z } from 'zod';
import { CtrConfigCommand } from './ctr-config.command';
import { CUSTOM_FIELD_PREFIX, LANG_VALUES, STATUS_VALUES } from './constants';

export namespace CreatePaymentLinkCommand {
    const CUSTOM_KEY = new RegExp(`^${CUSTOM_FIELD_PREFIX}[A-Za-z0-9]+$`);

    export const RequestCreatePaymentLinkSchema = z.object({
        amount: z.number().positive(),
        paymentId: z.string().min(1),
        methodId: z.number().int().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        currency: CtrConfigCommand.RequestCtrConfigSchema.shape.currency.optional(),
        lang: z.enum(LANG_VALUES).optional(),
        // us_* fields come back in the notification. Key: us_ followed by latin letters and digits; value: latin letters, digits, "-", "_"
        custom: z
            .record(
                z.string(),
                z
                    .string()
                    .regex(
                        /^[A-Za-z0-9_-]*$/,
                        'Value may contain only Latin letters, digits, "-" and "_"',
                    ),
            )
            .superRefine((fields, ctx) => {
                for (const key of Object.keys(fields)) {
                    if (!CUSTOM_KEY.test(key)) {
                        ctx.addIssue({
                            code: 'custom',
                            path: [key],
                            message:
                                'Key must start with us_ and contain only Latin letters and digits',
                        });
                    }
                }
            })
            .optional(),
    });

    export type ICreatePaymentLink = z.infer<typeof RequestCreatePaymentLinkSchema>;
    export type ICreatePaymentLinkInput = z.input<typeof RequestCreatePaymentLinkSchema>;

    export const ResponseCreatePaymentLinkSchema = z.object({
        type: z.enum(STATUS_VALUES),
        message: z.string().optional(),
    });
    export type ICreatePaymentLinkResponse = z.infer<typeof ResponseCreatePaymentLinkSchema>;
}
