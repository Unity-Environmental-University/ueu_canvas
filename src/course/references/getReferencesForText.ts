import {fetchJson} from "@/fetch/fetchJson";
import {IQueryParams} from "@/canvasUtils";
import {apiGetConfig} from "@canvas/fetch/apiGetConfig";
import { getInstance } from "@/instance";

export async function getReferencesForText(text:string, userEmail:string, queryParams?:IQueryParams) {
    queryParams ??= {};
    queryParams.email = userEmail;
    const result = await fetchJson(getInstance().externalApis.citeas, apiGetConfig(queryParams))
    return result;
}

export default getReferencesForText;
