import {fetchJson} from "@/fetch/fetchJson";
import {saveModuleItem} from "@/course/modules";
import {mockModuleItemData} from "@/course/__mocks__/mockModuleData";
import {IModuleItemData} from "@/canvasDataDefs";

jest.mock('@/fetch/fetchJson', () => ({
    fetchJson: jest.fn(),
}));

const fetchJsonMock = fetchJson as jest.Mock;

function sentRequest() {
    expect(fetchJsonMock).toHaveBeenCalledTimes(1);
    const [url, config] = fetchJsonMock.mock.calls[0];
    return {url, method: config.fetchInit.method, body: config.fetchInit.body as FormData};
}

function bodyKeys(body: FormData) {
    return [...body.keys()].filter(key => key !== 'authenticity_token').sort();
}

describe('saveModuleItem', () => {
    beforeEach(() => {
        fetchJsonMock.mockReset();
        fetchJsonMock.mockResolvedValue({});
    });

    it('PUTs to the module item endpoint', async () => {
        await saveModuleItem(3, 7, 11, {title: 'Week 1 Discussion'});

        const {url, method} = sentRequest();
        expect(url).toEqual('/api/v1/courses/3/modules/7/items/11');
        expect(method).toEqual('PUT');
    });

    it('sends writable fields under module_item[...]', async () => {
        await saveModuleItem(3, 7, 11, {
            title: 'Week 1 Discussion',
            position: 2,
            indent: 1,
            new_tab: false,
            published: true,
            completion_requirement: {type: 'min_score', min_score: 1},
        });

        const {body} = sentRequest();
        expect(bodyKeys(body)).toEqual([
            'module_item[completion_requirement][min_score]',
            'module_item[completion_requirement][type]',
            'module_item[indent]',
            'module_item[new_tab]',
            'module_item[position]',
            'module_item[published]',
            'module_item[title]',
        ]);
        expect(body.get('module_item[title]')).toEqual('Week 1 Discussion');
        expect(body.get('module_item[completion_requirement][type]')).toEqual('min_score');
        expect(body.get('module_item[completion_requirement][min_score]')).toEqual('1');
        expect(body.get('module_item[published]')).toEqual('true');
    });

    it('drops read-only fields when given a full module item from Canvas', async () => {
        const item: IModuleItemData = {
            ...mockModuleItemData,
            id: 11,
            module_id: 7,
            title: 'Week 1 Discussion',
            type: 'Discussion',
            content_details: {points_possible: 10},
            completion_requirement: {type: 'must_submit'},
        };

        await saveModuleItem(3, 7, 11, item);

        const {body} = sentRequest();
        expect(bodyKeys(body)).toEqual([
            'module_item[completion_requirement][type]',
            'module_item[indent]',
            'module_item[new_tab]',
            'module_item[position]',
            'module_item[title]',
        ]);
        expect(body.get('module_item[completion_requirement][type]')).toEqual('must_submit');
        expect(body.has('moduleItem[title]')).toBe(false);
    });
});
