export const STATUS_VALUES = ['success', 'error'] as const;

export type TStatus = (typeof STATUS_VALUES)[number];

export const STATUS = {
    success: 'success',
    error: 'error',
} as const satisfies Record<TStatus, TStatus>;

export const isStatusGuard = (value: unknown): value is TStatus =>
    STATUS_VALUES.includes(value as TStatus);
