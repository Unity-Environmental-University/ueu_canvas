import { Temporal } from "temporal-polyfill";
import { IModuleData } from "../canvasDataDefs";
import { findDateRange, oldDateToPlainDate } from "@/date";

import { Assignment } from "@/content/assignments/Assignment";

import { IAssignmentData } from "@canvas/content/types";
import { assignmentDataGen } from "@/content";

const DEFAULT_LOCALE = "en-US";

export function getModuleUnlockStartDate(modules: IModuleData[]) {
  if (modules.length == 0) throw new NoOverviewModuleFoundError();
  const overviewModule = modules[0];
  const unlockDateString = overviewModule.unlock_at;
  if (!unlockDateString) return null;
  const oldDate = new Date(unlockDateString);
  return oldDateToPlainDate(oldDate);
}

//This may be unnecessary, as the API call is now pulling by due_at date.
export function sortAssignmentsByDueDate(assignments: Assignment[] | IAssignmentData[]) {
  return assignments.toSorted((a, b) => {
    a = a instanceof Assignment ? a.rawData : a;
    b = b instanceof Assignment ? b.rawData : b;

    if (a.due_at && b.due_at) {
      return oldDateToPlainDate(new Date(b.due_at)).until(oldDateToPlainDate(new Date(a.due_at))).days;
    }
    if (a.due_at) return -1;
    if (b.due_at) return 1;
    return 0;
  });
}

export async function getStartDateAssignments(courseId: number) {
  const assignmentGen = assignmentDataGen(courseId, {
    queryParams: {
      order_by: "due_at",
      per_page: 2,
    },
  });

  let assignmentDueAt: string | undefined;

  for await (const assignment of assignmentGen) {
    if (assignment.due_at) {
      assignmentDueAt = assignment.due_at;
      break;
    }
  }

  if (!assignmentDueAt) throw new NoAssignmentsWithDueDatesError();

  //Set to monday of that week.
  const firstAssignmentDue = new Date(assignmentDueAt);
  const plainDateDue = oldDateToPlainDate(firstAssignmentDue);
  const dayOfWeekOffset = 1 - plainDateDue.dayOfWeek;
  return plainDateDue.add({ days: dayOfWeekOffset });
}

export function getStartDateFromSyllabus(syllabusHtml: string, locale = DEFAULT_LOCALE) {
  const syllabusBody = document.createElement("div");
  syllabusBody.innerHTML = syllabusHtml;
  const syllabusCalloutBox = syllabusBody.querySelector("div.cbt-callout-box");
  if (!syllabusCalloutBox) throw new MalformedSyllabusError("Can't find syllabus callout box");

  const paras = Array.from(syllabusCalloutBox.querySelectorAll("p"));
  const strongParas = paras.filter((para) => para.querySelector("strong"));
  if (strongParas.length < 5) throw new MalformedSyllabusError(`Missing syllabus headers\n${strongParas}`);

  const termNameEl = strongParas[1];
  const datesEl = strongParas[2];
  let dateRange = findDateRange(datesEl.innerHTML, locale);
  if (!dateRange) throw new MalformedSyllabusError("Date range not found in syllabus");

  const termName = termNameEl.textContent || "";
  let yearToUse: number | undefined;

  const yearMatchNew = termName.match(/\.(\d{2})$/);
  if (yearMatchNew) {
    yearToUse = 2000 + parseInt(yearMatchNew[1]);
  } else {
    const yearMatchOld = termName.match(/DE-(\d{2})-/);
    if (yearMatchOld) {
      yearToUse = 2000 + parseInt(yearMatchOld[1]);
    }
  }

  if (yearToUse) {
    dateRange = {
      start: Temporal.PlainDate.from({
        year: yearToUse,
        month: dateRange.start.month,
        day: dateRange.start.day,
      }),
      end: Temporal.PlainDate.from({
        year: yearToUse,
        month: dateRange.end.month,
        day: dateRange.end.day,
      }),
    };
  }

  return dateRange.start;
}

export function getUpdatedStyleTermName(
  termStart: Temporal.PlainDate,
  weekCount: string | number,
  locale = DEFAULT_LOCALE
) {
  const month = termStart.toLocaleString(locale, { month: "2-digit" });
  const day = termStart.toLocaleString(locale, { day: "2-digit" });
  const year = termStart.toLocaleString(locale, { year: "2-digit" });
  return `DE${weekCount}W${month}.${day}.${year}`;
}

export function getOldUgTermName(termStart: Temporal.PlainDate) {
  const year = termStart.toLocaleString(DEFAULT_LOCALE, { year: "2-digit" });
  const month = termStart.toLocaleString(DEFAULT_LOCALE, { month: "short" });
  return `DE-${year}-${month}`;
}

export function getNewTermName(
  oldTermName: string,
  newTermStart: Temporal.PlainDate,
  isGrad: boolean | undefined = undefined
) {
  const [termName, weekCount] = oldTermName.match(/DE(\d)W\d\d\.\d\d\.\d\d/) || [];
  if (termName) return getUpdatedStyleTermName(newTermStart, weekCount);
  const termNameUg = oldTermName.match(/(DE(?:.HL|)-\d\d)-(\w+)\w{2}?/i);
  const newWeekCount = isGrad ? 8 : 5;
  if (termNameUg) return getUpdatedStyleTermName(newTermStart, newWeekCount);
  throw new MalformedSyllabusError(`Can't Recognize Term Name ${oldTermName}`);
}

export function updatedDateSyllabusHtml(
  html: string,
  newStartDate: Temporal.PlainDate,
  isGrad: boolean | undefined = undefined,
  locale = DEFAULT_LOCALE
) {
  const syllabusBody = document.createElement("div");
  syllabusBody.innerHTML = html;
  const syllabusCalloutBox = syllabusBody.querySelector("div.cbt-callout-box");
  if (!syllabusCalloutBox) throw new MalformedSyllabusError("Can't find syllabus callout box");

  const paras = Array.from(syllabusCalloutBox.querySelectorAll("p"));
  const strongParas = paras.filter((para) => para.querySelector("strong"));
  if (strongParas.length < 5) throw new MalformedSyllabusError(`Missing syllabus headers\n${strongParas}`);

  const [_courseNameEl, termNameEl, datesEl, _instructorNameEl, _instructorContactInfoEl, _creditsEl] = strongParas;

  const changedText: string[] = [];

  const oldTermName = termNameEl.textContent || "";
  const oldDates = datesEl.textContent || "";
  const dateRange = findDateRange(datesEl.innerHTML, locale);
  if (!dateRange) throw new MalformedSyllabusError("Date range not found in syllabus");

  const courseDuration = dateRange.start.until(dateRange.end);
  const newEndDate = newStartDate.add(courseDuration);

  const newTermName = getNewTermName(oldTermName, newStartDate, isGrad);

  const dateRangeText = `${dateToSyllabusString(newStartDate)} - ${dateToSyllabusString(newEndDate)}`;

  termNameEl.innerHTML = `<strong>${syllabusHeaderName(termNameEl)}:</strong><span> ${newTermName}</span>`;
  datesEl.innerHTML = `<strong>${syllabusHeaderName(datesEl)}:</strong><span> ${dateRangeText}</span>`;

  changedText.push(`${oldTermName} -> ${termNameEl.textContent}`);
  changedText.push(`${oldDates} -> ${datesEl.textContent}`);

  const output = {
    html: syllabusBody.innerHTML.replaceAll(/<p>\s*(&nbsp;)?<\/p>/gi, ""),
    changedText,
  };
  syllabusBody.remove();
  return output;
}

function dateToSyllabusString(date: Temporal.PlainDate) {
  return `${date.toLocaleString(DEFAULT_LOCALE, { month: "long", day: "numeric" })}`;
}

export function syllabusHeaderName(el: HTMLElement) {
  // eslint-disable-next-line prefer-const
  let [_, head] = /([^:]*):/.exec(el.innerHTML) ?? [];
  head = head?.replaceAll(/<[^>]*>/g, "");
  return head;
}

export class NoOverviewModuleFoundError extends Error {
  public name = "NoOverviewModuleFoundError";
}

export class MalformedSyllabusError extends Error {
  public name = "MalformedSyllabusError";
}

export class NoAssignmentsWithDueDatesError extends Error {
  public name = "NoAssignmentsWithDueDatesError";
}
