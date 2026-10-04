import { z } from 'zod';

export namespace NotificationCommand {
    export const RequestNotificationSchema = z
        .object({
            MERCHANT_ID: z.string(),
            AMOUNT: z.string(),
            MERCHANT_ORDER_ID: z.string(),
            SIGN: z.string(),
            intid: z.string().optional(),
            P_EMAIL: z.string().optional(),
            P_PHONE: z.string().optional(),
            CUR_ID: z.string().optional(),
            payer_account: z.string().optional(),
            commission: z.string().optional(),
        })
        .catchall(z.unknown());
    export type INotification = z.infer<typeof RequestNotificationSchema>;
    export type INotificationInput = z.input<typeof RequestNotificationSchema>;
}
