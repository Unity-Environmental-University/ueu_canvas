import {DEV_TEMPLATE_COURSE_ID, REFERENCES_PAGE_URL_NAME} from "@/consts";
import {IPageData} from "@/content/pages/types";
import {Page} from "@/content/pages/Page";
import PageKind from "@/content/pages/PageKind";


const url = `/api/v1/courses/${DEV_TEMPLATE_COURSE_ID}/pages/${REFERENCES_PAGE_URL_NAME}`;

export enum ReferenceExportType {
    string,
    pageData,
    page,
}

export function getReferenceTemplate() : Promise<string|undefined>;
export function getReferenceTemplate(type: ReferenceExportType.string) : Promise<string|undefined>;
export function getReferenceTemplate(type: ReferenceExportType.pageData) : Promise<IPageData|undefined>;
export async function getReferenceTemplate(type: ReferenceExportType.page) : Promise<Page|undefined>;
export async function getReferenceTemplate(type?: NonNullable<unknown>) {
    const pageData = await PageKind.getByString(DEV_TEMPLATE_COURSE_ID, REFERENCES_PAGE_URL_NAME)

    if(typeof type === 'undefined' || type === ReferenceExportType.string) return 'body' in pageData ? pageData.body : pageData.message;
    if('message' in pageData) return undefined;
    if(type === ReferenceExportType.pageData) return pageData;
    if(type === ReferenceExportType.page) return pageData ? new Page(pageData, DEV_TEMPLATE_COURSE_ID) : undefined;
}

export default getReferenceTemplate;