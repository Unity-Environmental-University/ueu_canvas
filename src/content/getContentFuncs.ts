import {CONTENT_KINDS, getContentKindFromUrl} from "@/content/determineContent";
import assert from "assert";
import {BaseContentItem} from "@/content/BaseContentItem";
import { isCanvasUrl } from "@/instance";



function getAllLinks(body:string): string[] {
    const el = bodyAsElement(body);
    const anchors = el.querySelectorAll('a');
    const urls: string[] = [];
    for (const link of anchors) urls.push(link.href);
    return urls;

}


function bodyAsElement(body: string) {
    const el = document.createElement('div');
    el.innerHTML = body;
    return el;
}
export function getFileLinks(body: string, courseId: number) {
    return getAllLinks(body).filter(a => a.match(/instructure\.com.*files\/\d+/i)).map(a => a.split('?')[0]);
}

export function getExternalLinks(body: string, courseId: number) {
    return getAllLinks(body).filter(a => !isCanvasUrl(a))
}
