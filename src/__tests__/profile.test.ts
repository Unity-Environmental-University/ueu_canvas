import {IUserData} from "../canvasDataDefs";
import {frontPageBio} from "../profile";
import {mockUserData} from "../__mocks__/mockUserData";

import {IProfile} from "@/types";

describe('frontPageBio', () => {
        const profile = {
            user: {...mockUserData, email: "ttestersson@unity.edu"},
            displayName: "Test Testersson Phd"
        }
    it('renders display name properly', () => {
        expect(frontPageBio(profile)).toContain(profile.displayName);
    })
    it('renders email properly', () => {
        expect(frontPageBio(profile)).toContain(profile.user.email);
    })

})

describe('getFacultyPages per instance', () => {
    afterEach(() => { jest.resetModules(); jest.dontMock("@/course/toolbox"); });

    it('looks up the configured course name and does not reuse another instance\'s course', async () => {
        jest.resetModules();
        const getSingleCourse = jest.fn(async (name: string) => ({
            name, getPages: jest.fn(async () => []),
        }));
        jest.doMock("@/course/toolbox", () => ({getSingleCourse}));
        jest.doMock("@/Account", () => ({Account: {getAll: async () => [{id: 1}]}}));
        const {setInstance, resetInstance} = await import("@/instance");
        const {getFacultyPages} = await import("../profile");

        await getFacultyPages("x");
        setInstance({baseUrl: "https://other.instructure.com", facultyBiosCourseName: "Other Bios"});
        await getFacultyPages("x");
        resetInstance();

        expect(getSingleCourse.mock.calls.map(c => c[0])).toEqual(["Faculty Bios", "Other Bios"]);
    });

    it('throws FacultyBiosCourseNotFoundError when the instance has no bios course', async () => {
        jest.resetModules();
        jest.doMock("@/course/toolbox", () => ({getSingleCourse: async () => undefined}));
        jest.doMock("@/Account", () => ({Account: {getAll: async () => [{id: 1}]}}));
        const {getFacultyPages, FacultyBiosCourseNotFoundError} = await import("../profile");
        await expect(getFacultyPages("x")).rejects.toBeInstanceOf(FacultyBiosCourseNotFoundError);
    });
});
