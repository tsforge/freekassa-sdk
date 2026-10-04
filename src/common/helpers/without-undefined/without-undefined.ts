// Drops keys with undefined values, so they are neither sent nor signed
export const withoutUndefined = (
    params: Record<string, string | number | undefined>,
): Record<string, string | number> => {
    const result: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
            result[key] = value;
        }
    }
    return result;
};
