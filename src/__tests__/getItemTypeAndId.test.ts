import {fetchJson} from "@/fetch/fetchJson";
import {getItemTypeAndId} from "@/canvasUtils";
import {mockModuleItemData} from "@/course/__mocks__/mockModuleData";

jest.mock('@/fetch/fetchJson', () => ({
    fetchJson: jest.fn(),
}));

describe('getItemTypeAndId', () => {
    beforeEach(() => {
        (fetchJson as jest.Mock).mockReset();
    });

    it('accepts SubHeader items, the type Canvas sends for text headers', async () => {
        const item = {...mockModuleItemData, type: 'SubHeader' as const, content_id: 0};

        await expect(getItemTypeAndId(item)).resolves.toEqual({type: null, id: 0});
        expect(fetchJson).not.toHaveBeenCalled();
    });

    it('still accepts the old Subheader spelling', async () => {
        const item = {...mockModuleItemData, type: 'Subheader' as const, content_id: 0};

        await expect(getItemTypeAndId(item)).resolves.toEqual({type: null, id: 0});
    });

    it('maps assignments to their content id', async () => {
        const item = {...mockModuleItemData, type: 'Assignment' as const, content_id: 42};

        await expect(getItemTypeAndId(item)).resolves.toEqual({type: 'assignment', id: 42});
    });
});
