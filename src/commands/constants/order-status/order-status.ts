// Order statuses (section 2.3 of the documentation)
export const ORDER_STATUS = {
    NEW: 0,
    PAID: 1,
    REFUND: 6,
    ERROR: 8,
    CANCELLED: 9,
} as const;

export type TOrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
