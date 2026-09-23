import { getTemplateCourseId, getReferencesPageSlug } from "@/consts";
import {IPageData} from "@/content/pages/types";
import {Page} from "@/content/pages/Page";
import PageKind from "@/content/pages/PageKind";

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
    const courseId = getTemplateCourseId();
    const pageSlug = getReferencesPageSlug();
    const pageData = await PageKind.getByString(courseId, pageSlug)

    if(typeof type === 'undefined' || type === ReferenceExportType.string) return 'body' in pageData ? pageData.body : pageData.message;
    if('message' in pageData) return undefined;
    if(type === ReferenceExportType.pageData) return pageData;
    if(type === ReferenceExportType.page) return pageData ? new Page(pageData, courseId) : undefined;
}

export default getReferenceTemplate;
