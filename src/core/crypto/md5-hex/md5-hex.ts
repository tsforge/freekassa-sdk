import crypto from 'node:crypto';

export const md5Hex = (value: string): string =>
    crypto.createHash('md5').update(value).digest('hex');
