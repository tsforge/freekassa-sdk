import { z } from 'zod';
import { CURRENCY_VALUES, LANG_VALUES } from './constants';

export namespace CtrConfigCommand {
    export const RequestCtrConfigSchema = z.object({
        key: z.string(),
        secretWord1: z.string(),
        secretWord2: z.string(),
        shopId: z.number(),
        payUrl: z.string().default('https://pay.fk.money/'),
        apiUrl: z.string().default('https://api.fk.life/v1/'),
        lang: z.enum(LANG_VALUES),
        currency: z.enum(CURRENCY_VALUES),
    });

    export type ICtrConfig = z.infer<typeof RequestCtrConfigSchema>;
    export type ICtrInput = z.input<typeof RequestCtrConfigSchema>;
}
