import {BaseContentItem} from "@/content/BaseContentItem";
import {ICanvasCallConfig} from "@/canvasUtils";
import PageKind from "@/content/pages/PageKind";
import {IPageData} from "@/content/pages/types";


export class Page extends BaseContentItem {
    static kindInfo = PageKind
    static idProperty = 'page_id';
    static nameProperty = 'title';
    static bodyProperty = 'body';
    static contentUrlTemplate = "/api/v1/courses/{course_id}/pages/{content_id}";
    static allContentUrlTemplate = "/api/v1/courses/{course_id}/pages";

    constructor(canvasData: IPageData, courseId: number) {
        super(canvasData, courseId);
    }

    get body(): string {
        return this.canvasData[this.bodyKey];
    }

    get title(): string {
        return this.canvasData[this.nameKey];
    }

    async updateContent(text?: string | null, name?: string | null, config?: ICanvasCallConfig) {
        const data: Record<string, any> = {};
        if (text) {
            this.canvasData[this.bodyKey] = text;
            data['wiki_page[body]'] = text;
        }
        if (name) {
            this.canvasData[this.nameKey] = name;
            data[this.nameKey] = name;
        }
        return this.saveData(data, config);
    }
}