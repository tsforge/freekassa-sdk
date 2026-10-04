import { z } from 'zod';
import { CURRENCY_VALUES, DEFAULT_API_URL, DEFAULT_PAY_URL, LANG_VALUES } from './constants';

export namespace CtrConfigCommand {
    export const RequestCtrConfigSchema = z.object({
        key: z.string().min(1),
        secretWord1: z.string().min(1),
        secretWord2: z.string().min(1),
        shopId: z.number().int().positive(),
        payUrl: z.url().default(DEFAULT_PAY_URL),
        apiUrl: z.url().default(DEFAULT_API_URL),
        lang: z.enum(LANG_VALUES),
        currency: z.enum(CURRENCY_VALUES),
    });

    export type ICtrConfig = z.infer<typeof RequestCtrConfigSchema>;
    export type ICtrInput = z.input<typeof RequestCtrConfigSchema>;
}
