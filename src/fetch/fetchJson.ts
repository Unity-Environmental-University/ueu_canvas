import { ICanvasCallConfig } from "@/canvasUtils";
import { buildUrl, checkedFetch, FetchJsonError } from "@/fetch/checkedFetch";
import { withOrigin } from "@/fetch/withOrigin";

export { FetchJsonError };

export async function fetchJson<T = Record<string, any>>(
	url: string,
	config: ICanvasCallConfig | null = null,
): Promise<T> {
	const match = url.search(/^(\/|\w+:\/\/)/);
	if (match < 0) throw new Error("url does not start with / or http");
	url = buildUrl(url, config?.queryParams);
	config ??= {};
	url = withOrigin(url, config.origin);

	const response = await checkedFetch(url, config.fetchInit);

	const responseJson = (await response.json()) as
		(T & { retrieved_at?: string }) | undefined;
	if (!responseJson) throw new Error("Could not fetch json");

	responseJson.retrieved_at = new Date().toISOString();
	return responseJson;
}
