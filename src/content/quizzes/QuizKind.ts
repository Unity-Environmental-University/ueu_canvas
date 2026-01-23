import {ICanvasCallConfig} from "@/canvasUtils";
import {fetchJson} from "@/fetch/fetchJson";
import {getPagedDataGenerator} from "@/fetch/getPagedDataGenerator";

import {GetQuizOptions, IQuizData, SaveQuizOptions} from "@/content/quizzes/types";
import {ContentKind, contentUrlFuncs, putContentFunc} from "@/content/ContentKind";

export const quizUrlFuncs = contentUrlFuncs('quizzes');
export const QuizKind: ContentKind<IQuizData, GetQuizOptions, SaveQuizOptions> = {
    getId: (data) => data.id,
    getName: (data) => data.title,
    dataIsThisKind: (data): data is IQuizData => 'quiz_type' in data,
    getBody: (data) => data.description,
    async get(courseId: number, contentId: number, config?: ICanvasCallConfig<Record<string, any>>) {
        const data = await fetchJson(quizUrlFuncs.getApiUrl(courseId, contentId), config) as IQuizData;
        return data;
    },
    ...quizUrlFuncs,
    dataGenerator: (courseId, config) => getPagedDataGenerator<IQuizData>(quizUrlFuncs.getAllApiUrl(courseId), config),
    put: putContentFunc<SaveQuizOptions, IQuizData>(quizUrlFuncs.getApiUrl),
}

export default QuizKind;