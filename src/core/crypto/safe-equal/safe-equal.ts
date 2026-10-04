import crypto from 'node:crypto';

// Exact signature comparison, as in the documentation, without timing leaks
export const safeEqual = (expected: string, actual: string): boolean => {
    const left = Buffer.from(expected);
    const right = Buffer.from(actual);
    return left.length === right.length && crypto.timingSafeEqual(left, right);
};
