import {BaseCanvasObject} from "../baseCanvasObject";
import {
    ILatePolicyData,
    IModuleData,
    IModuleItemData,
    IUserData,
    ModuleItemType
} from "../canvasDataDefs";
import {
    GetCourseOptions,
    IContentHaver,
    ICourseCodeHaver,
    ICourseDataHaver,
    ICourseSettingsHaver,
    IGradingStandardData,
    IGradingStandardsHaver,
    ILatePolicyHaver,
    IModulesHaver
} from "./courseTypes";
import {isBlueprint} from "./blueprint";
import {filterUniqueFunc, formDataify, ICanvasCallConfig, renderAsyncGen} from "../canvasUtils";
import {getModuleUnlockStartDate} from "./changeStartDate";
import {getModuleOverview, getModulesByWeekNumber, getModuleWeekNumber, moduleGenerator} from "./modules";
import {uploadFile} from "../files";
import {getCurioPageFrontPageProfile, getPotentialFacultyProfiles} from "../profile";
import {getCourseById, getCourseData,  getGradingStandards, getSingleCourse} from "./toolbox";
import {assignmentDataGen} from "@/content/assignments";
import {baseCourseCode, parseCourseCode} from "@/course/code";
import {Term} from "@/term/Term";

import {ICourseData, ICourseSettings, IProfile, IProfileWithUser, ITabData} from "@/types";
import {getPagedData} from "@/fetch/getPagedDataGenerator";
import {fetchGetConfig, overrideConfig} from "@/fetch/utils";
import {fetchJson} from "@/fetch/fetchJson";
import {BaseContentItem, getBannerImage} from "@/content/BaseContentItem";
import getCourseIdFromUrl from "@/course/getCourseIdFromUrl";
import {Quiz} from "@/content/quizzes/Quiz";
import {Page} from "@/content/pages/Page";
import {Discussion} from "@/content/discussions/Discussion";
import {Assignment} from "@/content/assignments/Assignment";
import {IPageData} from "@/content/pages/types";
import ApiWriteConfig from "@/fetch/apiGetConfig";
import {IAssignmentGroup} from "@canvas/content/types";
import {IBlueprintCourse} from "@canvas/course/IBlueprintCourse";
import {cachedGetAssociatedCoursesFunc} from "@canvas/course/cachedGetAssociatedCoursesFunc";
import assert from "assert";

const HOMETILE_WIDTH = 500;

export const COURSE_CODE_REGEX = /^(.+[^_])?_?(\w{4}\d{3})/i;

export class Course extends BaseCanvasObject<ICourseData> implements IContentHaver,
    ICourseDataHaver,
    ICourseSettingsHaver,
    IGradingStandardsHaver,
    ILatePolicyHaver,
    IBlueprintCourse,
    ICourseCodeHaver,
    IModulesHaver {
    static nameProperty = 'name';
    protected _modules: IModuleData[] | undefined = undefined;
    private modulesByWeekNumber: Record<string | number, IModuleData> | undefined = undefined;
    private static contentClasses: (typeof BaseContentItem)[] = [Assignment, Discussion, Quiz, Page];

    isBlueprint: () => boolean;
    getAssociatedCourses: (redownload?: boolean) => Promise<Course[]>;

    constructor(data: ICourseData) {
        super(data);
        this.isBlueprint = (() => isBlueprint(data));
        this.getAssociatedCourses = cachedGetAssociatedCoursesFunc(this)
    }

    static async getFromUrl(url: string | null = null) {
        if (url === null) {
            url = document.documentURI;
        }
        const match = /courses\/(\d+)/.exec(url);
        if (match) {

            const id = getCourseIdFromUrl(url);
            if (!id) return null;
            return getCourseById(id);
        }
        return null;
    }


    static async getCourseById(courseId: number, config: ICanvasCallConfig<GetCourseOptions> | undefined = undefined) {
        const data = await getCourseData(courseId, config);
        return new Course(data);
    }

    static async publishAll(courses: number[] | Course[], accountId: number) {

        if (courses.length == 0) return false;
        const courseIds = courses.map((course) => {
            if (course instanceof Course) {
                return course.id;
            }
            return course;
        })

        const url = `/api/v1/accounts/${accountId}/courses`;
        const data = {
            'event': 'offer',
            'course_ids': courseIds,
        }
        return await fetchJson(url, {
            fetchInit: {
                method: 'PUT',
                body: formDataify(data),
            }
        })
    }



    get contentUrlPath() {
        return `/api/v1/courses/${this.id}`;
    }

    get courseUrl() {
        return this.htmlContentUrl;
    }

    get htmlContentUrl() {
        return `/courses/${this.id}`
    }

    get parsedCourseCode(): null | string {
        return parseCourseCode(this.canvasData.course_code);
    }

    get courseCode(): null | string {
        return this.canvasData.course_code
    }

    get baseCode() {
        return baseCourseCode(this.canvasData.course_code);
    }

    get termId(): number | null {
        const id = (this.canvasData as ICourseData).enrollment_term_id;
        if (typeof id === 'number') return id;
        else return id[0];
    }

    async getTerm(): Promise<Term | null> {
        assert(typeof this.termId === 'number')

        if (this.termId) return Term.getTermById(this.termId)
        else return null;
    }

    get fileUploadUrl() {

        return `/api/v1/courses/${this.id}/files`;
    }

    get codePrefix() {
        const match = COURSE_CODE_REGEX.exec(this.rawData.course_code);
        return match ? match[1] : '';
    }

    get workflowState() {
        return this.canvasData.workflow_state
    }

    get isDev() {
        return !!this.name.match(/^DEV/);
    }


    get rootAccountId() {
        return this.canvasData.root_account_id;
    }

    get accountId() {
        return this.canvasData.account_id;
    }


    async getModules(config?: ICanvasCallConfig): Promise<IModuleData[]> {
        if (this._modules) {
            return this._modules;
        }
        const modules = await renderAsyncGen(moduleGenerator(this.id, {
            queryParams: {
                include: ['items', 'content_details']
            }
        }));
        this._modules = modules;
        return modules;
    }

    async updateModules(config?: ICanvasCallConfig): Promise<IModuleData[]> {
        this._modules = undefined;
        return this.getModules(config);
    }

    async getStartDateFromModules() {
        return getModuleUnlockStartDate(await this.getModules());
    }

    public isUndergrad() {
        if (this.courseCode) {
            const match = this.courseCode.match(/\d{3,4}/);
            if (match) return parseInt(match[0], 10) < 500;
        }
        return false;
    }

    public isGrad() {
        if (this.courseCode) {
            const match = this.courseCode.match(/\d{3,4}/);
            if (match) return parseInt(match[0], 10) >= 500 && parseInt(match[0], 10) < 1000;
        }
        return false;
    }

    public isCareerInstitute() {
        if (this.courseCode) {
            const match = this.courseCode.match(/\d{4}/);
            if (match) return true;
        }
        return false;
    }

    async getInstructors(): Promise<IUserData[] | null> {
        return await fetchJson(`/api/v1/courses/${this.id}/users?enrollment_type=teacher`) as IUserData[];
    }

    async getLatePolicy(this: { id: number }, config?: ICanvasCallConfig) {
        const latePolicyResult = await fetchJson(`/api/v1/courses/${this.id}/late_policy`, config);
        if ('late_policy' in latePolicyResult) return latePolicyResult.late_policy as ILatePolicyData;
        return undefined;

    }

    async getAvailableGradingStandards(config?: ICanvasCallConfig | undefined): Promise<IGradingStandardData[]> {
        let out: IGradingStandardData[] = [];
        console.log(this.name)
        const {id, account_id, root_account_id} = this.canvasData;

        try {
            if (id) {
                const courseGradingStandards = await getGradingStandards(id, "course", config);
                out = [...out, ...courseGradingStandards];

            }
            if (account_id) {
                const accountGradingStandards = await getGradingStandards(account_id, 'account', config);
                out = [...out, ...accountGradingStandards];
            }

            if (root_account_id) {
                const rootAccountGradingStandards = await getGradingStandards(root_account_id, 'account', config);
                out = [...out, ...rootAccountGradingStandards];

            }
        } catch (e) {
            console.warn(e);
        }
        return out.filter(filterUniqueFunc);
    }

    async getCurrentGradingStandard(config?: ICanvasCallConfig | undefined): Promise<IGradingStandardData | null> {
        const {grading_standard_id, account_id, root_account_id} = this.canvasData;

        const urls = [];

        if (grading_standard_id) {
            urls.push(`/api/v1/courses/${this.id}/grading_standards/${grading_standard_id}`)
            if (root_account_id) urls.push(`/api/v1/accounts/${root_account_id}/grading_standards/${grading_standard_id}`);
            if (account_id) urls.push(`/api/v1/accounts/${account_id}/grading_standards/${grading_standard_id}`);
        }

        const standards = (await this.getAvailableGradingStandards(config)).filter(standard => standard.id === grading_standard_id)
        if (standards.length == 0) return null;
        return standards[0];
    }

    async getModulesByWeekNumber(config?: ICanvasCallConfig) {
        if (this.modulesByWeekNumber) return this.modulesByWeekNumber;
        const modules = await this.getModules(config);
        this.modulesByWeekNumber = await getModulesByWeekNumber(modules);
        return (this.modulesByWeekNumber);
    }

    /**
     * Returns a list of links to items in a given module
     *
     * @param moduleOrWeekNumber
     * @param target An object specifying an item or items to look for
     * type - specifies the type,
     * search - a string to search for in titles. optional.
     * index - return the indexth one of these in the week (minus the intro in week 1, which should be index 0)
     * if none is specified, return all matches
     */
    async getModuleItemLinks(moduleOrWeekNumber: number | Record<string, any>, target: IModuleItemData | {
        type: ModuleItemType,
        search?: string | null,
        index?: number | null,
    }): Promise<string[]> {
        assert(target.hasOwnProperty('type'));
        const targetType: ModuleItemType = target.type;
        const contentSearchString = target.hasOwnProperty('search') ? target.search : null;
        let targetIndex = isNaN(target.index) ? null : target.index;
        let targetModuleWeekNumber;
        let targetModule;
        if (typeof moduleOrWeekNumber === 'number') {
            const modules = await this.getModulesByWeekNumber();
            assert(modules.hasOwnProperty(moduleOrWeekNumber));
            targetModuleWeekNumber = moduleOrWeekNumber;
            targetModule = modules[targetModuleWeekNumber];
        } else {
            targetModule = moduleOrWeekNumber;
            targetModuleWeekNumber = getModuleWeekNumber(targetModule);
        }

        const urls = [];
        if (targetModule && typeof targetType !== 'undefined') {
            //If it's a page, just search for the parameter string
            if (targetType === 'Page' && contentSearchString) {
                const pages = await this.getPages({
                    queryParams: {search_term: contentSearchString}
                })
                pages.forEach((page) => urls.push(page.htmlContentUrl));


                //If it's anything else, get only those items in the module and set url to the targetIndexth one.
            } else if (targetType) {
                //bump index for week 1 to account for intro discussion / checking for rubric would require pulling too much data
                //and too much performance overhead
                if (targetIndex && targetType === 'Discussion' && targetModuleWeekNumber === 1) targetIndex++;
                const matchingTypeItems = targetModule.items.filter((item: IModuleItemData) => item.type === targetType);
                if (targetIndex && matchingTypeItems.length >= targetIndex) {
                    //We refer to and number the assignments indexed at 1, but the array is indexed at 0
                    const targetItem = matchingTypeItems[targetIndex - 1];
                    urls.push(targetItem.html_url);
                } else if (!targetIndex) {
                    for (const item of matchingTypeItems) urls.push(item.html_url)
                }
            }
        }
        return urls;
    }

    async getSyllabus(config: ICanvasCallConfig<GetCourseOptions> = {queryParams: {}}): Promise<string> {
        if(this.canvasData.syllabus_body) return this.canvasData.syllabus_body;
        const data = await getCourseData(this.id, fetchGetConfig({include: ['syllabus_body']}, config));
        assert(data.syllabus_body)
        this.canvasData.syllabus_body = data.syllabus_body;
        return this.canvasData.syllabus_body;
    }

    // /**
    //  * gets all assignments in a course
    //  * @returns {Promise<Assignment[]>}
    //  * @param config
    //  */
    async getAssignments(config?: ICanvasCallConfig): Promise<Assignment[]> {
        console.warn('deprecated, use assignmentDataGen instead');
        config = overrideConfig(config, {queryParams: {include: ['due_at']}})
        const assignmentDatas = await renderAsyncGen(assignmentDataGen(this.id, config));
        return (assignmentDatas.map(data => new Assignment(data, this.id)));
    }


    cachedContent: BaseContentItem[] = []

    async getContent(config?: ICanvasCallConfig, refresh = false) {
        if (refresh || this.cachedContent.length == 0) {
            const discussions = await this.getDiscussions(config);
            const assignments = await renderAsyncGen(assignmentDataGen(this.id, config))
            const quizzes = await this.getQuizzes(config);
            const pages = await this.getPages(config);
            this.cachedContent = [
                ...discussions,
                ...assignments.map(a => new Assignment(a, this.id)),
                ...quizzes,
                ...pages

            ]

        }
        return this.cachedContent;
    }

    async getDiscussions(config?: ICanvasCallConfig): Promise<Discussion[]> {
        return await Discussion.getAllInCourse(this.id, config) as Discussion[];
    }

    async getAssignmentGroups(config?: ICanvasCallConfig) {
        return await getPagedData<IAssignmentGroup>(`/api/v1/courses/${this.id}/assignment_groups`, config)
    }

    async getQuizzes(config?: ICanvasCallConfig) {
        return await Quiz.getAllInCourse(this.id, config) as Quiz[];
    }

    async getSubsections() {
        const url = `/api/v1/courses/${this.id}/sections`;
        return await fetchJson(url);

    }

    async getTabs(config?: ICanvasCallConfig) {
        return await fetchJson(`/api/v1/courses/${this.id}/tabs`, config) as ITabData[];
    }

    async getFrontPage() {
        try {
            const data = await fetchJson(`${this.contentUrlPath}/front_page`) as IPageData;
            return new Page(data, this.id);
        } catch (error) {
            return null;
        }
    }

    getTab(label: string) {
        return this.canvasData.tabs?.find((tab: Record<string, any>) => tab.label === label) || null;
    }


    async reload() {
        const id = this.id;
        const reloaded = await Course.getCourseById(id);
        this.canvasData = reloaded.rawData;
    }

    async changeSyllabus(newHtml: string) {
        this.canvasData['syllabus_body'] = newHtml;
        return await fetchJson(`/api/v1/courses/${this.id}`, {
            fetchInit: {
                method: 'PUT',
                body: formDataify({
                    course: {
                        syllabus_body: newHtml
                    }
                })
            }
        });
    }


    async publish() {
        const url = `/api/v1/courses/${this.id}`;
        const courseData = await fetchJson<ICourseData>(url, {
            fetchInit: {
                method: 'PUT',
                body: formDataify({'offer': true})
            }
        });
        console.log(courseData);
        this.canvasData = courseData;
    }

    get devCode() {
        return 'DEV_' + this.baseCode;
    }

    async getParentCourse(return_dev_search = false) {
        const migrations = await getPagedData(`/api/v1/courses/${this.id}/content_migrations`);
        const parentCode = this.devCode;

        if (migrations.length < 1) {
            console.log('no migrations found');
            if (return_dev_search) {
                return getSingleCourse(parentCode, this.getAccountIds())
            } else return;
        }
        migrations.sort((a, b) => b.id - a.id);

        try {
            for (const migration of migrations) {
                const course = await Course.getCourseById(migration['settings']['source_course_id'])
                if (course && course.codePrefix.includes("DEV")) return course;
            }
        } catch (e) {
            return await getSingleCourse(parentCode, this.getAccountIds());
        }
        return await getSingleCourse(parentCode, this.getAccountIds());
    }

    getAccountIds() {
        return [this.accountId, this.rootAccountId].filter(a => typeof a !== 'undefined' && a !== null);
    }

    // async regenerateHomeTiles() {
    //     const modules = await this.getModules();
    //     const urls = await Promise.all(modules.map(async (module) => {
    //         try {
    //             const dataUrl = await this.generateHomeTile(module)
    //
    //         } catch (e) {
    //             console.log(e);
    //         }
    //     }));
    //     console.log('done');
    //
    // }

    // async generateHomeTile(module: IModuleData) {
    //     const overviewPage = await getModuleOverview(module, this.id);
    //     if (!overviewPage) throw new Error("Module does not have an overview");
    //     const bannerImg = getBannerImage(overviewPage);
    //     if (!bannerImg) throw new Error("No banner image on page");
    //     const resizedImageBlob = await getResizedBlob(bannerImg.src, HOMETILE_WIDTH);
    //     const fileName = `hometile${module.position}.png`;
    //     assert(resizedImageBlob);
    //     const file = new File([resizedImageBlob], fileName)
    //     return await uploadFile(file, 'Images/hometile', this.fileUploadUrl);
    // }

    public getPages(config: ICanvasCallConfig | null = null) {
        return Page.getAllInCourse(this.id, config) as Promise<Page[]>;
    }

    public async getFrontPageProfile() {
        const frontPage = await this.getFrontPage();
        try {
            assert(frontPage && frontPage.body, "Course front page not found");
            const frontPageProfile = getCurioPageFrontPageProfile(frontPage?.body);
            frontPageProfile.sourcePage = frontPage;
            return frontPageProfile;

        } catch (e) {
            return {

                bio: 'NOT FOUND',
                sourcePage: frontPage,
            } as IProfile;
        }
    }

    public async getPotentialInstructorProfiles() {
        try {

            const instructors = await this.getInstructors();
            let profiles: IProfileWithUser[] = [];
            if (!instructors) return profiles;
            for (const instructor of instructors) {
                profiles = profiles.concat(await getPotentialFacultyProfiles(instructor))
            }
            return profiles;
        } catch (e) {
            return [] as IProfileWithUser[];
        }

    }

    public async getSettings(config?: ICanvasCallConfig) {
        return await fetchJson(`/api/v1/courses/${this.id}/settings`, config) as ICourseSettings;
    }

    public async updateSettings(newSettings: Partial<ICourseSettings>, config? : ICanvasCallConfig) {
        const configToUse = ApiWriteConfig(newSettings, config);
        return await fetchJson(`/api/v1/courses/${this.id}/settings`, configToUse) as ICourseSettings;
    }

}



