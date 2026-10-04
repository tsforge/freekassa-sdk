import { STATUS } from '../../../commands';
import { isObject } from '../is-object';

// The API can also return an error with HTTP 200
export const isErrorPayload = (data: unknown): boolean =>
    isObject(data) && data.type === STATUS.error;
