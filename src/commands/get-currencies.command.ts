import { z } from 'zod';
import { STATUS_VALUES } from './constants';

export namespace GetCurrenciesCommand {
    export const ResponseGetCurrenciesSchema = z.object({
        type: z.enum(STATUS_VALUES),
        currencies: z.array(
            z.object({
                id: z.number(),
                name: z.string(),
                currency: z.string(),
                is_enabled: z.number(),
                is_favorite: z.number(),
            }),
        ),
        message: z.string().optional(),
    });
    export type IGetCurrenciesResponse = z.infer<typeof ResponseGetCurrenciesSchema>;
}
