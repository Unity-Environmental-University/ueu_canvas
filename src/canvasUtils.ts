import assert from "assert";
import {IModuleItemData, ModuleItemType, RestrictModuleItemType} from "./canvasDataDefs";


import {Course} from "./course/Course";

import {ICourseData} from "@/types";

import {fetchJson} from "@/fetch/fetchJson";


import {IPageData} from "@/content/pages/types";


type FuncType<T> = FuncObject<T> | WithoutParamsFuncType<T> | WithParamsFuncType<T>
type WithoutParamsFuncType<T> = () => T;
type FunctionParamsType<T> = (FuncType<T> extends WithoutParamsFuncType<T> ? undefined : any);
type FuncObject<T> = { func: WithParamsFuncType<T>, params: FunctionParamsType<T> }
type WithParamsFuncType<T> = (params: FunctionParamsType<T>) => T;
type PassedInParamsType<T> = FunctionParamsType<T>;

function isWithParamsFunc<T>(func: FuncObject<T> | WithParamsFuncType<T> | WithoutParamsFuncType<T>): func is WithParamsFuncType<T> {
    return typeof func === 'function' && func.length > 0;
}

function isWithoutParamsFunc<T>(
    func: FuncObject<T> | WithParamsFuncType<T> | WithoutParamsFuncType<T>): func is WithoutParamsFuncType<T> {
    return typeof func === 'function' && func.length === 0;
}


/**
 * Takes in a list of functions and calls all of them, returning the result.
 * This is an abomination.
 * @param funcs A list of functions, or a list of { func, params } pairs to run, passing params into func
 * @param params optional params to pass into each run of the function
 */
function callAll<T>(funcs: (() => T)[]): T[]
function callAll<T, ParamType>(funcs: { func: (params: ParamType) => T, params: ParamType }[]): T[]
function callAll<T, ParamType>(funcs: ((params: ParamType) => T)[], params: ParamType): T[]
function callAll<T>(funcs: FuncType<T>[] | WithParamsFuncType<T>[], params?: PassedInParamsType<T>) {
    const output: T[] = [];

    for (const func of funcs) {
        if ((typeof func === 'object')) {
            output.push(func.func(func.params))
            continue;
        }
        if (isWithoutParamsFunc(func)) {
            output.push(func());
            continue;
        }
        if (isWithParamsFunc(func) && typeof params !== 'undefined') {
            output.push(func(params));
        }
    }
    return output;
}

export {callAll}

/**
 * Traverses up the DOM and finds a parent with a matching Tag
 * @param el
 * @param tagName
 */
export function parentElement(el: Element | null, tagName: string) {
    if (!el) return null;
    while (el && el.parentElement) {
        el = el.parentElement;
        if (el.tagName && el.tagName.toLowerCase() == tagName) {
            return el;
        }
    }
    return null;
}


export interface IQueryParams extends Record<string, any> {
    include?: (string | number)[]
}

export interface ICanvasCallConfig<QueryParamsType extends IQueryParams = IQueryParams> {
    fetchInit?: RequestInit,
    queryParams?: QueryParamsType
}

const type_lut: Record<ModuleItemType, RestrictModuleItemType | null> = {
    Assignment: 'assignment',
    Discussion: 'discussion_topic',
    Quiz: 'quiz',
    ExternalTool: 'external_tool',
    File: 'attachment',
    Page: 'wiki_page',
    ExternalUrl: null, //Not passable to restrict
    SubHeader: null, //Not passable to restrict
    Subheader: null, //Deprecated misspelling of SubHeader

}

export function formDataify(data: Record<string, any>) {
    const formData = new FormData();
    for (const key in data) {
        addToFormData(formData, key, data[key]);
    }

    if (document) {
        const el: HTMLInputElement | null = document.querySelector("input[name='authenticity_token']");
        const authenticityToken = el ? el.value : null;
        const cookies = getCookies();
        let csrfToken = cookies['_csrf_token'];
        if (authenticityToken) formData.append('authenticity_token', authenticityToken);
        else if (csrfToken) {
            csrfToken = csrfToken.replaceAll(/%([0-9A-F]{2})/g, (substring, hex) => {
                const hexCode = hex;
                return String.fromCharCode(parseInt(hexCode, 16))
            })

            console.log(csrfToken);
            formData.append('authenticity_token', csrfToken);
        }
    }
    return formData;
}


export function deepObjectCopy<T extends ReturnType<typeof deepObjectMerge> & ({} | [])>(
    toCopy: T,
    complexObjectsTracker: Array<unknown> = [],
) {
    return deepObjectMerge(toCopy, {} as T, true, complexObjectsTracker) as T;
}


export function deepObjectMerge<
    Return extends string | number | object | Record<string, any> | null | undefined | []
>(
    a: Return,
    b: Return,
    overrideWithA: boolean = false,
    complexObjectsTracker: Array<unknown> = [],
): Return {
    for (const value of [a, b]) {
        if (typeof value == "object" &&
            complexObjectsTracker.includes(value)) throw new Error(`Infinite Loop: Element ${value} contains itself`);
    }

    //if the types don't match
    if (a && b && (
        typeof a !== typeof b ||
        Array.isArray(a) != Array.isArray(b)
    )) {
        if (a === b) return a;
        if (overrideWithA) return a;
        throw new Error(`Type clash on merge ${typeof a} ${a}, ${typeof b} ${b}`);
    }

    //If either or both are arrays, merge if able to
    if (Array.isArray(a)) {
        if (!b) return deepObjectCopy(a, complexObjectsTracker);
        assert(Array.isArray(b), "We should not get here if b is not an array")
        const mergedArray = [...a, ...b];
        const outputArray = mergedArray.map(value => {
            if (!value) return value;
            if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
                //Make a deep of any object literal
                if (!value) return value;
                value = deepObjectCopy(value, [...complexObjectsTracker, a, b]);
            }
            return value;
        }) as Return
        return outputArray;
    }

    if (Array.isArray(b)) return deepObjectCopy(b, complexObjectsTracker); //we already know A is not an array at this point, return a deep copy of b
    if ((a && typeof a === 'object') || (b && typeof b === 'object')) {
        if (a instanceof File && b instanceof File) {
            if (!overrideWithA) assert(a.size == b.size && a.name == b.name, `File value clash ${a.name} ${b.name}`);
            return a;
        }
        if (a && Object.getPrototypeOf(a) != Object.prototype
            || b && Object.getPrototypeOf(b) != Object.prototype) {
            if (!overrideWithA) assert(!a || !b || a === b, `Non-mergeable object clash ${a} ${b}`);
            if (a) return a;
            if (b) return b;
        }
        if (a && !b) return deepObjectCopy(a, complexObjectsTracker);
        if (b && !a) return deepObjectCopy(b, complexObjectsTracker);


        assert(a && typeof a === 'object' && Object.getPrototypeOf(a) === Object.prototype, "a should always be defined here.")
        assert(b && typeof b === 'object' && Object.getPrototypeOf(b) === Object.prototype, "b should always be defined here.")

        const allKeys = [...Object.keys(a), ...Object.keys(b)].filter(filterUniqueFunc);
        const aRecord: Record<string, any> = a;
        const bRecord: Record<string, any> = b;

        const entries = allKeys.map((key: string) => [
            key,
            deepObjectMerge(aRecord[key], bRecord[key], overrideWithA, [...complexObjectsTracker, a, b])
        ]);
        return Object.fromEntries(entries)
    }
    if (a && b) {
        if (overrideWithA || a === b) return a;
        throw new Error(`Values unmergeable, ${a}>:${typeof a}, ${b} ${typeof b}`)
    }
    if (a) return a;
    if (b) return b;
    if (a === null) return a;
    if (b === null) return b;
    assert(typeof a === 'undefined')
    return a;
}

export interface FormMergeOutput {
    [key: string]: FormMergeOutput | FormDataEntryValue | FormDataEntryValue[]
}

export function deFormDataify(formData: FormData) {
    return [...formData.entries()].reduce((aggregator, [key, value]) => {
        const isArray = key.includes('[]');
        const keys = key.split('[').map(key => key.replaceAll(/[\[\]]/g, ''));
        if (isArray) keys.pop(); //remove the last, empty, key if it's an array
        let currentValue: FormDataEntryValue | FormDataEntryValue[] | FormMergeOutput = isArray ? [value] : value;
        while (keys.length > 0) {
            let newValue: Record<string, any>;
            newValue = {
                [keys.pop() as string]: currentValue
            };
            currentValue = newValue;

        }
        return deepObjectMerge(aggregator, currentValue as FormMergeOutput) || {...aggregator};
    }, {} as FormMergeOutput);
}


function getCookies() {
    const cookieString = document.cookie;
    const cookies = cookieString.split('; ')
    const out: Record<string, string> = {};
    for (const cookie of cookies) {
        const [key, value] = cookie.split('=')
        out[key] = value;
    }
    return out;
}

/**
 * Adds arrays and objects in the form formData posts expects
 * @param formData
 * @param key
 * @param value
 */
function addToFormData(formData: FormData, key: string, value: any | Record<string, any> | []) {
    if (Array.isArray(value)) {
        for (const item of value) {
            addToFormData(formData, `${key}[]`, item);
        }
    } else if (typeof value === 'object') {
        for (const itemKey in value) {
            const itemValue = value[itemKey];
            addToFormData(formData, key.length > 0 ? `${key}[${itemKey}]` : itemKey, itemValue);
        }
    } else {
        formData.append(key, value);
    }
}


export function queryStringify(data: Record<string, any>) {
    const searchParams = new URLSearchParams();
    for (const key in data) {
        addToQuery(searchParams, key, data[key])
    }

    return searchParams;
}

function addToQuery(searchParams: URLSearchParams, key: string, value: any | Record<string, any> | []) {
    if (Array.isArray(value)) {
        for (const item of value) {
            addToQuery(searchParams, `${key}[]`, item);
        }
    } else if (typeof value === 'object') {
        for (const itemKey in value) {
            const itemValue = value[itemKey];
            addToQuery(searchParams, key.length > 0 ? `${key}[${itemKey}]` : itemKey, itemValue);
        }
    } else {
        searchParams.append(key, value)
    }
}


/**
 * Takes in a module item and returns an object specifying its type and content id
 * @param item
 */
export async function getItemTypeAndId(
    item: IModuleItemData
): Promise<{ type: RestrictModuleItemType | null, id: number }> {
    let id;
    let type;
    assert(type_lut.hasOwnProperty(item.type), "Unexpected type " + item.type);

    type = type_lut[item.type];
    if (type === "wiki_page") {
        assert(item.url); //wiki_page items always have a url param
        const pageData = await fetchJson(item.url) as IPageData;
        id = pageData.page_id;
    } else {
        id = item.content_id;
    }

    return {type, id}
}

/**
 * @param queryParams
 * @returns {URLSearchParams} The correctly formatted parameters
 */
export function searchParamsFromObject(queryParams: string[][] | Record<string, string>): URLSearchParams {
    return queryStringify(queryParams);
}



/**
 * sort courses (or course Data) alphabetically by name
 * @param a item to compare.
 * @param b item to compare.
 */
export function courseNameSort(a: Course | ICourseData, b: Course | ICourseData) {
    if (a.name < b.name) return -1;
    if (b.name < a.name) return 1;
    return 0;
}

export function* range(start: number, end?: number, step: number = 1) {
    if (typeof end === 'undefined') {
        let i = start;
        while (true) {
            yield i;
            i+= step;
        }
    }

    for (let i = start; i <= end; i++) {
        yield i;
    }
}

export function* numbers(start: number, step: number = 1) {
    let i = 0;
    while (true) {
        yield i;
        i += step;
    }
}


export function getPlainTextFromHtml(html: string) {
    const el = document.createElement('div');
    el.innerHTML = html;
    return el.innerText || el.textContent || "";
}



export function batchify<T>(toBatch: T[], batchSize: number) {
    const out: T[][] = [];
    for (let i = 0; i < toBatch.length; i += batchSize) {
        out.push(toBatch.slice(i, i + batchSize));

    }
    return out;
}

export function filterUniqueFunc<T>(item: T, index: number, array: T[]) {
    return array.indexOf(item) === index;
}



export async function* batchGen<T>(generator: AsyncGenerator<T>, batchSize: number) {
    if(batchSize <= 0) throw new Error("Batch size cannot be 0 or lower")
    while (true) {
        const out = [] as T[];
        for (let i = 0; i < batchSize; i++) {
            const next = await generator.next();
            if (next.done) {
                if (out.length > 0) yield out;
                return;
            }
            out.push(next.value)
        }
        yield out;
    }
}

export async function renderAsyncGen<T, R = any>(generator: AsyncGenerator<T, R, undefined>) {
    const out = [] as T[];
    for await (const item of generator) {
        out.push(item);
    }
    return out;
}

export async function* generatorMap<T, MapOutput>(
    generator: AsyncGenerator<T>,
    nextMapFunc: (value: T, index: number, generator: AsyncGenerator<T>) => MapOutput,
) {

    let i = 0;
    for await(const value of generator) {
        yield nextMapFunc(value, i, generator);
        i++;
    }
}