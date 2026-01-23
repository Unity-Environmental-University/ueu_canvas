import {CanvasData} from "@/canvasDataDefs";
import {ICanvasCallConfig} from "@/canvasUtils";
import {fetchJson} from "@/fetch/fetchJson";
import {getPagedDataGenerator} from "@/fetch/getPagedDataGenerator";
import {ContentKind, contentUrlFuncs, putContentFunc} from "@/content/ContentKind";
import {IAssignmentData, UpdateAssignmentDataOptions} from "@canvas/content/types";

export const assignmentUrlFuncs = contentUrlFuncs('assignments');
export const AssignmentKind: ContentKind<
    IAssignmentData,
    CanvasData,
    UpdateAssignmentDataOptions
> = {
    getId: (data) => data.id,
    dataIsThisKind: (data): data is IAssignmentData => {
        return 'submission_types' in data
    },
    getName: (data) => data.name,
    getBody: (data) => data.description,
    async get(courseId: number, contentId: number, config?: ICanvasCallConfig<Record<string, any>>) {
        const data = await fetchJson(assignmentUrlFuncs.getApiUrl(courseId, contentId), config) as IAssignmentData;
        return data;
    },
    ...assignmentUrlFuncs,
    dataGenerator: (courseId, config) => getPagedDataGenerator<IAssignmentData>(assignmentUrlFuncs.getAllApiUrl(courseId), config),
    put: putContentFunc<UpdateAssignmentDataOptions, IAssignmentData>(assignmentUrlFuncs.getApiUrl),
}

export default AssignmentKind;