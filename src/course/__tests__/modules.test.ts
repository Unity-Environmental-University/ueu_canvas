import {Temporal} from "temporal-polyfill";
import {fetchJson} from "@/fetch/fetchJson";
import {changeModuleLockDate} from "@/course/modules";
import {mockModuleData} from "@/course/__mocks__/mockModuleData";

jest.mock('@/fetch/fetchJson', () => ({
    fetchJson: jest.fn(),
}));

describe('changeModuleLockDate', () => {
    const module = {...mockModuleData, id: 7};
    const targetDate = Temporal.PlainDate.from('2024-03-04');

    beforeEach(() => {
        (fetchJson as jest.Mock).mockReset();
    });

    it('PUTs the new unlock date and resolves with the updated module', async () => {
        const updated = {...module, unlock_at: '2024-03-04T00:00:00Z'};
        (fetchJson as jest.Mock).mockResolvedValue(updated);

        await expect(changeModuleLockDate(3, module, targetDate)).resolves.toEqual(updated);
        expect(fetchJson).toHaveBeenCalledWith(
            '/api/v1/courses/3/modules/7',
            expect.objectContaining({fetchInit: expect.objectContaining({method: 'PUT'})}),
        );
        const body = (fetchJson as jest.Mock).mock.calls[0][1].fetchInit.body as FormData;
        expect(body.get('module[unlock_at]')).toEqual('2024-03-04');
    });

    it('rejects when the PUT fails', async () => {
        const error = new Error('401 Unauthorized');
        (fetchJson as jest.Mock).mockRejectedValue(error);

        await expect(changeModuleLockDate(3, module, targetDate)).rejects.toBe(error);
    });
});
