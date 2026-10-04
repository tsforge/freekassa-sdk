// All API endpoints accept only POST with a JSON body (section 2.1 of the documentation)
export const HTTP_METHOD = {
    POST: 'POST',
} as const;

export const HTTP_HEADER = {
    CONTENT_TYPE: 'Content-Type',
} as const;

export const CONTENT_TYPE = {
    JSON: 'application/json',
} as const;

// Separator for the values in the API request signature (section 2.2 of the documentation)
export const SIGNATURE_SEPARATOR = '|';

export const API = {
    LIST_ORDERS: '/orders',
    CREATE_ORDER: '/orders/create',
    REFUND_ORDER: '/orders/refund',
    WITHDRAWALS: '/withdrawals',
    CREATE_WITHDRAWAL: '/withdrawals/create',
    BALANCE: '/balance',
    CURRENCIES: '/currencies',
    CURRENCY_STATUS: (methodId: number) => `/currencies/${methodId}/status`,
    WITHDRAWAL_CURRENCIES: '/withdrawals/currencies',
    SHOPS: '/shops',
};
