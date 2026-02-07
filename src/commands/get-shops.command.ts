import { z } from 'zod';
import { STATUS_VALUES } from './constants';

export namespace GetShopsCommand {
    export const ResponseGetShopsSchema = z.object({
        type: z.enum(STATUS_VALUES),
        shops: z.array(
            z.object({
                id: z.number(),
                name: z.string(),
                url: z.string(),
            }),
        ),
        message: z.string().optional(),
    });
    export type IGetShopsResponse = z.infer<typeof ResponseGetShopsSchema>;
}
