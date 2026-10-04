// Parses the response body as JSON; returns undefined for an empty or non-JSON body
export const parseBody = <T>(text: string): T | undefined => {
    if (!text) {
        return undefined;
    }
    try {
        return JSON.parse(text) as T;
    } catch {
        return undefined;
    }
};
