export interface IApiRequestBody extends Record<string, unknown> {
    nonce?: number;
    signature?: string;
}
