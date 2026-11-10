import {Assignment} from "@/content/assignments/Assignment";
import {IAssignmentData} from "@canvas/content/types";

export type UpdateAssignmentDueDatesOptions = {
    courseId?: number,
}

export type AssignmentDueDateFailure = {
    assignment: Assignment,
    reason: unknown,
}

/**
 * Thrown by updateAssignmentDueDates when one or more due date updates failed.
 * It is only thrown once every update has settled, so no request is still in flight.
 */
export class UpdateAssignmentDueDatesError extends Error {
    name = "UpdateAssignmentDueDatesError";
    public failures: AssignmentDueDateFailure[];
    public assignments: Assignment[];

    /**
     * @param failures The updates that failed.
     * @param assignments Every assignment the call processed, including ones skipped for having no due date.
     * @param attempted How many assignments had a due date and so were sent an update.
     */
    constructor(failures: AssignmentDueDateFailure[], assignments: Assignment[], attempted: number) {
        super(`Failed to update the due date of ${failures.length} of ${attempted} assignments`);
        this.failures = failures;
        this.assignments = assignments;
    }
}

/**
 * Shifts the due date of every assignment by `offset` days.
 * Resolves only after every update request has settled. If any update failed, rejects with an
 * UpdateAssignmentDueDatesError listing the failed assignments and their reasons.
 */
export async function updateAssignmentDueDates(offset: number, assignments: IAssignmentData[], options?: UpdateAssignmentDueDatesOptions) {

    const returnAssignments: Assignment[] = [];
    let {courseId} = options ?? {};
    if (!courseId && courseId !== 0) {
        courseId = assignments[0].course_id;
    }
    if (offset === 0 || offset) {
        // Build every Assignment before starting any request, so that if construction throws,
        // no update is left in flight.
        for (const data of assignments) {
            returnAssignments.push(new Assignment(data, courseId));
        }
    }
    // Assignments without a due date are skipped (dueAtTimeDelta would not send a request for them).
    const toUpdate = returnAssignments.filter(assignment => assignment.dueAt);
    const results = await Promise.allSettled(toUpdate.map(assignment => assignment.dueAtTimeDelta(Number(offset))));
    const failures: AssignmentDueDateFailure[] = [];
    results.forEach((result, i) => {
        if (result.status === "rejected") {
            failures.push({assignment: toUpdate[i], reason: result.reason});
        }
    });
    if (failures.length > 0) {
        throw new UpdateAssignmentDueDatesError(failures, returnAssignments, toUpdate.length);
    }
    return returnAssignments;
}