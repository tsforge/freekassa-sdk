// FreeKassa protocol values from the documentation

// Response the notification script returns to confirm receipt (section 1.4)
export const NOTIFICATION_ACK = 'YES';

// IP addresses FreeKassa sends notifications from (section 1.4)
export const FREEKASSA_NOTIFICATION_IPS: readonly string[] = [
    '168.119.157.136',
    '168.119.60.227',
    '178.154.197.79',
    '51.250.54.238',
];

// Default URLs: payment form (section 1.3) and API (section 2.1)
export const DEFAULT_PAY_URL = 'https://pay.fk.money/';
export const DEFAULT_API_URL = 'https://api.fk.life/v1/';

// Prefix for extra payment form fields that come back in the notification (section 1.3)
export const CUSTOM_FIELD_PREFIX = 'us_';

// Recurring payment flag and periods (section 2.4)
export const RECURRENT_FLAG = 'Y';
export const RECURRENT_PERIOD = {
    DAY: 'day',
    WEEK: 'week',
    MONTH: 'month',
    YEAR: 'year',
} as const;
export const RECURRENT_PERIOD_VALUES = [
    RECURRENT_PERIOD.DAY,
    RECURRENT_PERIOD.WEEK,
    RECURRENT_PERIOD.MONTH,
    RECURRENT_PERIOD.YEAR,
] as const;

export type TRecurrentPeriod = (typeof RECURRENT_PERIOD_VALUES)[number];
