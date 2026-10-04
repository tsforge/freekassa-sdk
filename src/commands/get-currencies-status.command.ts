import { z } from 'zod';
import { STATUS_VALUES } from './constants';

export namespace GetCurrenciesStatusCommand {
    export const RequestGetCurrenciesStatusSchema = z.object({
        methodId: z.number().int(),
    });
    export type IGetCurrenciesStatus = z.infer<typeof RequestGetCurrenciesStatusSchema>;

    export const ResponseGetCurrenciesStatusSchema = z.object({
        type: z.enum(STATUS_VALUES),
        message: z.string().optional(),
    });
    export type IGetCurrenciesStatusResponse = z.infer<typeof ResponseGetCurrenciesStatusSchema>;
}
