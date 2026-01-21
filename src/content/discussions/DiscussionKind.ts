import {ICanvasCallConfig} from "@/canvasUtils";
import {fetchJson} from "@/fetch/fetchJson";
import {getPagedDataGenerator} from "@/fetch/getPagedDataGenerator";
import {ContentKind, contentUrlFuncs, putContentFunc} from "@/content/ContentKind";


import {IDiscussionData, SaveDiscussionData} from "@canvas/content/types";

export type GetDiscussionOptions = Record<string, any>;
export const discussionUrlFuncs = contentUrlFuncs('discussion_topics');
export const DiscussionKind: ContentKind<
    IDiscussionData,
    GetDiscussionOptions,
    SaveDiscussionData
> = {
    ...discussionUrlFuncs,
    dataIsThisKind(data): data is IDiscussionData {
        return data.hasOwnProperty('discussion_type');
    },
    getId: (data) => data.id,
    getName: (data) => data.title,
    getBody: (data) => data.message,
    async get(courseId: number, contentId: number, config?: ICanvasCallConfig<GetDiscussionOptions>) {
        return await fetchJson(discussionUrlFuncs.getApiUrl(courseId, contentId), config) as IDiscussionData;
    },
    dataGenerator: (courseId, config) => getPagedDataGenerator<IDiscussionData>(discussionUrlFuncs.getAllApiUrl(courseId), config),
    put: putContentFunc<SaveDiscussionData, IDiscussionData>(discussionUrlFuncs.getApiUrl),
}

export default DiscussionKind;