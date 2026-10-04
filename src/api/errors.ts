export class FreekassaApiError extends Error {
    public readonly status: number;
    public readonly body: unknown;

    constructor(message: string, status: number, body: unknown) {
        super(message);
        this.name = 'FreekassaApiError';
        this.status = status;
        this.body = body;
    }
}
