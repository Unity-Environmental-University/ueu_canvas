import {deepObjectMerge, formDataify, generatorMap, ICanvasCallConfig, IQueryParams} from "@/canvasUtils";

import {GetCourseOptions, GetCoursesFromAccountOptions, IGradingStandardData} from "./courseTypes";
import {Course} from "./Course";
import {Term} from "@canvas/term/Term";

import {ICourseData} from "@/types";
import {getPagedData, getPagedDataGenerator, mergePagedDataGenerators} from "@/fetch/getPagedDataGenerator";

import {fetchJson} from "@canvas/fetch/fetchJson";
import {overrideConfig} from "@canvas/fetch/utils";


export async function getGradingStandards(contextId: number, contextType: 'account' | 'course', config?: ICanvasCallConfig) {
    const url = `/api/v1/${contextType}s/${contextId}/grading_standards`
    return await getPagedData<IGradingStandardData>(url, config)
}


export function getCourseData(id: number, config?: ICanvasCallConfig<GetCourseOptions>) {
    const url = `/api/v1/courses/${id}`;
    return fetchJson(url, config) as Promise<ICourseData>;
}


export function getCourseDataGenerator(
    queryString: string | undefined | null, accountIds: number[] | number, term?: Term|number, config?: ICanvasCallConfig<GetCoursesFromAccountOptions>
): AsyncGenerator<ICourseData, void, unknown> {
    if (!Array.isArray(accountIds)) accountIds = [accountIds];

    const defaultConfig: ICanvasCallConfig<GetCoursesFromAccountOptions> = queryString ? {
        queryParams: {
            search_term: queryString,
        }
    } : {};

    const termId = typeof term ==='number' ? term : term?.id;
    if (termId && defaultConfig.queryParams) defaultConfig.queryParams.enrollment_term_id = termId;
    config = overrideConfig(defaultConfig, config);
    const generators = accountIds.map(accountId => {
        const url = `/api/v1/accounts/${accountId}/courses`;
        return getPagedDataGenerator<ICourseData>(url, config);
    })
    return mergePagedDataGenerators(generators);
}

export function getCourseGenerator(
    queryString: string | undefined | null, accountIds: number[] | number, term?: Term, config?: ICanvasCallConfig<GetCoursesFromAccountOptions>) {
    return generatorMap(getCourseDataGenerator(queryString, accountIds, term, config), courseData => new Course(courseData, config?.origin));
}

export async function getSingleCourse(queryString: string, accountIds: number[], term?: Term, config?: ICanvasCallConfig<GetCoursesFromAccountOptions>) {
    for (const accountId of accountIds) {
        const courseDatas = await fetchJson<ICourseData[]>(
            `/api/v1/accounts/${accountId}/courses`,
            overrideConfig({queryParams: {search_term: queryString}}, config)
        )

        if (courseDatas.length > 0) return new Course(courseDatas[0], config?.origin);
    }
    return undefined;
}

export async function getCourseById(id: number, config?: ICanvasCallConfig<GetCoursesFromAccountOptions>) {
    return new Course(await fetchJson(`/api/v1/courses/${id}`, config), config?.origin);
}

export async function createNewCourse(courseCode: string, accountId: number, name?: string, config?: ICanvasCallConfig) {
    name ??= courseCode;
    const createUrl = `/api/v1/accounts/${accountId}/courses/`
    const createConfig: ICanvasCallConfig = {
        fetchInit: {
            method: 'POST',
            body: formDataify({
                course: {
                    name,
                    course_code: courseCode
                }
            })
        }
    }
    return await fetchJson(createUrl, deepObjectMerge(createConfig, config, true)) as ICourseData;
}

export class CourseNotFoundException extends Error {
}

export async function saveCourseData(courseId: number, data: Partial<ICourseData>, config?: ICanvasCallConfig) {
    const url = `/api/v1/courses/${courseId}`
    return await fetchJson<ICourseData>(url, overrideConfig(config, {
        fetchInit: {
            method: 'PUT',
            body: formDataify({course: data})
        }
    }))
}

export async function setGradingStandardForCourse(courseId: number, standardId: number, config?: ICanvasCallConfig) {
    return await saveCourseData(courseId, {grading_standard_id: standardId})
}

export function getCourseName(data:ICourseData) {
    const [full, withoutCode] = /[^:]*:\s*(.*)/.exec(data.name) ?? [];
    if(withoutCode) return withoutCode;
    return data.name;

}