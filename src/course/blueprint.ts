import { formDataify, getItemTypeAndId, ICanvasCallConfig, renderAsyncGen } from "../canvasUtils";
import { IModuleData, IModuleItemData } from "../canvasDataDefs";
import { getCourseDataGenerator, getCourseGenerator } from "./toolbox";
import { GetCoursesFromAccountOptions } from "./courseTypes";
import { baseCourseCode } from "@/course/code";
import { ICourseData, SectionData } from "@/types";
import { getPagedDataGenerator } from "@/fetch/getPagedDataGenerator";
import { fetchGetConfig } from "@/fetch/utils";
import { fetchJson } from "@/fetch/fetchJson";
import apiWriteConfig from "@/fetch/apiWriteConfig";

export function isBlueprint({ blueprint }: { blueprint?: boolean | undefined }) {
  return !!blueprint;
}
//W
export function genBlueprintDataForCode(
  courseCode: string | null,
  accountIds: number[],
  queryParams?: GetCoursesFromAccountOptions
) {
  if (!courseCode) {
    console.warn("Course code not present");
    return null;
  }
  const baseCode = baseCourseCode(courseCode);
  if (!baseCode) {
    console.warn(`Code ${courseCode} invalid`);
    return null;
  }

  return getCourseDataGenerator(
    baseCode,
    accountIds,
    undefined,
    fetchGetConfig<GetCoursesFromAccountOptions>(
      {
        blueprint: true,
        include: ["concluded"],
      },
      { queryParams }
    )
  );
}

export function sectionDataGenerator(courseId: number, config?: ICanvasCallConfig<GetCoursesFromAccountOptions>) {
  const url = `/api/v1/courses/${courseId}/blueprint_templates/default/associated_courses`;
  return getPagedDataGenerator<SectionData>(url, config);
}

type BeginSyncOptions = {
  config?: ICanvasCallConfig;
  copy_settings?: boolean;
  message?: string;
};
export async function beginBpSync(courseId: number, { message, copy_settings, config }: BeginSyncOptions) {
  const url = `/api/v1/courses/${courseId}/blueprint_templates/default/migrations`;
  if (typeof copy_settings === "undefined") copy_settings = true;
  return await fetchJson(
    url,
    apiWriteConfig(
      "POST",
      {
        message,
        copy_settings,
      },
      config
    )
  );
}

export async function getBlueprintsFromCode(
  code: string,
  accountIds: number[],
  config?: ICanvasCallConfig<GetCoursesFromAccountOptions>
) {
  const [_, baseCode] = code.match(/_(\w{4}\d{3,4})$/) || [];
  if (!baseCode) return null;
  const bps = getCourseGenerator(`BP_${baseCode}`, accountIds, undefined, config);
  return (await renderAsyncGen(bps)).toSorted((a, b) => b.name.length - a.name.length);
}

export async function lockBlueprint(courseId: number, modules: IModuleData[]) {
  let items: IModuleItemData[] = [];

  items = items.concat(...modules.map((a) => (<IModuleItemData[]>[]).concat(...a.items)));
  const promises = items.map(async (item) => {
    const url = `/api/v1/courses/${courseId}/blueprint_templates/default/restrict_item`;
    const { type, id } = await getItemTypeAndId(item);
    if (typeof id === "undefined") return;
    const body = {
      content_type: type,
      content_id: id,
      restricted: true,
      _method: "PUT",
    };
    await fetchJson(url, {
      fetchInit: {
        method: "PUT",
        body: formDataify(body),
      },
    });
  });
  await Promise.all(promises);
}

export async function setAsBlueprint(courseId: number, config?: ICanvasCallConfig) {
  const url = `/api/v1/courses/${courseId}`;
  const payload = {
    course: {
      blueprint: true,
      use_blueprint_restrictions_by_object_type: 0,
      blueprint_restrictions: {
        content: 1,
        points: 1,
        due_dates: 1,
        availability_dates: 1,
      },
    },
  };
  return (await fetchJson(url, apiWriteConfig("PUT", payload, config))) as ICourseData;
}

export async function unSetAsBlueprint(courseId: number, config?: ICanvasCallConfig) {
  const url = `/api/v1/courses/${courseId}`;
  const payload = {
    course: {
      blueprint: false,
    },
  };
  return (await fetchJson(url, apiWriteConfig("PUT", payload, config))) as ICourseData;
}
