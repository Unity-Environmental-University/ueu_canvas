import {CanvasData} from "@/canvasDataDefs";
import {ICanvasCallConfig} from "@/canvasUtils";
import {buildUrl, checkedFetch} from "@/fetch/checkedFetch";

/**
 * @param url The entire path of the url
 * @param config a configuration object of type ICanvasCallConfig
 * @returns {Promise<Record<string, any>[]>}
 */
export async function getPagedData<T extends CanvasData = CanvasData>(
    url: string, config: ICanvasCallConfig | null = null
): Promise<T[]> {

    const generator = getPagedDataGenerator<T>(url, config);

    const out: T[] = [];
    for await (const value of generator) {
        out.push(value);
    }
    return out;
}

/**
 * Merges multiple asynchronous paginated data generators into a single generator.
 *
 * This function combines the results of multiple paginated data generators into a unified stream. Each generator
 * is processed sequentially, and its results are yielded one by one as they become available. This allows for
 * easy handling of multiple paginated API requests or data sources in parallel without needing to collect all
 * results in memory at once.
 *
 * The function is particularly useful when dealing with multiple sources of paginated data (e.g., multiple API
 * endpoints) that need to be processed as one continuous stream of results, without waiting for all pages from one
 * source to finish before beginning to process the next.
 *
 * @template T - A type parameter that extends `CanvasData`, ensuring that the data being yielded is in a format consistent
 *               with Canvas API data structures.
 * @param {AsyncGenerator<T, T[], void>[]} generators - An array of asynchronous generators, each of which yields paginated
 *               results of type `T`. These could represent different paginated data sources that are combined into a single stream.
 *
 * @yields {T} - The function yields items of type `T` as they are retrieved from each generator in sequence.
 *
 * @example
 * // Example usage combining two paginated API responses into a single data stream
 * const generator1 = fetchPagedDataFromSource1();
 * const generator2 = fetchPagedDataFromSource2();
 *
 * for await (const data of mergePagedDataGenerators([generator1, generator2])) {
 *     console.log(data); // Process each item from both generators as a single stream
 * }
 *
 */
export async function* mergePagedDataGenerators<T extends CanvasData = CanvasData, Return = T[]>(generators: AsyncGenerator<T, Return, void>[]) {
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
 *
 * @template T - A type that extends `CanvasData`.
 * @param {T | T[] | { [key: string]: T[] }} data - The response data to process. This can be a single object, an array of objects,
 *        or a keyed object where the values are arrays of objects.
 * @param {string} url - The URL from which the data was retrieved, used for logging purposes if no valid data is found.
 * @returns {T[]} An array of `CanvasData` objects, or an empty array if no valid array of data is present.
 */
function handleResponseData<T extends CanvasData>(data: undefined | null | T | T[] | { [key: string]: T[] }, url: string): T[] {
    if(typeof data === 'undefined' || data == null) {
        console.warn(`no data found for ${url}`)
        return [] as T[]
    }
    if (typeof data === 'object' && !Array.isArray(data)) {
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
 *
 * @template T - A generic type parameter extending CanvasData to represent the structure of the data.
 * @param {string} url - The full URL for the API request. If the `queryParams` option is provided in the config, it appends the query parameters to the URL.
 * @param {ICanvasCallConfig | null} [config=null] - Optional configuration object for the request, including query parameters and additional fetch options like headers.
 * @yields {T} - Yields individual items of the retrieved data from each page, one at a time.
 *
 * @throws {FetchJsonError} - If any page request returns a non-2xx response. If the URL contains "undefined", a warning is logged to the console.
 *
 * @example
 * ```
 * const generator = getPagedDataGenerator<MyDataType>('https://canvas.example.com/api/data', config);
 * for await (const item of generator) {
 *     console.log(item);  // Handle each item individually
 * }
 * ```
 */
export async function* getPagedDataGenerator<T extends CanvasData = CanvasData>(
    url: string, config: ICanvasCallConfig | null = null
): AsyncGenerator<T> {

    url = buildUrl(url, config?.queryParams);

    if (url.includes('undefined')) {
        console.warn(url);
    }


    /* Returns a list of data from a GET request, going through multiple pages of data requests as necessary */
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
 * Only the rel parameter is matched, so urls that merely contain "next" (e.g. in a search_term) are not followed.
 */
function getNextLink(response: Response): string | null {
    const header = response.headers?.get("Link");
    if (!header) return null;
    for (const entry of header.split(/,\s*(?=<)/)) {
        const match = entry.match(/^\s*<([^>]*)>(.*)$/);
        if (!match) continue;
        const [, link, params] = match;
        const rel = params.match(/;\s*rel\s*=\s*(?:"([^"]*)"|([^\s;,]+))/i);
        const rels = (rel?.[1] ?? rel?.[2] ?? '').toLowerCase().split(/\s+/);
        if (rels.includes('next')) return link;
    }
    return null;
}