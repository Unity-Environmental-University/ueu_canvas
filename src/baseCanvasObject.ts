import {CanvasData} from "./canvasDataDefs";
import assert from "assert";
import {formDataify, ICanvasCallConfig, renderAsyncGen} from "./canvasUtils";
import {Course} from "./course/Course";
import {getPagedData, getPagedDataGenerator} from "./fetch/getPagedDataGenerator";
import {overrideConfig} from "./fetch/utils";
import {fetchJson} from "./fetch/fetchJson";
import {BaseContentItem} from "./content/BaseContentItem";


export interface ICanvasObject<CanvasDataType extends CanvasData> {
    rawData: CanvasDataType,
    name: string,

    saveData(data: Record<string, any>, config: ICanvasCallConfig | undefined): Promise<Record<string, any>>
}

/**
 * DEPRECATED
 */
export class BaseCanvasObject<CanvasDataType extends CanvasData> implements ICanvasObject<CanvasDataType>{

    static idProperty = 'id'; // The field name of the id of the canvas object type
    static nameProperty: string | null = 'name'; // The field name of the primary name of the canvas object type
    static contentUrlTemplate: string | null = null; // A templated url to get a single item
    static allContentUrlTemplate: string | null = null; // A templated url to get all items
    protected canvasData: CanvasDataType;
    private _accountId: null | number = null;
    protected get accountId(): null | number {
        return this._accountId;
    }
    /** Canvas instance origin this object was loaded from; its own follow-up requests go there. */
    readonly origin?: string;

    constructor(data: CanvasDataType, origin?: string) {
        this.canvasData = data || {}; // A dict holding the decoded json representation of the object in Canvas
        this.origin = origin;
    }

    /** The given config, targeting this object's origin unless the config names its own. */
    protected withMyOrigin<C extends ICanvasCallConfig>(config?: C | null): C {
        const origin = config?.origin ?? this.origin;
        return (origin ? {...config, origin} : config ?? {}) as C;
    }

    getClass(): typeof BaseContentItem {
        return this.constructor as typeof BaseContentItem;
    }


    getItem<T>(item: string) {
        return this.canvasData[item] as T;
    }


    get myClass() {
        return (<typeof BaseContentItem>this.constructor)
    }

    get nameKey() {
        assert(this.myClass.nameProperty);
        return this.myClass.nameProperty;
    }

    get rawData(): CanvasDataType {
        return {...this.canvasData};
    }


    get contentUrlPath(): null | string {
        const constructor = <typeof BaseCanvasObject>this.constructor;

        assert(typeof this.accountId === 'number');
        assert(typeof constructor.contentUrlTemplate === 'string');
        return '/api/v1/' + constructor.contentUrlTemplate
            .replace('{content_id}', this.id.toString())
            .replace('{account_id}', this.accountId.toString());
    }

    get htmlContentUrl() {
        return `${this.contentUrlPath}`;
    }

    get data() {
        return this.canvasData;
    }

    static async getDataById<T extends CanvasData = CanvasData>(contentId: number, courseId: number | null = null, config: ICanvasCallConfig | null = null): Promise<T> {
        const url = this.getUrlPathFromIds(contentId, courseId);
        const response = await fetchJson<T>(url, config);
        assert(!Array.isArray(response));

        return response;
    }

    static getUrlPathFromIds(
        contentId: number,
        courseId: number | null) {
        assert(typeof this.contentUrlTemplate === 'string');
        let url = this.contentUrlTemplate
            .replace('{content_id}', contentId.toString());
        if (courseId) url = url.replace('{course_id}', courseId.toString());
        return url;
    }

    /**
     * @param courseId - The course ID to get elements within, if applicable
     * @param accountId - The account ID to get elements within, if applicable
     */
    static getAllUrl(courseId: number | null = null, accountId: number | null = null) {
        assert(typeof this.allContentUrlTemplate === 'string');
        let replaced = this.allContentUrlTemplate;

        if (courseId) replaced = replaced.replace('{course_id}', courseId.toString());
        if (accountId) replaced = replaced.replace('{account_id}', accountId.toString());
        return replaced;
    }

    static async getAll(config: ICanvasCallConfig | null = null) {
        const url = this.getAllUrl();
        return await renderAsyncGen(getPagedDataGenerator(this.getAllUrl(), config))
    }

    get id(): number {
        const id = this.canvasData[(<typeof BaseCanvasObject>this.constructor).idProperty];
        return parseInt(id);
    }

    get name() {
        const nameProperty = this.getClass().nameProperty;
        if (!nameProperty) return 'NAME PROPERTY NOT SET'
        return this.getItem<string>(nameProperty);
    }

    async saveData(data: Record<string, any>, config?: ICanvasCallConfig) {
        assert(this.contentUrlPath);
        config = overrideConfig({
            fetchInit: {
                method: 'PUT',
                body: formDataify(data)
            }
        }, config);

        let results = await fetchJson(this.contentUrlPath, this.withMyOrigin(config)) as Partial<CanvasDataType> | Partial<CanvasDataType>[];
        if(Array.isArray(results)) results = results[0];
        this.canvasData = {...this.canvasData, ...results};
        return this.canvasData;
    }
}