import { ICanvasCallConfig } from "@/canvasUtils";

// Error type returned when a fetchJson request fails (non-2xx response).
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

export async function fetchJson<T = Record<string, any>>(
    url: string, config: ICanvasCallConfig | null = null
): Promise<T> {
    const match = url.search(/^(\/|\w+:\/\/)/);
    if (match < 0) throw new Error("url does not start with / or http")
    if (config?.queryParams) {
        url += '?' + new URLSearchParams(config.queryParams);
    }
    config ??= {};


	const response = await fetch(url, config.fetchInit);

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

    const responseJson = await response.json() as (T & { retrieved_at?: string }) | undefined;
    if(!responseJson) throw new Error("Could not fetch json");

    responseJson.retrieved_at = new Date().toISOString();
    return responseJson;
}
