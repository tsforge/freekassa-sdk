import { z } from 'zod';
import { STATUS_VALUES } from './constants';

export namespace GetWithdrawalsCurrenciesCommand {
    export const ResponseGetWithdrawalsCurrenciesSchema = z.object({
        type: z.enum(STATUS_VALUES),
        message: z.string().optional(),
        currencies: z.array(
            z.object({
                id: z.number(),
                name: z.string(),
                min: z.number(),
                max: z.number(),
                currency: z.string(),
                can_exchange: z.number(),
            }),
        ),
    });
    export type IGetWithdrawalsCurrenciesResponse = z.infer<
        typeof ResponseGetWithdrawalsCurrenciesSchema
    >;
}
