import {Assignment} from "@/content/assignments/Assignment";

// Canvas serves the course syllabus at /courses/:id/assignments/syllabus. It is shaped like an
// assignment, but there is no assignment behind that URL, so the API lookup would 404. This class
// keeps the syllabus out of the assignment lookup while still sharing Assignment's behavior.
export class Syllabus extends Assignment {
    static get contentUrlPart() {
        return 'assignments/syllabus';
    }

    static async getFromUrl(_url: string | null = null, _courseId: number | null = null) {
        return null;
    }
}

export default Syllabus;
