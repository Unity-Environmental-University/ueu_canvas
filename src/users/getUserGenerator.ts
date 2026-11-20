import {getPagedDataGenerator} from "@/fetch/getPagedDataGenerator";
import {IUserData} from "@/index";

type UserEnrollmentType = 'student' | 'teacher' | 'ta' | 'observer' | 'designer';

export type GetUserQueryParams = {
    search_term?: string;
    // Canvas documents the course users endpoint as taking enrollment_type[];
    // an array is sent in that form.
    enrollment_type?: UserEnrollmentType | UserEnrollmentType[];
    sort?: 'username' | 'email' | 'sis_id' | 'integration_id' | 'last_login';
    order?: 'asc' | 'desc';
    include_deleted_users?: boolean;
}
export type GetAccountUserGenConfig = {
    accountId: number;
    queryParams?: GetUserQueryParams;
};

export  type GetCourseUserGenConfig = {
    courseId: number;
    queryParams?: GetUserQueryParams;
};

export type GetUserGenConfig = GetAccountUserGenConfig | GetCourseUserGenConfig;

export const getUserGenerator = (
    config:GetUserGenConfig
) => {
    let url:string;

    if('accountId' in config) {
        url = `/api/v1/accounts/${config.accountId}/users`;
    } else if('courseId' in config) {
        url = `/api/v1/courses/${config.courseId}/users`;
    } else {
        throw new Error('config type not recognized')
    }

    return getPagedDataGenerator<IUserData[]>(url, {
        queryParams: config.queryParams,
    });
}