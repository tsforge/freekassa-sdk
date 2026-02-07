export const LANG_VALUES = ['ru', 'en'] as const;

export type TLang = (typeof LANG_VALUES)[number];

export const LANG = {
    ru: 'ru',
    en: 'en',
} as const satisfies Record<TLang, TLang>;

export const isLangGuard = (value: unknown): value is TLang => LANG_VALUES.includes(value as TLang);
