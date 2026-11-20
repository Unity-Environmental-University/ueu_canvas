import { IQueryParams, queryStringify } from "@/canvasUtils";

// Error type thrown when a Canvas request fails (non-2xx response).
export class FetchJsonError extends Error {
    name = "FetchJsonError";
    public status: number;
    public statusText: string;
    public body?: any;

    constructor(status: number, statusText: string, body?: any) {
        const message = body
            ? `Request failed with ${status} ${statusText}: ${JSON.stringify(body)}`
            : `Request failed with ${status} ${statusText}`;
        super(message);
        this.status = status;
        this.statusText = statusText;
        this.body = body;
    }
}

/**
 * Appends queryParams to a url using Canvas-style encoding (`include[]=a&include[]=b`, `a[b]=c`).
 * Joins with `&` when the url already has a query string.
 */
export function buildUrl(url: string, queryParams?: IQueryParams | null): string {
    if (!queryParams) return url;
    const query = queryStringify(queryParams).toString();
    if (query.length === 0) return url;
    return url + (url.includes('?') ? '&' : '?') + query;
}

/**
 * Calls fetch and throws a FetchJsonError (carrying the parsed error body, if any) when the response is not ok.
 */
export async function checkedFetch(url: string, fetchInit?: RequestInit): Promise<Response> {
    const response = await fetch(url, fetchInit);

    if (!response.ok) {
        console.error("Request failed - ", response.status, response.statusText, response.body);

        let errorBody: unknown;
        try {
            errorBody = await response.json();
        } catch {
            errorBody = undefined;
        }

        throw new FetchJsonError(response.status, response.statusText, errorBody);
    }

    return response;
}
