import { z } from 'zod';
import { STATUS_VALUES } from './constants';

export namespace GetBalanceCommand {
    export const ResponseGetBalanceSchema = z.object({
        type: z.enum(STATUS_VALUES),
        balance: z.array(
            z.object({
                currency: z.string(),
                value: z.number(),
            }),
        ),
        message: z.string().optional(),
    });
    export type IGetBalanceResponse = z.infer<typeof ResponseGetBalanceSchema>;
}
