import {fetchJson} from "@canvas/fetch/fetchJson";
import {formDataify} from "@canvas/canvasUtils";

export const deleteAssignmentGroup = async function(courseId:number, groupId:number, moveAssignmentsTo?: number) {
    const data = moveAssignmentsTo? { move_assignments_to: moveAssignmentsTo} : {};

    const result = await fetchJson(`/api/v1/courses/${courseId}/assignment_groups/${groupId}`, {
        fetchInit: {
            method: 'DELETE',
            body: formDataify(data),
        }
    })
}

export default deleteAssignmentGroup;