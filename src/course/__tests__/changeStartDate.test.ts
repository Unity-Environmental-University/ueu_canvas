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
    expect(newSyllabus).not.toContain("<p>&nbsp;</p>");
    expect(newSyllabus).not.toContain("<p></p>");
    expect(newSyllabus).not.toContain(/<p>\s*<\/p>/);
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
