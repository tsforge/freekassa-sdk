export const CURRENCY_VALUES = ['RUB', 'USD', 'EUR', 'UAH', 'KZT'] as const;

export type TCurrency = (typeof CURRENCY_VALUES)[number];

export const CURRENCY = {
    RUB: 'RUB',
    USD: 'USD',
    EUR: 'EUR',
    UAH: 'UAH',
    KZT: 'KZT',
} as const satisfies Record<TCurrency, TCurrency>;

export const isCurrencyGuard = (value: unknown): value is TCurrency =>
    CURRENCY_VALUES.includes(value as TCurrency);
