import {BaseContentItem} from "@/content/BaseContentItem";
import {ICanvasCallConfig} from "@/canvasUtils";
import {Temporal} from "temporal-polyfill";
import assert from "assert";
import AssignmentKind from "@/content/assignments/AssignmentKind";
import {IAssignmentData} from "@canvas/content/types";

export class Assignment extends BaseContentItem {
    static kind = AssignmentKind;
    static nameProperty = 'name';
    static bodyProperty = 'description';
    static contentUrlTemplate = "/api/v1/courses/{course_id}/assignments/{content_id}";
    static allContentUrlTemplate = "/api/v1/courses/{course_id}/assignments";

    constructor(assignmentData: IAssignmentData, courseId: number, origin?: string) {
        super(assignmentData, courseId, origin);
    }

    async setDueAt(dueAt: Date, config?: ICanvasCallConfig) {
        const sourceDueAt = this.rawData.due_at ? Temporal.Instant.from(this.rawData.due_at) : null;
        const targetDueAt = Temporal.Instant.from(dueAt.toISOString());

        const payload: Record<string, { due_at: string, peer_reviews_assign_at?: string }> = {
            assignment: {
                due_at: dueAt.toISOString(),
            }
        }

        if (this.rawData.peer_reviews && 'automatic_peer_reviews' in this.rawData) {
            const peerReviewTime = this.rawData.peer_reviews_assign_at ? Temporal.Instant.from(this.rawData.peer_reviews_assign_at) : null;
            assert(sourceDueAt, "Trying to set peer review date without a due date for the assignment.")
            if (peerReviewTime) {
                const peerReviewOffset = sourceDueAt.until(peerReviewTime);
                const newPeerReviewTime = targetDueAt.add(peerReviewOffset);
                payload.assignment.peer_reviews_assign_at =
                    new Date(newPeerReviewTime.epochMilliseconds).toISOString();
            }

        }

        const data = await this.saveData(payload, config);


        this.canvasData['due_at'] = dueAt.toISOString();
        return data;

    }

    get rawData() {
        return this.canvasData as IAssignmentData;
    }


    async updateContent(text?: string | null, name?: string | null, config?: ICanvasCallConfig) {
        const assignmentData: Record<string, any> = {};
        if (text) {
            assignmentData.description = text
            this.rawData.description = text
        }
        if (name) {
            assignmentData.name = name;
            this.rawData.name = name;
        }

        return await this.saveData({
            assignment: assignmentData
        }, config)
    }
}