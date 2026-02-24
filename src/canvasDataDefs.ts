export type CanvasData = Record<string, any> & {
    retrieved_at?: string;
}


export interface HasUser extends CanvasData {
    user: IUserData
}

export interface IEnrollmentData extends CanvasData {
    user: IUserData,
    enrollment_state: string,
}

export interface IUserData extends CanvasData {
    id: number,
    name: string,
    sortable_name: string,
    last_name: string,
    first_name: string,
    short_name: string,
    email: string,
    bio?: string
}


export interface IModuleData extends CanvasData {
    id: number,
    name: string,
    position: number,
    unlock_at?: string | null,
    require_sequential_progress: boolean,
    prerequisite_module_ids: number[],
    items_count: number,
    items_url: string,
    items: IModuleItemData[],
    state: string,
    completed_at?: string | null,
    publish_final_grade?: boolean,
    published: boolean
}

export type ModuleItemType =
    "File"
    | "Assignment"
    | "Discussion"
    | "Quiz"
    | "ExternalTool"
    | "ExternalUrl"
    | "Page"
    | "Subheader"
export type RestrictModuleItemType =
    'assignment'
    | 'attachment'
    | 'discussion_topic'
    | 'external_tool'
    | 'lti-quiz'
    | 'quiz'
    | 'wiki_page'


export interface IModuleItemData extends CanvasData {
    id: number,
    module_id: number,
    position: number,
    title: string,
    indent: number,
    type: ModuleItemType,
    content_id: number,
    html_url: string,
    url?: string,
    page_url?: string,
    external_url?: string,
    new_tab: boolean,
    completion_requirement?: {
        type: "min_score" | "must_view" | "must_contribute" | "must_submit" | "must_mark_done",
        min_score?: number
    },
    content_details?: {
        points_possible: number,
        due_at?: string,
        unlock_at?: string,
        lock_at?: string,
    }
}


export interface IUpdateCallback {
    (current: number, total: number, message: string | undefined): void
}

export interface ILatePolicyUpdate {
    "id"?: number,
    "missing_submission_deduction_enabled"?: boolean,
    "missing_submission_deduction"?: number,
    "late_submission_deduction_enabled"?: boolean,
    "late_submission_deduction"?: number,
    "late_submission_interval"?: string,
    "late_submission_minimum_percent_enabled"?: boolean,
    "late_submission_minimum_percent"?: number
}

export interface ILatePolicyData extends ILatePolicyUpdate{
    "id": number,
    "missing_submission_deduction_enabled": boolean,
    "missing_submission_deduction": number,
    "late_submission_deduction_enabled": boolean,
    "late_submission_deduction": number,
    "late_submission_interval": string,
    "late_submission_minimum_percent_enabled": boolean,
    "late_submission_minimum_percent": number
}

export interface IAccountData {
    root_account_id: number|null;
    integration_id?: string;
    default_time_zone: string;
    default_group_storage_quota_mb: number;
    sis_account_id?: string;
    default_user_storage_quota_mb: number;
    uuid: string;
    lti_guid: string;
    parent_account_id: number|null;
    name: string;
    default_storage_quota_mb: number;
    workflow_state: 'active' | 'deleted';
    id: number;
    sis_import_id: number
}