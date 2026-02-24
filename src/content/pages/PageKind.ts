import {fetchJson} from "@/fetch/fetchJson";
import {getPagedDataGenerator} from "@/fetch/getPagedDataGenerator";
import {IPageData} from "@/content/pages/types";
import {
    ContentKind,
    contentUrlFuncs,
    courseContentUrlFunc,
    postContentFunc,
    putContentFunc
} from "@/content/ContentKind";

export const PageUrlFuncs = contentUrlFuncs('pages')
export type GetPageOptions = Record<string, any>;
export type SavePageOptions = Record<string, any>;
export type GetByStringIdOptions = Record<string, any>;


const getStringApiUrl = courseContentUrlFunc<string>(`/api/v1/courses/{courseId}/pages/{contentId}`)

export const PageKind: Required<
    ContentKind<IPageData, GetPageOptions, SavePageOptions>
>= {
    ...PageUrlFuncs,
    dataIsThisKind: (data): data is IPageData => {
        return 'page_id' in data
    },
    getName: page => page.title,
    getBody: page => page.body,
    getId: page => page.page_id,
    get: (id, courseId, config) =>
        fetchJson(PageUrlFuncs.getApiUrl(courseId, id), config),
    getByString: (courseId, contentId, config) =>
        fetchJson<IPageData|{message: string}>(getStringApiUrl(courseId, contentId), config),
    dataGenerator: (courseId, config = { queryParams: {include: ['body']}}) =>
        getPagedDataGenerator(PageUrlFuncs.getAllApiUrl(courseId), config),
    put: putContentFunc(PageUrlFuncs.getApiUrl),
    post: postContentFunc(PageUrlFuncs.getAllApiUrl),
}

export default PageKind;