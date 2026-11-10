import {Temporal} from "temporal-polyfill";
import {IModuleData, IModuleItemData} from "../canvasDataDefs";
import {formDataify, ICanvasCallConfig} from "../canvasUtils";


import {fetchJson} from "@canvas/fetch/fetchJson";
import {Page} from "@canvas/content/pages/Page";
import {getPagedDataGenerator} from "@canvas/fetch/getPagedDataGenerator";
import {IPageData} from "@canvas/content/pages/types";
import {Discussion} from "@canvas/content/discussions/Discussion";

export interface IModuleHaver {
    getModules(config: ICanvasCallConfig): IModuleData[],
}

export interface GenerateModulesOptions {
    include?: ('items' | 'content_details')[],
    search_term?: string,
    student_id?: string
}


export async function saveModuleItem(
    courseId:number,
    moduleId:number,
    moduleItemId: number,
    moduleItem: Partial<IModuleItemData>
) {
    return await fetchJson(`/api/v1/courses/${courseId}/modules/${moduleId}/modules/items/${moduleItemId}`, {
        fetchInit: {
            method: "PUT",
            body: formDataify({ moduleItem: moduleItem }),
        }
    })
}

export function moduleGenerator(courseId:number, config?: ICanvasCallConfig<GenerateModulesOptions>) {
    return getPagedDataGenerator<IModuleData>(`/api/v1/courses/${courseId}/modules`, config);
}

export async function changeModuleLockDate(courseId: number, module: IModuleData, targetDate: Temporal.PlainDate) {
    const payload = {
        module: {
            unlock_at: targetDate.toString()
        }
    }
    const url = `/api/v1/courses/${courseId}/modules/${module.id}`;
    return await fetchJson<IModuleData>(url, {
        fetchInit: {
            method: 'PUT',
            body: formDataify(payload)
        }
    })
}


export async function getModuleOverview(module: IModuleData, courseId: number) {
    const overview = module.items.find(item =>
        item.type === "Page" &&
        item.title.toLowerCase().includes('overview')
    );
    if (!overview?.url) return; //skip this if it's not an overview

    const url = overview.url.replace(/.*\/api\/v1/, '/api/v1')
    const pageData = await fetchJson(url) as IPageData;
    return new Page(pageData, courseId);
}

export function getModuleWeekNumber(module: Record<string, any>) {
    const regex = /(week|module) (\d+)/i;
    const match = module.name.match(regex);
    let weekNumber = !match ? null : Number(match[1]);
    if (!weekNumber) {
        for (const moduleItem of module.items) {
            if (!moduleItem.hasOwnProperty('title')) {
                continue;
            }
            const match = moduleItem.title.match(regex);
            if (match) {
                weekNumber = match[2];
            }
        }
    }
    return weekNumber;
}

export async function getModulesByWeekNumber(modules: IModuleData[]) {
    const modulesByWeekNumber: Record<string | number, IModuleData> = {};
    for (const module of modules) {
        const weekNumber = getModuleWeekNumber(module);
        if (weekNumber) {
            modulesByWeekNumber[weekNumber] = module;
        }
    }
    return modulesByWeekNumber;
}

const isModuleItemTypeFunc = <T extends IModuleItemData>(typeString: string) => (item: IModuleItemData): item is T => {
    return item.type === typeString;
}

export type PageItemData = IModuleItemData & { type: "Page" };
export const isPageItemData = isModuleItemTypeFunc<PageItemData>("Page");

export type AssignmentItemData = IModuleItemData & { type: "Assignment"; };
export const isAssignmentItemData = isModuleItemTypeFunc<AssignmentItemData>("Assignment");

export type DiscussionItemData = IModuleItemData & { type: "Discussion"; };
export const isDiscussionItemData = isModuleItemTypeFunc<DiscussionItemData>("Discussion");

export type QuizItemData = IModuleItemData & { type: "Quiz"; };
export const isQuizItemData = isModuleItemTypeFunc<QuizItemData>("Quiz");

