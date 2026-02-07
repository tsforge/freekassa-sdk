import { z } from 'zod';
import { CURRENCY_VALUES, STATUS_VALUES } from './constants';

export namespace GetBalanceCommand {
    export const ResponseGetBalanceSchema = z.object({
        type: z.enum(STATUS_VALUES),
        balance: z.array(
            z.object({
                currency: z.enum(CURRENCY_VALUES),
                value: z.number(),
            }),
        ),
        message: z.string().optional(),
    });
    export type IGetBalanceResponse = z.infer<typeof ResponseGetBalanceSchema>;
}
