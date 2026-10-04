import { TCurrency, TLang } from '../commands';

export interface IFreekassaSCIOptions {
    shopId: number;
    secretWord1: string;
    secretWord2: string;
    payUrl: string;
    lang: TLang;
    currency: TCurrency;
}
