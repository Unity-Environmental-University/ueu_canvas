import {fetchJson} from "@/fetch/fetchJson";
import {IQueryParams} from "@/canvasUtils";
import {apiGetConfig} from "@canvas/fetch/apiGetConfig";

const baseUrl = 'https://api.citeas.org/product'

export async function getReferencesForText(text:string, userEmail:string, queryParams?:IQueryParams) {
    queryParams ??= {};
    queryParams.email = userEmail;
    const result = await fetchJson(baseUrl, apiGetConfig(queryParams))
    return result;
}

export default getReferencesForText;