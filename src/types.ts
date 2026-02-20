import {CanvasData, IUserData} from "@/canvasDataDefs";
import {ITermData} from "@/term/Term";
import {Page} from "@/content/pages/Page";

export interface ICourseData extends CanvasData {
    id: number,
    sis_course_id?: string,
    uuid: string,
    name: string,
    course_code: string,
    original_name: string,
    workflow_state: 'available' | 'unpublished' | 'completed' | 'deleted',
    account_id: number,
    root_account_id: number,
    enrollment_term_id: number[] | number,
    grading_periods?: CanvasData[] | null,
    grading_standard_id: number,
    grade_passback_setting?: "nightly_sync" | "disabled" | '',
    created_at: string,
    start_at: string,
    end_at: string,
    locale: string,
    enrollments: number | null,
    total_students?: number,
    calendar: CanvasData,
    default_view: 'feed' | 'wiki' | 'modules' | 'assignments' | 'syllabus',
    syllabus_body?: string,
    needs_grading_count?: number,
    term?: ITermData,
    course_progress: CanvasData,
    apply_assignment_group_weights: boolean,
    permissions: Record<string, boolean>,
    public_description: string,
    storage_quota_mb: number,
    storage_quota_used_mb: number,
    hide_final_grades: boolean,
    license: string,
    allow_student_assignment_edits: boolean,
    allow_wiki_comments: boolean,
    allow_student_forum_attachments: boolean,
    open_enrollment: boolean,
    self_enrollment: boolean,
    restrict_enrollments_to_course_dates: boolean,
    course_format: string,
    access_restricted_by_date?: boolean
    time_zone: string,
    tabs?: ITabData[],
    blueprint: boolean,
    blueprint_restrictions: IBlueprintContentRestrictions,
    blueprint_restrictions_by_object_type: {
        assignment?: IBlueprintContentRestrictions,
        attachment?: IBlueprintContentRestrictions,
        discussion_topic?: IBlueprintContentRestrictions,
        quiz?: IBlueprintContentRestrictions,
        wiki_page?: IBlueprintContentRestrictions
    }
    template: boolean

}

export interface ICourseSettings {
    "allow_student_discussion_topics": boolean,
    "allow_student_forum_attachments": boolean,
    "allow_student_discussion_editing": boolean,
    "grading_standard_enabled": boolean,
    "grading_standard_id": number,
    "allow_student_organized_groups": boolean,
    "hide_final_grades": boolean,
    "hide_distribution_graphs": boolean,
    "hide_sections_on_course_users_page": boolean,
    "lock_all_announcements": boolean,
    "usage_rights_required": boolean,
    "homeroom_course": boolean,
    "default_due_time": string,
    "conditional_release": boolean,
    show_announcements_on_home_page?: boolean
}

export interface ITabData {
    id: string,
    html_url: string,
    full_url: string,
    position: number,
    hidden?: boolean,
    visibility: string,
    label: string,
    type: string
}

export interface IBlueprintContentRestrictions {
    content: boolean,
    points: boolean,
    due_dates: boolean,
    availability_dates: boolean
}

export type SectionData = Partial<ICourseData>
    & Pick<ICourseData, 'id'
    | 'name'
    | 'course_code'
    | 'sis_course_id'
>
    & {
    term_name: string,
    teachers: {
        id: number,
        display_name:string,
        anonymous_id: string,
        avatar_image_url: string,
        html_url: string,
        pronouns: string
    }
}
export type TopicPermissions = Record<string, any>
export type FileAttachment = Record<string, any>
export type ResizeImageMessage = {
    src: string,
    image: HTMLImageElement,
    width: number,
    height?: number
}

export interface IProfile {
    user?: IUserData,
    bio?: string | null,
    displayName?: string | null,
    image?: HTMLImageElement | null,
    imageLink?: string | null,
    sourcePage?: Page | null,

}

export interface IProfileWithUser extends IProfile {
    user: IUserData
}