import { TCurrency } from '../commands';

export interface IFreekassaApiOptions {
    key: string;
    shopId: number;
    apiUrl: string;
    currency: TCurrency;
}
