import {fetchJson} from "@/fetch/fetchJson";
import {mockAssignmentData} from "@/content/__mocks__/mockContentData";
import {IAssignmentData} from "@canvas/content/types";
// Import through the public entry point; this is the path consumers use.
import {updateAssignmentDueDates, UpdateAssignmentDueDatesError} from "@/content/assignments";

jest.mock('@/fetch/fetchJson', () => ({
    fetchJson: jest.fn(),
}));

type Deferred = {
    promise: Promise<any>,
    resolve: (value: any) => void,
    reject: (reason: any) => void,
}

function deferred(): Deferred {
    let resolve!: (value: any) => void;
    let reject!: (reason: any) => void;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return {promise, resolve, reject};
}

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

function trackSettled(promise: Promise<unknown>) {
    const state = {settled: false};
    promise.then(() => state.settled = true, () => state.settled = true);
    return state;
}

const assignmentData = (id: number): IAssignmentData => ({
    ...mockAssignmentData,
    id,
    course_id: 5,
    due_at: '2024-01-10T12:00:00Z',
});

describe('updateAssignmentDueDates', () => {
    let pending: Deferred[];

    beforeEach(() => {
        pending = [];
        (fetchJson as jest.Mock).mockReset();
        (fetchJson as jest.Mock).mockImplementation(() => {
            const d = deferred();
            pending.push(d);
            return d.promise;
        });
    });

    it('does not resolve until every due date PUT has settled', async () => {
        const call = updateAssignmentDueDates(2, [assignmentData(1), assignmentData(2)]);
        const state = trackSettled(call);

        await flushPromises();
        expect(fetchJson).toHaveBeenCalledTimes(2);
        expect(fetchJson).toHaveBeenCalledWith(
            '/api/v1/courses/5/assignments/1',
            expect.objectContaining({fetchInit: expect.objectContaining({method: 'PUT'})}),
        );
        expect(state.settled).toBe(false);

        pending[0].resolve({});
        await flushPromises();
        expect(state.settled).toBe(false);

        pending[1].resolve({});
        const result = await call;
        expect(result.map(a => a.id)).toEqual([1, 2]);
        expect(result.map(a => a.rawData.due_at)).toEqual([
            '2024-01-12T12:00:00.000Z',
            '2024-01-12T12:00:00.000Z',
        ]);
    });

    it('waits for the other PUTs, then rejects with the failures when one fails', async () => {
        const call = updateAssignmentDueDates(1, [assignmentData(1), assignmentData(2), assignmentData(3)]);
        const state = trackSettled(call);
        await flushPromises();
        expect(fetchJson).toHaveBeenCalledTimes(3);

        const reason = new Error('403 Forbidden');
        pending[1].reject(reason);
        pending[0].resolve({});
        await flushPromises();
        expect(state.settled).toBe(false);

        pending[2].resolve({});
        const error = await call.catch(e => e);
        expect(error).toBeInstanceOf(UpdateAssignmentDueDatesError);
        expect(error.failures).toHaveLength(1);
        expect(error.failures[0].assignment.id).toEqual(2);
        expect(error.failures[0].reason).toBe(reason);
        expect(error.assignments.map((a: { id: number }) => a.id)).toEqual([1, 2, 3]);
    });

    it('reports failures against the right assignment and counts only the updates it sent', async () => {
        const call = updateAssignmentDueDates(1, [
            {...assignmentData(1), due_at: null},
            assignmentData(2),
            assignmentData(3),
        ]);
        await flushPromises();
        expect(fetchJson).toHaveBeenCalledTimes(2);

        const reason = new Error('500 Internal Server Error');
        pending[0].resolve({});
        pending[1].reject(reason);
        const error = await call.catch(e => e);
        expect(error).toBeInstanceOf(UpdateAssignmentDueDatesError);
        expect(error.message).toEqual('Failed to update the due date of 1 of 2 assignments');
        expect(error.failures).toHaveLength(1);
        expect(error.failures[0].assignment.id).toEqual(3);
        expect(error.failures[0].reason).toBe(reason);
        expect(error.assignments.map((a: { id: number }) => a.id)).toEqual([1, 2, 3]);
    });

    it('skips assignments without a due date', async () => {
        const result = await updateAssignmentDueDates(1, [{...assignmentData(1), due_at: null}]);
        expect(fetchJson).not.toHaveBeenCalled();
        expect(result.map(a => a.id)).toEqual([1]);
    });
});
