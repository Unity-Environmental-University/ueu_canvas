import {IAssignmentSubmission} from "@canvas/content/types";

export const mockSubmission: IAssignmentSubmission = {
  assignment_id: 23,
  assignment: null,
  course: null,
  attempt: 1,
  body: "There are three factors too...",
  grade: "A-",
  grade_matches_current_submission: true,
  html_url: "https://example.com/courses/255/assignments/543/submissions/134",
  preview_url: "https://example.com/courses/255/assignments/543/submissions/134?preview=1",
  score: 13.5,
  submission_comments: null,
  submission_type: 'online_text_entry',
  submitted_at: "2012-01-01T01:00:00Z",
  url: null,
  user_id: 134,
  grader_id: 86,
  graded_at: "2012-01-02T03:05:34Z",
  user: null,
  late: false,
  assignment_visible: true,
  excused: true,
  missing: true,
  late_policy_status: 'missing',
  points_deducted: 12.3,
  seconds_late: 300,
  workflow_state: 'submitted',
  extra_attempts: 10,
  anonymous_id: "acJ4Q",
  posted_at: "2020-01-02T11:10:30Z",
  read_status: 'read',
  redo_request: true
};

export default mockSubmission;
