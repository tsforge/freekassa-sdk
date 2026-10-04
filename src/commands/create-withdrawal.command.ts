import { z } from 'zod';
import { STATUS_VALUES } from './constants';
import { CtrConfigCommand } from './ctr-config.command';

export namespace CreateWithdrawalCommand {
    export const RequestCreateWithdrawalSchema = z.object({
        methodId: z.number().int(),
        account: z.string(),
        amount: z.number().positive(),
        paymentId: z.string().min(1).optional(),
        currency: CtrConfigCommand.RequestCtrConfigSchema.shape.currency.optional(),
    });

    export type ICreateWithdrawal = z.infer<typeof RequestCreateWithdrawalSchema>;
    export type ICreateWithdrawalInput = z.input<typeof RequestCreateWithdrawalSchema>;

    export const ResponseCreateWithdrawalSchema = z.object({
        type: z.enum(STATUS_VALUES),
        data: z.object({
            id: z.number(),
        }),
        message: z.string().optional(),
    });
    export type ICreateWithdrawalResponse = z.infer<typeof ResponseCreateWithdrawalSchema>;
}
