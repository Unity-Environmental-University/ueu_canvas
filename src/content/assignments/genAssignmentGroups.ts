import {getPagedDataGenerator} from "@canvas/fetch/getPagedDataGenerator";

import {AssignmentGroup} from "@canvas/content/types";


export type AssignmentGroupInclude = 'assignments' | 'discussion_topic' | 'all_dates' |
    'assignment_visibility' | 'overrides' | 'submission' | 'observed_users' | 'can_edit' | 'score_statistics'

export const genAssignmentGroup = function(courseId:number, include: AssignmentGroupInclude[]  = ['assignments']) {
    return getPagedDataGenerator<AssignmentGroup>(`/api/v1/courses/${courseId}/assignment_groups`, {
        queryParams: {
            include,
        }
    });
}

export default genAssignmentGroup;