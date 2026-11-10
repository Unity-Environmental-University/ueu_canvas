import { CanvasData } from "@/canvasDataDefs";
import { ICanvasCallConfig } from "@/canvasUtils";
import { withOrigin } from "@/fetch/withOrigin";
import { buildUrl, checkedFetch } from "@/fetch/checkedFetch";

// Wrapper to fetch a paged dataset and return as an array, by consuming the generator
export async function getPagedData<T extends CanvasData = CanvasData>(
	url: string,
	config: ICanvasCallConfig | null = null,
): Promise<T[]> {
	const generator = getPagedDataGenerator<T>(url, config);
	const out: T[] = [];
	for await (const value of generator) {
		out.push(value);
	}
	return out;
}

// Merges multiple asynchronous paginated data generators into a single generator.
export async function* mergePagedDataGenerators<
	T extends CanvasData = CanvasData,
	Return = T[],
>(generators: AsyncGenerator<T, Return, void>[]) {
	for (const generator of generators) {
		for await (const result of generator) {
			yield result;
		}
	}
}

/**
 * Handles the response data from a Canvas API call, normalizing it into an array of `CanvasData` objects.
 *
 * This function accepts various formats of the data (single object, array of objects, or a keyed object containing arrays of objects),
 * and ensures the result is always an array. If no valid array is found, it returns an empty array and logs a warning.
 */
function handleResponseData<T extends CanvasData>(
	data: undefined | null | T | T[] | { [key: string]: T[] },
	url: string,
): T[] {
	if (typeof data === "undefined" || data == null) {
		console.warn(`no data found for ${url}`);
		return [] as T[];
	}
	if (typeof data === "object" && !Array.isArray(data)) {
		const values = Array.from(Object.values(data));
		if (values) {
			data = values.find((a) => Array.isArray(a)) as T[];
		}
	}
	if (!Array.isArray(data)) {
		console.warn(`No valid data found for ${url}`);
		return [] as T[];
	}
	return data;
}

/**
 * Async generator function that retrieves paged data from a Canvas API endpoint.
 * It sends HTTP GET requests to the provided URL, processes the results, and iterates
 * through all pages of data, yielding each individual item.
 *
 * The generator automatically handles pagination by examining the 'Link' header
 * returned in each response and fetching the next page as long as a 'next' link is available.
 */
export async function* getPagedDataGenerator<T extends CanvasData = CanvasData>(
	url: string,
	config: ICanvasCallConfig | null = null,
): AsyncGenerator<T> {
	url = withOrigin(url, config?.origin);
	if (config?.queryParams) {
		url = buildUrl(url, config.queryParams);
	}

	if (url.includes("undefined")) {
		console.warn(url);
	}

	// Initial request
	let response = await checkedFetch(url, config?.fetchInit);
	const data = handleResponseData<T>(await response.json(), url);
	if (data.length === 0) return data;
	for (const value of data) yield value;

	let nextPageLink = getNextLink(response);
	while (nextPageLink) {
		response = await checkedFetch(nextPageLink, config?.fetchInit);
		const responseData = handleResponseData<T>(await response.json(), url);

		for (const value of responseData) {
			value.retrieved_at = new Date().toISOString();
			yield value;
		}
		nextPageLink = getNextLink(response);
	}
}

/**
 * Returns the url of the `rel="next"` entry of a response's Link header, or null if there is none.
 */
function getNextLink(response: Response): string | null {
	const header = response.headers?.get("Link");
	if (!header) return null;
	for (const entry of header.split(/,\s*(?=<)/)) {
		const match = entry.match(/^\s*<([^>]*)>(.*)$/);
		if (!match) continue;
		const [, link, params] = match;
		const rel = params.match(/;\s*rel\s*=\s*(?:"([^"]*)"|([^\s;,]+))/i);
		const rels = (rel?.[1] ?? rel?.[2] ?? "").toLowerCase().split(/\s+/);
		if (rels.includes("next")) return link;
	}
	return null;
}
