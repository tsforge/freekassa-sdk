import crypto from 'node:crypto';

export const hmacSha256Hex = (key: string, value: string): string =>
    crypto.createHmac('sha256', key).update(value).digest('hex');
