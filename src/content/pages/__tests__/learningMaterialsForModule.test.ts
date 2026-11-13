import PageKind from "@canvas/content/pages/PageKind";
import {afterEach, beforeEach} from "@jest/globals";
import mockModuleData, {mockModuleItemData} from "@canvas/course/__mocks__/mockModuleData";
import mock = jest.mock;
import learningMaterialsForModule from "../learningMaterialsForModule";
import {renderAsyncGen} from "@canvas/canvasUtils";
import {IModuleData} from "@canvas/canvasDataDefs";

jest.mock('@canvas/content/pages/PageKind', () => ({
    get: jest.fn(),
}));

const pageGet = PageKind.get as jest.Mock;

describe('getLearningMaterialsWithModule', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Gets learning materials from course pages', async () => {
        const courseId = 123;
        const mockModule =
            {
                ...mockModuleData,
                id: 1,
                items: [{ title: 'Week 1 Learning Materials', content_id: 101}]
            };

        pageGet.mockResolvedValueOnce({id: 101, content: 'Learning materials content'});

        const result = await renderAsyncGen(learningMaterialsForModule(courseId, mockModule as IModuleData));

        expect(pageGet).toHaveBeenCalledWith(courseId, 101);
        expect(result).toEqual( [{
            item: {content_id: 101, title: 'Week 1 Learning Materials'},
            page: {id: 101, content: 'Learning materials content'}
    }] );
    });
    it('Skips non learning materials', async () => {
        const courseId = 123;
        const mockModule =
            {
                ...mockModuleData,
                id: 1,
                items: [{...mockModuleItemData, title: 'Week 1 Overview', content_id: 101}]
                    .map(a => ({...mockModuleItemData, ...a})),
            };


        const result = await  renderAsyncGen(learningMaterialsForModule(courseId, mockModule));

        expect(result).toEqual([]);
    });
});