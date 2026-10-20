import {Syllabus} from "@/content/assignments/Syllabus";
import {Assignment} from "@/content/assignments/Assignment";
import {getContentClassFromUrl, getContentItemFromUrl} from "@/content/determineContent";
import {fetchJson} from "@/fetch/fetchJson";

jest.mock('@/fetch/fetchJson', () => ({
    ...jest.requireActual('@/fetch/fetchJson'),
    fetchJson: jest.fn(),
}))

describe('Syllabus', () => {
    beforeEach(() => {
        (fetchJson as jest.Mock).mockClear();
    });

    it('extends Assignment', () => {
        expect(Syllabus.prototype).toBeInstanceOf(Assignment);
    });

    it('is picked for a syllabus url, not Assignment', () => {
        expect(getContentClassFromUrl('https://example.com/courses/1/assignments/syllabus')).toBe(Syllabus);
    });

    it('is still Assignment for a normal assignment url', () => {
        expect(getContentClassFromUrl('https://example.com/courses/1/assignments/5')).toBe(Assignment);
    });

    it('does not fetch anything for a syllabus url', async () => {
        expect(await getContentItemFromUrl('https://example.com/courses/1/assignments/syllabus')).toBe(null);
        expect(fetchJson).not.toHaveBeenCalled();
    });
});
