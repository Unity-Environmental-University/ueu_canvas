import {CanvasData} from "@/canvasDataDefs";

export interface IPageData extends CanvasData {
    page_id: number,
    id?: number,
    url: string,
    title: string,
    body: string,
    updated_at: string,
    created_at: string,
    front_page: boolean,
}