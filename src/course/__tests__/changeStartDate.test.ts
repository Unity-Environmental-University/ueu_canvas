import {
  getModuleUnlockStartDate,
  getNewTermName,
  getOldUgTermName,
  getStartDateAssignments,
  MalformedSyllabusError,
  NoAssignmentsWithDueDatesError,
  NoOverviewModuleFoundError,
  sortAssignmentsByDueDate,
  syllabusHeaderName,
  updatedDateSyllabusHtml,
  getStartDateFromSyllabus,
  getStartDateFromCalloutSyllabus,
  getStartDateFromCourseMeta,
  hasCourseMetaTable,
  getTermNameFromSyllabus,
} from "../changeStartDate";
import { Temporal } from "temporal-polyfill";
import { mockAssignmentData } from "@/content/__mocks__/mockContentData";
import { range } from "@/canvasUtils";
import mockModuleData from "@/course/__mocks__/mockModuleData";
import { Assignment } from "@/content/assignments/Assignment";
import * as assignments from "@/content/assignments";
import { assignmentDataGen } from "@/content/assignments";
import { mockAsyncGen } from "@/__mocks__/utils";
const baseSyllabus = jest.requireActual("@canvas/course/__mocks__/syllabus.gallant.html");
const gradSyllabus = jest.requireActual("@canvas/course/__mocks__/syllabus.grad.html");
declare const global: {
  fetch: jest.Mock;
};

describe("Syllabus date changes", () => {
  test("Changing date works for grad courses", () => {
    const now = Temporal.Now.plainDateISO();
    const syllabus = gradSyllabus;
    const newSyllabus = updatedDateSyllabusHtml(syllabus, now);
    const month = now.toLocaleString("en-US", { month: "2-digit" });
    const day = now.toLocaleString("en-US", { day: "2-digit" });
    const year = now.toLocaleString("en-US", { year: "2-digit" });
    expect(newSyllabus.html).toContain(`DE8W${month}.${day}.${year}`);
  });
  test("Changing date works for undergrad courses", () => {
    const now = Temporal.Now.plainDateISO();
    const syllabus = baseSyllabus;
    const newSyllabus = updatedDateSyllabusHtml(syllabus, now);
    const month = now.toLocaleString("en-US", { month: "2-digit" });
    const day = now.toLocaleString("en-US", { day: "2-digit" });
    const year = now.toLocaleString("en-US", { year: "2-digit" });
    expect(newSyllabus.html).toContain(`DE5W${month}.${day}.${year}`);
  });

  test("changing date does not double paragraph tags", () => {
    const now = Temporal.Now.plainDateISO();
    const newSyllabus = updatedDateSyllabusHtml(baseSyllabus, now);
    expect(newSyllabus.html).not.toContain("<p>&nbsp;</p>");
    expect(newSyllabus.html).not.toContain("<p></p>");
    expect(newSyllabus.html).not.toMatch(/<p>\s*<\/p>/);
  });
});

function shuffle<T>(list: T[]) {
  const source = [...list];
  const dest: T[] = [];
  while (source.length > 0) {
    const index = Math.floor(Math.random() * source.length);
    dest.push(...source.splice(index, 1));
  }
  return dest;
}

describe("sortAssignmentsByDate", () => {
  const now = Temporal.Now;
  const mockAssignments: Assignment[] = shuffle(
    [...range(0, 10)].map((i) => {
      return new Assignment(
        {
          ...mockAssignmentData,
          id: i,
          due_at: now
            .plainDateTimeISO()
            .add({ days: 100 - i })
            .toString(),
        },
        0
      );
    })
  );

  it("sorts assignment by date", () => {
    const sorted = sortAssignmentsByDueDate(mockAssignments);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const current = sorted[i];
      expect(prev.dueAt?.getTime()).toBeLessThan(current.dueAt!.getTime());
    }
  });

  it("sorts non-due-date assignments to the end", () => {
    const toSort = shuffle([
      ...mockAssignments,
      new Assignment({ ...mockAssignmentData, due_at: null }, -98),
      new Assignment({ ...mockAssignmentData, due_at: null }, -99),
    ]);
    const sorted = sortAssignmentsByDueDate(toSort);
    const dates = sorted.map((value) => value.dueAt);
    expect(dates[sorted.length - 1]).toBeNull();
    expect(dates[sorted.length - 2]).toBeNull();
  });
});

describe("getCurrentStartDate", () => {
  it("returns a temporal plainDate if there's a module lock date", () => {
    const mockModules = [{ ...mockModuleData, unlock_at: "2022-12-24T00:00:00Z" }];
    expect(getModuleUnlockStartDate(mockModules)).toEqual(new Temporal.PlainDate(2022, 12, 24));
  });
  it("throws an error if it can't find overview module", () => {
    expect(() => getModuleUnlockStartDate([])).toThrow(NoOverviewModuleFoundError);
  });
  it("returns null if there's no lock date in the first module", () => {
    const mockModules = [{ ...mockModuleData, unlock_at: null }];
    expect(getModuleUnlockStartDate(mockModules)).toBeNull();
  });
});

describe("getStartDateAssignments", () => {
  beforeAll(() => {
    // Mock global fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve([]),
        ok: true,
        headers: new Headers({
          Link: "",
        }),
      })
    );
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("gets the first assignment due and returns the monday of that week", async () => {
    // Wednesday Jan 15, 2025 assignment
    const mockAssignment = {
      due_at: "2025-01-15T23:59:59Z",
    };

    // Setup mock generator
    const mockGen = mockAsyncGen([{ ...mockAssignmentData, ...mockAssignment }]);

    jest.spyOn(assignments, "assignmentDataGen").mockReturnValue(mockGen);

    const result = await getStartDateAssignments(12345);

    // Should return Monday Jan 13, 2025
    const expected = Temporal.PlainDate.from({ year: 2025, month: 1, day: 13 });
    expect(result.equals(expected)).toBe(true);
  });

  it("throws an error if there are no assignments with due dates", async () => {
    jest.spyOn({ assignmentDataGen }, "assignmentDataGen").mockReturnValue(mockAsyncGen([mockAssignmentData]));

    await expect(getStartDateAssignments(123)).rejects.toThrow(NoAssignmentsWithDueDatesError);
  });
});

describe("getNewTermName", () => {
  const newTermStart = new Temporal.PlainDate(2024, 12, 1);
  it("throws an error with a bad term name", () => {
    expect(() => getNewTermName("ABCDEFGX", newTermStart)).toThrow(MalformedSyllabusError);
  });

  it("returns a new style grad term name from old style grad term name", () => {
    expect(getNewTermName("DE8W05.07.22", newTermStart)).toEqual("DE8W12.01.24");
  });
  it("returns a new style undergrad term name from old style undergrad term name", () => {
    expect(getNewTermName("DE/HL-22-Dec", newTermStart)).toEqual("DE5W12.01.24");
  });
});

describe("getOldUgTermName", () => {
  it("returns a legacy old styl ug term name", () => {
    expect(getOldUgTermName(new Temporal.PlainDate(2024, 12, 24))).toEqual("DE-24-Dec");
  });
});

//April 8 - May 12
describe("getStartDateSyllabus", () => {
  it("gets the correct start date from the syllabus", () => {
    const syllabus = baseSyllabus;
    const startDate = getStartDateFromSyllabus(syllabus);
    expect(startDate).toEqual(new Temporal.PlainDate(2024, 4, 8));
  });

  it("throws an error if the syllabus is malformed", () => {
    const syllabus = "<p>hello world</p>";
    expect(() => updatedDateSyllabusHtml(syllabus, new Temporal.PlainDate(2024, 12, 1))).toThrow(
      MalformedSyllabusError
    );
  });
});

describe("syllabusHeaderName", () => {
  function fakeHeader(text: string) {
    const el = document.createElement("p");
    el.innerHTML = text;
    return el;
  }

  it("works", () => {
    expect(syllabusHeaderName(fakeHeader("<strong>Credits:</strong> 3"))).toEqual("Credits");
  });

  it("handles multiple strong tags", () => {
    expect(syllabusHeaderName(fakeHeader("<strong>Course</strong> <strong>Inclusive Dates:</strong>"))).toEqual(
      "Course Inclusive Dates"
    );
  });
  it("handles outside the tags colon", () => {
    expect(syllabusHeaderName(fakeHeader("<strong>Course</strong> <strong>Inclusive Dates</strong>:"))).toEqual(
      "Course Inclusive Dates"
    );
    expect(syllabusHeaderName(fakeHeader("<strong>Credits</strong>:"))).toEqual("Credits");
  });
  it("return undefined when : not found", () => {
    expect(syllabusHeaderName(fakeHeader("<strong>Course</strong> <strong>Inclusive Dates</strong>"))).toBeUndefined();
  });
});

describe("Term Name Year Extraction", () => {
  describe("New Style Term Names (DE5W06.11.25)", () => {
    const testCases = [
      { syllabus: baseSyllabus, expectedYear: 2024 },
      { syllabus: gradSyllabus, expectedYear: 2024 },
    ];

    testCases.forEach(({ syllabus, expectedYear }) => {
      it(`extracts year ${expectedYear} from syllabus`, () => {
        const startDate = getStartDateFromSyllabus(syllabus);
        expect(startDate.year).toBe(expectedYear);
      });
    });
  });

  describe("Year Preservation in Date Range", () => {
    it("preserves the extracted year across the entire date range", () => {
      const startDate = getStartDateFromSyllabus(baseSyllabus);
      expect(startDate.year).toBe(2024);
      expect(startDate.month).toBeGreaterThan(0);
      expect(startDate.day).toBeGreaterThan(0);
    });

    it("preserves the extracted year for grad syllabus", () => {
      const startDate = getStartDateFromSyllabus(gradSyllabus);
      expect(startDate.year).toBe(2024);
      expect(startDate.month).toBeGreaterThan(0);
      expect(startDate.day).toBeGreaterThan(0);
    });
  });
});

describe("course meta syllabus format", () => {
  // The callout holds empty placeholders; the values live in the data-course-meta table.
  const courseMetaSyllabus = (term = "DE5W08.24.26", dates = "August 24 - September 27") => `
<table data-course-meta=""><tbody>
<tr><td>course-title</td><td>BIOL 101: Biology</td></tr>
<tr><td>course-term</td><td><span>${term}</span></td></tr>
<tr><td>course-dates</td><td><span>${dates}</span></td></tr>
<tr><td>credits</td><td>3</td></tr>
<tr><td>course-description</td><td>A course.</td></tr>
<tr><td>course-outcomes</td><td>One | Two</td></tr>
<tr><td>textbook</td><td>Not required</td></tr>
</tbody></table>
<h1>Unity Environmental University Distance Education Course Syllabus</h1>
<div class="cbt-callout-box"><div class="content">
<p><strong>Course Number and Title:</strong> <span data-course-field="course-title">&nbsp;</span></p>
<p><strong>Year/Term/Session:</strong> <span data-course-field="course-term">&nbsp;</span></p>
<p><strong>Class Inclusive Date:</strong> <span data-course-field="course-dates">&nbsp;</span></p>
<p><strong>Instructor Name:</strong> See <a href="https://example.edu/home">Home</a></p>
<p><strong>Instructor Contact Information</strong>: Canvas Conversations</p>
<p><strong>Credits:&nbsp;</strong> <span data-course-field="credits">&nbsp;</span></p>
</div></div>`;

  it("getStartDateFromSyllabus reads the date from the meta table", () => {
    expect(getStartDateFromSyllabus(courseMetaSyllabus())).toEqual(new Temporal.PlainDate(2026, 8, 24));
  });

  it("takes the year from an older style term name", () => {
    const html = courseMetaSyllabus("DE-24-Jan", "January 15 - February 18");
    expect(getStartDateFromSyllabus(html)).toEqual(new Temporal.PlainDate(2024, 1, 15));
  });

  it("falls back to the original callout format when there is no meta table", () => {
    expect(hasCourseMetaTable(baseSyllabus)).toBe(false);
    expect(getStartDateFromSyllabus(baseSyllabus)).toEqual(getStartDateFromCalloutSyllabus(baseSyllabus));
    expect(getStartDateFromSyllabus(baseSyllabus)).toEqual(new Temporal.PlainDate(2024, 4, 8));
  });

  it("falls back to the callout when the meta table's dates are blank", () => {
    const blankTable = courseMetaSyllabus("", "").split("<h1>")[0];
    const html = baseSyllabus + blankTable;
    expect(hasCourseMetaTable(html)).toBe(true);
    expect(getStartDateFromSyllabus(html)).toEqual(new Temporal.PlainDate(2024, 4, 8));
  });

  it("explains a blank meta table when the callout can't be read either", () => {
    expect(() => getStartDateFromSyllabus(courseMetaSyllabus("DE5W08.24.26", ""))).toThrow(/meta table/);
  });

  it("keeps the original error for a syllabus in neither format", () => {
    expect(() => getStartDateFromSyllabus("<p>hello world</p>")).toThrow("Can't find syllabus callout box");
  });

  it("getStartDateFromCourseMeta is null without a meta table, and loads nothing from the syllabus", () => {
    expect(getStartDateFromCourseMeta(baseSyllabus)).toBeNull();
    const html = courseMetaSyllabus() + '<img src="x" onerror="window.__ran = true"><script>window.__ran = true</script>';
    getStartDateFromCourseMeta(html);
    expect((window as any).__ran).toBeUndefined();
  });

  describe("updatedDateSyllabusHtml", () => {
    const newStart = new Temporal.PlainDate(2026, 10, 5);

    it("updates the course-term and course-dates rows of the meta table, keeping the course length", () => {
      const result = updatedDateSyllabusHtml(courseMetaSyllabus(), newStart);
      const table = new DOMParser().parseFromString(result.html, "text/html").querySelector("table[data-course-meta]")!;
      const rows = Object.fromEntries(
        Array.from(table.querySelectorAll("tr")).map((r) => [r.cells[0].textContent, r.cells[1].textContent])
      );
      expect(rows["course-term"]).toBe("DE5W10.05.26");
      expect(rows["course-dates"]).toBe("October 5 - November 8"); // Aug 24 - Sep 27 is 34 days
      expect(result.changedText).toEqual([
        "DE5W08.24.26 -> DE5W10.05.26",
        "August 24 - September 27 -> October 5 - November 8",
      ]);
    });

    it("changes nothing else: other rows, the callout placeholders, links, and blank paragraphs", () => {
      const html = '<link rel="stylesheet" href="https://example.edu/a.css">' + courseMetaSyllabus() + "<p>&nbsp;</p>";
      const result = updatedDateSyllabusHtml(html, newStart).html;
      expect(result).toContain('<link rel="stylesheet" href="https://example.edu/a.css">');
      expect(result).toContain("<td>BIOL 101: Biology</td>");
      expect(result).toContain("<td>One | Two</td>");
      expect(result).toContain('<span data-course-field="course-dates">&nbsp;</span>');
      expect(result).toContain('<a href="https://example.edu/home">Home</a>');
      expect(result).toContain("<p>&nbsp;</p>"); // the original path strips these; the meta path leaves the page alone
    });

    it("reads back as the new start date", () => {
      const updated = updatedDateSyllabusHtml(courseMetaSyllabus(), newStart).html;
      expect(getStartDateFromSyllabus(updated)).toEqual(newStart);
    });

    it("names the new term for grad and undergrad courses from an older style term name", () => {
      const old = courseMetaSyllabus("DE-24-Jan", "January 15 - February 18");
      expect(updatedDateSyllabusHtml(old, newStart, false).changedText[0]).toBe("DE-24-Jan -> DE5W10.05.26");
      expect(updatedDateSyllabusHtml(old, newStart, true).changedText[0]).toBe("DE-24-Jan -> DE8W10.05.26");
    });

    it("recognizes a term name with a stray dot (DE5W.07.13.26)", () => {
      const html = courseMetaSyllabus("DE5W.07.13.26", "July 13 - August 16");
      expect(updatedDateSyllabusHtml(html, newStart).changedText[0]).toBe("DE5W.07.13.26 -> DE5W10.05.26");
    });

    it("falls back to the original callout when the meta table has no usable dates", () => {
      const html = baseSyllabus + courseMetaSyllabus("", "").split("<h1>")[0];
      const result = updatedDateSyllabusHtml(html, newStart);
      expect(result.html).toContain("DE5W10.05.26");
    });

    it("throws the meta table's error when neither format can be updated", () => {
      expect(() => updatedDateSyllabusHtml(courseMetaSyllabus("DE5W08.24.26", ""), newStart)).toThrow(/meta table/);
      expect(() => updatedDateSyllabusHtml(courseMetaSyllabus("Spring", "August 24 - September 27"), newStart)).toThrow(
        "Can't Recognize Term Name Spring"
      );
    });
  });
});

describe("getTermNameFromSyllabus", () => {
  const callout = (termPara: string) => `<div class="cbt-callout-box"><div class="content">
<p><strong>Course Number and Title:</strong> BIOL 101</p>${termPara}
<p><strong>Class Inclusive Dates:</strong><span> August 24 - September 27</span></p></div></div>`;
  const meta = (term: string) =>
    `<table data-course-meta=""><tbody><tr><td>course-term</td><td><span>${term}</span></td></tr></tbody></table>`;
  const placeholderTerm = '<p><strong>Year/Term/Session:</strong> <span data-course-field="course-term">&nbsp;</span></p>';

  it("reads the term from the course meta table", () => {
    expect(getTermNameFromSyllabus(meta("DE5W08.24.26") + callout(placeholderTerm))).toBe("DE5W08.24.26");
  });

  it("reads the term from the original callout format", () => {
    const html = callout("<p><strong>Year/Term/Session:</strong><span> DE5W06.04.20</span></p>");
    expect(getTermNameFromSyllabus(html)).toBe("DE5W06.04.20");
    expect(getTermNameFromSyllabus(baseSyllabus)).toMatch(/^DE/);
  });

  it("falls back to the callout when the meta table's term is blank", () => {
    const html = meta("") + callout("<p><strong>Year/Term/Session:</strong><span> DE5W06.04.20</span></p>");
    expect(getTermNameFromSyllabus(html)).toBe("DE5W06.04.20");
  });

  it("gives an empty term (not an error) for an unfilled placeholder with no meta table", () => {
    expect(getTermNameFromSyllabus(callout(placeholderTerm))).toBe("");
  });

  it("is null when the syllabus has neither", () => {
    expect(getTermNameFromSyllabus("<p>hello</p>")).toBeNull();
    expect(getTermNameFromSyllabus('<div class="cbt-callout-box"><p><strong>Only one</strong></p></div>')).toBeNull();
  });
});
