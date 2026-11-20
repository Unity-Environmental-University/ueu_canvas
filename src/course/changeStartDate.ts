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

/** The year from a term name such as `DE5W11.16.26` (new style) or `DE-24-Jan` (old style). */
function yearFromTermName(termName: string) {
  const yearMatchNew = termName.match(/\.(\d{2})$/);
  if (yearMatchNew) return 2000 + parseInt(yearMatchNew[1]);
  const yearMatchOld = termName.match(/DE-(\d{2})-/);
  if (yearMatchOld) return 2000 + parseInt(yearMatchOld[1]);
  return undefined;
}

/**
 * True if the syllabus uses the "course meta" format: a `table[data-course-meta]` holding the course's title, term,
 * dates, etc., which the theme fills into `[data-course-field]` placeholders on the page.
 * Parsed with DOMParser, so nothing in the syllabus is loaded or run.
 */
export function hasCourseMetaTable(syllabusHtml: string) {
  return new DOMParser().parseFromString(syllabusHtml, "text/html").querySelector("table[data-course-meta]") !== null;
}

/** The `data-course-meta` table as `{ "course-term": "DE5W11.16.26", "course-dates": "August 24 - September 27", ... }`. */
function readCourseMeta(syllabusHtml: string): Record<string, string> | null {
  const table = new DOMParser().parseFromString(syllabusHtml, "text/html").querySelector("table[data-course-meta]");
  if (!table) return null;

  const values: Record<string, string> = {};
  table.querySelectorAll("tr").forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length === 2) values[cells[0].textContent?.trim() ?? ""] = cells[1].textContent?.trim() ?? "";
  });
  return values;
}

/**
 * Start date from the "course meta" syllabus format.
 * Returns null when the syllabus has no `data-course-meta` table (it is not in that format).
 * Throws MalformedSyllabusError when the table is there but its dates can't be read.
 */
export function getStartDateFromCourseMeta(syllabusHtml: string, locale = DEFAULT_LOCALE) {
  const meta = readCourseMeta(syllabusHtml);
  if (!meta) return null;

  const dates = meta["course-dates"];
  if (!dates) throw new MalformedSyllabusError("The course-dates row of the syllabus meta table is empty");

  const dateRange = findDateRange(dates, locale);
  if (!dateRange) throw new MalformedSyllabusError("Date range not found in the syllabus meta table");

  // The dates read "August 24 - September 27", with no year; the term name carries it (DE5W08.24.26).
  const year = yearFromTermName(meta["course-term"] ?? "");
  if (!year) return dateRange.start;
  return Temporal.PlainDate.from({ year, month: dateRange.start.month, day: dateRange.start.day });
}

/**
 * The term name (e.g. `DE5W06.04.20`) from the syllabus, in whichever format it uses.
 * 1. The `course-term` row of the "course meta" table, if it has a value.
 * 2. Otherwise the "Year/Term/Session" line of the original callout box.
 * Returns null when neither is there. Unlike getStartDateFromSyllabus it never throws.
 */
export function getTermNameFromSyllabus(syllabusHtml: string): string | null {
  const metaTermName = readCourseMeta(syllabusHtml)?.["course-term"];
  if (metaTermName) return metaTermName;

  const syllabusBody = document.createElement("div");
  syllabusBody.innerHTML = syllabusHtml;
  const syllabusCalloutBox = syllabusBody.querySelector("div.cbt-callout-box");
  const strongParas = Array.from(syllabusCalloutBox?.querySelectorAll("p") ?? []).filter((para) =>
    para.querySelector("strong")
  );
  const termNameEl = strongParas[1];
  if (!termNameEl) return null;
  return termNameEl.textContent?.trim().replace(/^.*:\s*/, "") ?? "";
}

/**
 * Start date from the syllabus, in whichever format it uses.
 * 1. The "course meta" table (new format), if the syllabus has one with readable dates.
 * 2. Otherwise the original callout-box format (getStartDateFromCalloutSyllabus), unchanged.
 * If both fail, the course-meta error is thrown when the syllabus has a meta table (it explains the problem better),
 * and the original error otherwise.
 */
export function getStartDateFromSyllabus(syllabusHtml: string, locale = DEFAULT_LOCALE) {
  let courseMetaError: unknown;
  try {
    const startDate = getStartDateFromCourseMeta(syllabusHtml, locale);
    if (startDate) return startDate;
  } catch (error) {
    courseMetaError = error;
  }

  try {
    return getStartDateFromCalloutSyllabus(syllabusHtml, locale);
  } catch (calloutError) {
    throw courseMetaError ?? calloutError;
  }
}

/** Start date from the original syllabus format, where the term and dates are written in the callout box. */
export function getStartDateFromCalloutSyllabus(syllabusHtml: string, locale = DEFAULT_LOCALE) {
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
  const yearToUse = yearFromTermName(termName);

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
  const [termName, weekCount] = oldTermName.match(/DE(\d)W\.?\d\d\.\d\d\.\d\d/) || [];
  if (termName) return getUpdatedStyleTermName(newTermStart, weekCount);
  const termNameUg = oldTermName.match(/(DE(?:.HL|)-\d\d)-(\w+)\w{2}?/i);
  const newWeekCount = isGrad ? 8 : 5;
  if (termNameUg) return getUpdatedStyleTermName(newTermStart, newWeekCount);
  throw new MalformedSyllabusError(`Can't Recognize Term Name ${oldTermName}`);
}

/**
 * Moves the syllabus to a new start date: the term name and the class dates.
 * 1. "Course meta" format: the `course-term` and `course-dates` rows of the data-course-meta table.
 * 2. Otherwise (or if the table's term/dates can't be read) the original callout-box format, unchanged.
 * If both fail, the course-meta error is thrown when the syllabus has a meta table, and the original error otherwise.
 */
export function updatedDateSyllabusHtml(
  html: string,
  newStartDate: Temporal.PlainDate,
  isGrad: boolean | undefined = undefined,
  locale = DEFAULT_LOCALE
) {
  let courseMetaError: unknown;
  try {
    const result = updatedDateCourseMetaHtml(html, newStartDate, isGrad, locale);
    if (result) return result;
  } catch (error) {
    courseMetaError = error;
  }

  try {
    return updatedDateCalloutSyllabusHtml(html, newStartDate, isGrad, locale);
  } catch (calloutError) {
    throw courseMetaError ?? calloutError;
  }
}

/**
 * New start date for the "course meta" format. Only the text of the `course-term` and `course-dates` cells changes
 * (the page fills those into its placeholders); everything else in the syllabus is left as it is.
 * Returns null when the syllabus has no `data-course-meta` table.
 */
export function updatedDateCourseMetaHtml(
  html: string,
  newStartDate: Temporal.PlainDate,
  isGrad: boolean | undefined = undefined,
  locale = DEFAULT_LOCALE
) {
  // A <template> holds the syllabus without loading or running anything in it, and keeps leading <link>s.
  const template = document.createElement("template");
  template.innerHTML = html;
  const table = template.content.querySelector("table[data-course-meta]");
  if (!table) return null;

  const cells: Record<string, Element> = {};
  table.querySelectorAll("tr").forEach((row) => {
    const tds = row.querySelectorAll("td");
    if (tds.length === 2) cells[tds[0].textContent?.trim() ?? ""] = tds[1];
  });
  const termCell = cells["course-term"];
  const datesCell = cells["course-dates"];
  if (!termCell || !datesCell) throw new MalformedSyllabusError("The syllabus meta table has no course-term or course-dates row");

  const oldTermName = termCell.textContent?.trim() ?? "";
  const oldDates = datesCell.textContent?.trim() ?? "";
  const dateRange = findDateRange(oldDates, locale);
  if (!dateRange) throw new MalformedSyllabusError("Date range not found in the syllabus meta table");

  const newEndDate = newStartDate.add(dateRange.start.until(dateRange.end));
  const newTermName = getNewTermName(oldTermName, newStartDate, isGrad);
  const newDates = `${dateToSyllabusString(newStartDate)} - ${dateToSyllabusString(newEndDate)}`;

  for (const [cell, text] of [
    [termCell, newTermName],
    [datesCell, newDates],
  ] as const) {
    const span = document.createElement("span");
    span.textContent = text;
    cell.replaceChildren(span);
  }

  const output = {
    html: template.innerHTML,
    changedText: [`${oldTermName} -> ${newTermName}`, `${oldDates} -> ${newDates}`],
  };
  template.remove();
  return output;
}

/** New start date for the original format, where the term and dates are written in the callout box. */
export function updatedDateCalloutSyllabusHtml(
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
