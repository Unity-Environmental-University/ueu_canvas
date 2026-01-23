export function getCourseIdFromUrl(url: string) {
    const match = /courses\/(\d+)/.exec(url);
    if (match) {
        return parseInt(match[1]);
    }
    return null;
}

export default getCourseIdFromUrl; 