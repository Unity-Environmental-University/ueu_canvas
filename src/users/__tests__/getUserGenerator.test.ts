import {getPagedDataGenerator} from "@/fetch/getPagedDataGenerator";
import {getUserGenerator} from "@/users/getUserGenerator";

jest.mock('@/fetch/getPagedDataGenerator', () => ({
    getPagedDataGenerator: jest.fn(),
}));

const getPagedDataGeneratorMock = getPagedDataGenerator as jest.Mock;

describe('getUserGenerator', () => {
    beforeEach(() => {
        getPagedDataGeneratorMock.mockReset();
    });

    it('sends only the query params for a course, not the whole config', () => {
        getUserGenerator({courseId: 10, queryParams: {enrollment_type: 'teacher', sort: 'last_login'}});

        expect(getPagedDataGeneratorMock).toHaveBeenCalledWith(
            '/api/v1/courses/10/users',
            {queryParams: {enrollment_type: 'teacher', sort: 'last_login'}},
        );
    });

    it('sends only the query params for an account, not the whole config', () => {
        getUserGenerator({accountId: 5, queryParams: {search_term: 'smith'}});

        expect(getPagedDataGeneratorMock).toHaveBeenCalledWith(
            '/api/v1/accounts/5/users',
            {queryParams: {search_term: 'smith'}},
        );
    });

    it('encodes an array enrollment_type as enrollment_type[]', async () => {
        const {getPagedDataGenerator: realGenerator} = jest.requireActual('@/fetch/getPagedDataGenerator');
        const fetchMock = jest.fn().mockResolvedValue({ok: true, json: async () => [], headers: new Headers()});
        const originalFetch = global.fetch;
        global.fetch = fetchMock as unknown as typeof fetch;
        try {
            getPagedDataGeneratorMock.mockImplementation(realGenerator);
            const generator = getUserGenerator({courseId: 10, queryParams: {enrollment_type: ['teacher']}});
            for await (const _ of generator) { /* drain */ }
        } finally {
            global.fetch = originalFetch;
        }

        const requested = new URL(String(fetchMock.mock.calls[0][0]), 'https://canvas.example');
        expect(requested.pathname).toEqual('/api/v1/courses/10/users');
        expect([...requested.searchParams.keys()]).toEqual(['enrollment_type[]']);
        expect(requested.searchParams.getAll('enrollment_type[]')).toEqual(['teacher']);
    });

    it('sends no query string when no query params are given', () => {
        getUserGenerator({courseId: 10});

        expect(getPagedDataGeneratorMock).toHaveBeenCalledWith(
            '/api/v1/courses/10/users',
            {queryParams: undefined},
        );
    });
});
