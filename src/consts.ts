import { getInstance } from "@/instance";

/** @deprecated Use getInstance().templateCourseId — this re-export exists for backward compat. */
export const DEV_TEMPLATE_COURSE_ID = 3850558;

/** @deprecated Use getInstance().referencesPageSlug — this re-export exists for backward compat. */
export const REFERENCES_PAGE_URL_NAME = 'learning-materials-reference-page';

/** Instance-aware accessors. Prefer these over the constants above. */
export const getTemplateCourseId = () => getInstance().templateCourseId;
export const getReferencesPageSlug = () => getInstance().referencesPageSlug;
