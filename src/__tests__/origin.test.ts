import { describe, expect, it, beforeEach } from "@jest/globals";
import { fetchJson } from "@/fetch/fetchJson";
import { getPagedData } from "@/fetch/getPagedDataGenerator";
import { withOrigin } from "@/fetch/withOrigin";
import { Course } from "@/course/Course";
import { Page } from "@/content/pages/Page";
import { ICourseData } from "@/types";

const UNITY = "https://unity.instructure.com";
const CAREER_EDGE = "https://careeredge.instructure.com";

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

/** Every request answers with the url it was sent to, after a seeded-random delay. */
function echoUrls(delayFor: (url: string) => number = () => 0) {
  fetchMock.mockImplementation(async (url: string) => {
    await new Promise((resolve) => setTimeout(resolve, delayFor(url)));
    return fakeResponse([{ id: 1, page_id: 1, requestedUrl: url }]);
  });
}

function fakeResponse(body: unknown) {
  return { ok: true, status: 200, headers: new Headers(), json: async () => body } as unknown as Response;
}

const requestedUrls = () => fetchMock.mock.calls.map(([url]) => url as string);

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Runs a property over seeded random inputs, naming the seed when it fails. */
function forSeeds(runs: number, property: (random: () => number) => void | Promise<void>) {
  return async () => {
    const baseSeed = Number(process.env.PROPERTY_SEED ?? Date.now() % 2 ** 31);
    for (let run = 0; run < runs; run++) {
      const seed = baseSeed + run;
      try {
        await property(mulberry32(seed));
      } catch (error) {
        throw new Error(`property failed, rerun with PROPERTY_SEED=${seed}: ${error}`);
      }
    }
  };
}

const pick = <T>(random: () => number, items: T[]) => items[Math.floor(random() * items.length)];
const randomOrigin = (random: () => number) =>
  `https://${pick(random, ["a", "b", "c", "unity", "careeredge"])}${Math.floor(random() * 1000)}.example.com`;
const randomPath = (random: () => number) =>
  "/api/v1/" + Array.from({ length: 1 + Math.floor(random() * 4) }, () => Math.floor(random() * 1e6).toString(36)).join("/");

beforeEach(() => {
  fetchMock.mockReset();
  echoUrls();
});

describe("origin on fetchJson", () => {
  it("leaves relative urls alone without an origin", async () => {
    await fetchJson("/api/v1/courses/1");
    expect(requestedUrls()).toEqual(["/api/v1/courses/1"]);
  });

  it("prefixes relative urls with the origin", async () => {
    await fetchJson("/api/v1/courses/1", { origin: CAREER_EDGE });
    expect(requestedUrls()).toEqual([`${CAREER_EDGE}/api/v1/courses/1`]);
  });

  it("tolerates a trailing slash on the origin", async () => {
    await fetchJson("/api/v1/courses/1", { origin: `${CAREER_EDGE}/` });
    expect(requestedUrls()).toEqual([`${CAREER_EDGE}/api/v1/courses/1`]);
  });

  it("never double-prefixes absolute urls", async () => {
    await fetchJson(`${UNITY}/api/v1/courses/1`, { origin: CAREER_EDGE });
    expect(requestedUrls()).toEqual([`${UNITY}/api/v1/courses/1`]);
  });

  it("applies the origin to paged requests too", async () => {
    await getPagedData("/api/v1/courses/1/pages", { origin: CAREER_EDGE });
    expect(requestedUrls()).toEqual([`${CAREER_EDGE}/api/v1/courses/1/pages`]);
  });

  it(
    "withOrigin: relative paths gain exactly the origin, absolute urls and missing origins change nothing",
    forSeeds(200, (random) => {
      const origin = randomOrigin(random);
      const path = randomPath(random);
      expect(withOrigin(path, origin)).toBe(origin + path);
      expect(withOrigin(origin + path, randomOrigin(random))).toBe(origin + path);
      expect(withOrigin(path, undefined)).toBe(path);
      expect(withOrigin(withOrigin(path, origin), origin)).toBe(origin + path);
    })
  );
});

describe("objects remember the origin they were created with", () => {
  const courseData = { id: 7, name: "Test" } as ICourseData;

  it("Course.getCourseById fetches from and stamps the origin", async () => {
    fetchMock.mockImplementation(async () => fakeResponse(courseData));
    const course = await Course.getCourseById(7, { origin: CAREER_EDGE });
    expect(requestedUrls()).toEqual([`${CAREER_EDGE}/api/v1/courses/7`]);
    expect(course.origin).toBe(CAREER_EDGE);
  });

  it("a course keeps its origin across getPages, getFrontPage and its pages' saves", async () => {
    const course = new Course(courseData, CAREER_EDGE);
    const pages = await course.getPages();
    await course.getFrontPage();
    await pages[0].saveData({ "wiki_page[body]": "x" });
    expect(pages[0].origin).toBe(CAREER_EDGE);
    for (const url of requestedUrls()) expect(url.startsWith(CAREER_EDGE + "/")).toBe(true);
    expect(requestedUrls()).toHaveLength(3);
  });

  it("an explicit origin in a call's config wins over the object's", async () => {
    const course = new Course(courseData, CAREER_EDGE);
    await course.getPages({ origin: UNITY });
    expect(requestedUrls()).toEqual([`${UNITY}/api/v1/courses/7/pages`]);
  });

  it("without an origin everything stays relative", async () => {
    const course = new Course(courseData);
    await course.getPages();
    await new Page({ page_id: 1, url: "p" } as any, 7).saveData({ title: "t" });
    for (const url of requestedUrls()) expect(url.startsWith("/api/v1/")).toBe(true);
  });
});

describe("concurrent calls with different origins", () => {
  it(
    "each request goes to its own caller's origin, whatever the interleaving",
    forSeeds(25, async (random) => {
      fetchMock.mockReset();
      echoUrls(() => Math.floor(random() * 5));
      const origins = Array.from({ length: 2 + Math.floor(random() * 6) }, () => randomOrigin(random));

      const results = await Promise.all(
        origins.map(async (origin, index) => {
          const course = new Course({ id: index + 1 } as ICourseData, origin);
          const pages = await course.getPages();
          const front = await course.getFrontPage();
          return { origin, index, pages, front };
        })
      );

      for (const { origin, index, pages, front } of results) {
        const expectedPrefix = `${origin}/api/v1/courses/${index + 1}/`;
        expect(pages[0].rawData.requestedUrl.startsWith(expectedPrefix)).toBe(true);
        expect(front?.origin).toBe(origin);
      }
      for (const url of requestedUrls()) {
        expect(origins.some((origin) => url.startsWith(origin + "/"))).toBe(true);
      }
    })
  );
});
