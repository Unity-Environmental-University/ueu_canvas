import learningMaterialsForModule from "./learningMaterialsForModule";
import {Page} from "./Page";
import PageKind from "./PageKind";
import * as pageTypes from './types';

export * from "./learningMaterialsForModule";
export * from "./Page";
export * from "./PageKind";
export * from './types';

export default {
    learningMaterialsForModule,
    Page,
    PageKind,
    ...pageTypes,

}