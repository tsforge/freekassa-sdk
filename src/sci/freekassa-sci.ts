import {
    CreatePaymentLinkCommand,
    FREEKASSA_NOTIFICATION_IPS,
    NotificationCommand,
    TCurrency,
} from '../commands';
import { md5Hex, normalizeAmount, safeEqual } from '../core';
import { IFreekassaSCIOptions } from '../interfaces';

// SCI: payment form (GET to pay.fk.money) and notification verification
export class FreekassaSCI {
    constructor(private readonly options: IFreekassaSCIOptions) {}

    // md5("shopId:amount:secretWord1:currency:paymentId")
    public signForm(
        amount: number,
        paymentId: string,
        currency: TCurrency = this.options.currency,
    ): string {
        const { shopId, secretWord1 } = this.options;
        return md5Hex(
            `${shopId}:${normalizeAmount(amount)}:${secretWord1}:${currency}:${paymentId}`,
        );
    }

    // Payment form link. us_* fields come back in the notification
    public createPaymentLink(dto: CreatePaymentLinkCommand.ICreatePaymentLinkInput): string {
        const params = CreatePaymentLinkCommand.RequestCreatePaymentLinkSchema.parse(dto);
        const currency = params.currency ?? this.options.currency;

        const query: Record<string, string> = {
            m: String(this.options.shopId),
            oa: String(normalizeAmount(params.amount)),
            currency,
            o: params.paymentId,
            s: this.signForm(params.amount, params.paymentId, currency),
            lang: params.lang ?? this.options.lang,
        };
        if (params.methodId !== undefined) {
            query.i = String(params.methodId);
        }
        if (params.email) {
            query.em = params.email;
        }
        if (params.phone) {
            query.phone = params.phone;
        }
        Object.assign(query, params.custom);

        const url = new URL(this.options.payUrl);
        for (const [key, value] of Object.entries(query)) {
            url.searchParams.set(key, value);
        }
        return url.toString();
    }

    // Accepts the notification request data as is; invalid data returns false
    // md5("MERCHANT_ID:AMOUNT:secretWord2:MERCHANT_ORDER_ID")
    public verifyNotification(params: unknown): boolean {
        const parsed = NotificationCommand.RequestNotificationSchema.safeParse(params);
        if (!parsed.success) {
            return false;
        }
        const { MERCHANT_ID, AMOUNT, MERCHANT_ORDER_ID, SIGN } = parsed.data;
        const expected = md5Hex(
            `${MERCHANT_ID}:${AMOUNT}:${this.options.secretWord2}:${MERCHANT_ORDER_ID}`,
        );
        return safeEqual(expected, SIGN);
    }

    public isNotificationIp(ip: string): boolean {
        return FREEKASSA_NOTIFICATION_IPS.includes(ip);
    }
}
