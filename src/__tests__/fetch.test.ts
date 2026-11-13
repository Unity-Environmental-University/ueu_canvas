import { deepObjectMerge, ICanvasCallConfig, queryStringify, range, renderAsyncGen } from "../canvasUtils";
import { describe, expect } from "@jest/globals";
import { CanvasData } from "../canvasDataDefs";
import { getPagedData, getPagedDataGenerator } from "@/fetch/getPagedDataGenerator";
import { fetchGetConfig } from "@/fetch/utils";
import { fetchJson, FetchJsonError } from "@/fetch/fetchJson";
import { canvasDataFetchGenFunc } from "@/fetch/canvasDataFetchGenFunc";

global.fetch = jest.fn();
const fetchMock = fetch as jest.Mock;

describe("renderAsyncGen renders an async generator out", () => {
  const entries = range(0, 20);
  it("render async generator", async () => {
    const asyncGen = async function* () {
      for (const i of [...entries]) {
        yield i;
      }
    };
    const entryIterator = range(0, 20);
    for (const result of await renderAsyncGen(asyncGen())) {
      expect(result).toEqual(entryIterator.next().value);
    }
  });
});

describe("canvasDataFetchGenFunc", () => {
  type Goober = {
    name: string;
    courseId: number;
    gooberId: number;
  } & CanvasData;
  const config: ICanvasCallConfig = { fetchInit: {} };
  const goobers: Goober[] = [...range(0, 10)].map((i) => ({ name: "thistle", courseId: i, gooberId: i }));

  it("successfully generates urls and results", async () => {
    const fetchGoobersGen = canvasDataFetchGenFunc<Goober, { courseId: number; gooberId: number }>(
      ({ courseId, gooberId }) => `/api/v1/${courseId}/${gooberId}`
    );
    for (let i = 0; i < 10; i++) {
      expect(fetchMock).toHaveBeenCalledTimes(i);
      const expectedFetchResult = [goobers[i]];
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => expectedFetchResult,
      });
      const getGoobers = fetchGoobersGen({ courseId: i, gooberId: i * 2 }, config);
      const { value } = await getGoobers.next();
      expect(fetchMock).toHaveBeenCalledWith(`/api/v1/${i}/${i * 2}`, config.fetchInit);
      expect(value).toEqual(goobers[i]);
    }
  });
});

describe("fetchJson", () => {
  const testData = { a: 1, b: 2, c: 3 };

  it("rejects relative paths", async () => {
    await expect(async () => await fetchJson("apple/dumpling/gang")).rejects.toThrow();
  });
  it("accepts paths starting with /", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => testData });
    expect(await fetchJson("/apple/dumpling/gang")).toEqual(testData);
  });
  it("accepts paths starting with http, http, ftp", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => testData });
    expect(await fetchJson("http://localhost:8080/apple/dumpling/gang")).toEqual(testData);
    fetchMock.mockResolvedValue({ ok: true, json: async () => testData });
    expect(await fetchJson("https://localhost:8080/apple/dumpling/gang")).toEqual(testData);
    fetchMock.mockResolvedValue({ ok: true, json: async () => testData });
    expect(await fetchJson("ftp://localhost:8080/apple/dumpling/gang")).toEqual(testData);
  });

  it("incorporatesQueryParams", async () => {
    fetchMock.mockReturnValue({ ok: true, json: async () => testData });
    const fetchInit: RequestInit = { method: "PUT" };
    await fetchJson("/url", {
      queryParams: {
        query: "test",
      },
      fetchInit,
    });
    expect(fetchMock).toHaveBeenCalledWith("/url?query=test", fetchInit);
  });
  it("throws on non-2xx responses with a JSON body and exposes the body", async () => {
    const errorBody = { errors: { base: [{ message: "boom" }] } };
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => errorBody,
    } as any);
    await expect(fetchJson("/url")).rejects.toBeInstanceOf(FetchJsonError);
  });
  it("includes the error body on non-2xx failures", async () => {
    const errorBody = { errors: { base: [{ message: "boom" }] } };
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => errorBody,
    } as any);
    await expect(fetchJson("/url")).rejects.toMatchObject({
      status: 400,
      statusText: "Bad Request",
      body: errorBody,
    });
  });
});

describe("fetchGetConfig", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should merge the options in", () => {
    const options = { param1: "value1" };
    const baseConfig = { queryParams: { a: "1" } };

    const config = fetchGetConfig<Record<string, any>>(options, baseConfig);

    expect(config).toEqual(deepObjectMerge<Record<string, any>>({ queryParams: options }, baseConfig));
  });
});

describe("getPagedDataGenerator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should append queryParams to the URL if provided", async () => {
    const mockUrl = "http://example.com/api/data";
    const mockConfig: ICanvasCallConfig = {
      queryParams: { key1: "value1", key2: "value2" },
    };

    const mockData = [{ id: 1 }, { id: 2 }];
    fetchMock.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockData),
      headers: new Headers({}),
      ok: true,
    } as any);

    const urlWithParams = `${mockUrl}?key1=value1&key2=value2`;

    const generator = getPagedDataGenerator<CanvasData>(mockUrl, mockConfig);
    await generator.next();

    expect(fetchMock).toHaveBeenCalledWith(urlWithParams, mockConfig.fetchInit);
  });

  it("should yield data from the response", async () => {
    const mockUrl = "http://example.com/api/data";
    const mockData = [{ id: 1 }, { id: 2 }];
    fetchMock.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockData),
      headers: new Headers({}),
      ok: true,
    } as any);

    const generator = getPagedDataGenerator<CanvasData>(mockUrl);

    const result1 = await generator.next();
    const result2 = await generator.next();

    expect(result1.value).toEqual({ id: 1 });
    expect(result2.value).toEqual({ id: 2 });
  });

  it("should handle paginated responses", async () => {
    const mockUrl = "http://example.com/api/data";
    const mockDataPage1 = [{ id: 1 }, { id: 2 }];
    const mockDataPage2 = [{ id: 3 }, { id: 4 }];
    const nextLink = '<http://example.com/api/data?page=2>; rel="next"';

    fetchMock
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue(mockDataPage1),
        headers: new Headers({ Link: nextLink }),
        ok: true,
      } as any)
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue(mockDataPage2),
        headers: new Headers({}),
        ok: true,
      } as any);

    const generator = getPagedDataGenerator<CanvasData>(mockUrl);

    const result1 = await generator.next();
    const result2 = await generator.next();
    const result3 = await generator.next();
    const result4 = await generator.next();

    expect([result1, result2, result3, result4].map((a) => a.value.id)).toEqual([1, 2, 3, 4]);
  });

  it('should log a warning if the URL contains "undefined"', async () => {
    const mockUrl = "http://example.com/api/data/undefined";
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

    const mockData = [{ id: 1 }];
    fetchMock.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockData),
      headers: new Headers({}),
      ok: true,
    } as any);

    const generator = getPagedDataGenerator<CanvasData>(mockUrl);
    await generator.next();

    expect(consoleWarnSpy).toHaveBeenCalledWith(mockUrl);

    consoleWarnSpy.mockRestore();
  });

  it("should return an empty array and log a warning if no data is found", async () => {
    const mockUrl = "http://example.com/api/data";
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

    fetchMock.mockResolvedValue({
      json: jest.fn().mockResolvedValue(null),
      headers: new Headers({}),
      ok: true,
    } as any);

    const generator = getPagedDataGenerator<CanvasData>(mockUrl);
    const result = await generator.next();

    expect(result.value).toEqual([]);
    expect(consoleWarnSpy).toHaveBeenCalledWith(`no data found for ${mockUrl}`);

    consoleWarnSpy.mockRestore();
  });

  it("should process non-array object response data and yield values", async () => {
    const mockUrl = "http://example.com/api/data";
    const mockData = { items: [{ id: 1 }, { id: 2 }], otherKey: "value" };
    fetchMock.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockData),
      headers: new Headers({}),
      ok: true,
    } as any);

    const generator = getPagedDataGenerator<CanvasData>(mockUrl);

    const result1 = await generator.next();
    const result2 = await generator.next();

    expect(result1.value).toEqual({ id: 1 });
    expect(result2.value).toEqual({ id: 2 });
  });

  it("should handle nested non-array object response data and yield values", async () => {
    const mockUrl = "http://example.com/api/data";
    const mockData = { items: [{ id: 1 }, { id: 2 }], otherKey: "value" };
    fetchMock.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockData),
      headers: new Headers({}),
      ok: true,
    } as any);

    const generator = getPagedDataGenerator<CanvasData>(mockUrl);

    const result1 = await generator.next();
    const result2 = await generator.next();

    expect(result1.value).toEqual({ id: 1 });
    expect(result2.value).toEqual({ id: 2 });
  });

  it("should concatenate previous and current page data if response data is non-array object", async () => {
    const mockUrl = "http://example.com/api/data";
    const mockDataPage1 = [{ id: 1 }];
    const mockDataPage2 = { items: [{ id: 2 }, { id: 3 }], otherKey: "value" };
    const nextLink = '<http://example.com/api/data?page=2>; rel="next"';

    fetchMock
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue(mockDataPage1),
        headers: new Headers({ Link: nextLink }),
        ok: true,
      } as any)
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue(mockDataPage2),
        headers: new Headers({}),
        ok: true,
      } as any);

    const generator = getPagedDataGenerator<CanvasData>(mockUrl);

    const result1 = await generator.next();
    const result2 = await generator.next();
    const result3 = await generator.next();

    expect(result1.value.id).toEqual(1);
    expect(result2.value.id).toEqual(2);
    expect(result3.value.id).toEqual(3);
  });

  it("should stop pagination when no next link is present", async () => {
    const mockUrl = "http://example.com/api/data";
    const mockDataPage1 = [{ id: 1 }];
    const noNextLink = "";

    fetchMock.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mockDataPage1),
      headers: new Headers({ Link: noNextLink }),
      ok: true,
    } as any);

    const generator = getPagedDataGenerator<CanvasData>(mockUrl);

    const result1 = await generator.next();
    const result2 = await generator.next();

    expect(result1.value).toEqual({ id: 1 });
    expect(result2.done).toBe(true);
  });
});

describe("getPagedDataGenerator error handling and pagination", () => {
  let consoleErrorSpy: jest.SpyInstance;

  const okPage = (data: unknown, link?: string) =>
    ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: jest.fn().mockResolvedValue(data),
      headers: new Headers(link ? { Link: link } : {}),
    }) as any;

  beforeEach(() => {
    fetchMock.mockReset();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("rejects with FetchJsonError on a 401 first page instead of yielding the error body", async () => {
    const errorBody = { errors: [{ message: "user authorization required" }], status: "unauthenticated" };
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => errorBody,
      headers: new Headers({}),
    } as any);

    const generator = getPagedDataGenerator<CanvasData>("http://example.com/api/v1/accounts");

    await expect(generator.next()).rejects.toMatchObject({
      name: "FetchJsonError",
      status: 401,
      statusText: "Unauthorized",
      body: errorBody,
    });
  });

  it("rejects getPagedData with FetchJsonError on a 403", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: async () => ({ errors: [{ message: "unauthorized" }] }),
      headers: new Headers({}),
    } as any);

    await expect(getPagedData("http://example.com/api/v1/accounts")).rejects.toBeInstanceOf(FetchJsonError);
  });

  it("rejects with FetchJsonError when page 2 returns a 500 with a non-JSON body", async () => {
    fetchMock.mockResolvedValueOnce(okPage([{ id: 1 }], '<http://example.com/api/data?page=2>; rel="next"'))
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => {
          throw new SyntaxError("Unexpected token < in JSON");
        },
        headers: new Headers({}),
      } as any);

    const generator = getPagedDataGenerator<CanvasData>("http://example.com/api/data");
    expect((await generator.next()).value).toEqual({ id: 1 });

    const error = await generator.next().catch((e) => e);
    expect(error).toBeInstanceOf(FetchJsonError);
    expect(error).toMatchObject({ status: 500, body: undefined });
    expect(fetchMock).toHaveBeenLastCalledWith("http://example.com/api/data?page=2", undefined);
  });

  it("does not follow a rel=\"current\" link whose URL contains 'next'", async () => {
    const link =
      '<http://example.com/api/v1/courses/1/pages?search_term=next&page=1>; rel="current",' +
      '<http://example.com/api/v1/courses/1/pages?search_term=next&page=1>; rel="first",' +
      '<http://example.com/api/v1/courses/1/pages?search_term=next&page=1>; rel="last"';
    fetchMock.mockResolvedValue(okPage([{ id: 1 }], link));

    const results = await getPagedData("http://example.com/api/v1/courses/1/pages", {
      queryParams: { search_term: "next" },
    });

    expect(results).toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      "current first",
      '<http://example.com/api/data?page=1>; rel="current",<http://example.com/api/data?page=2>; rel="next",' +
        '<http://example.com/api/data?page=1>; rel="first",<http://example.com/api/data?page=3>; rel="last"',
    ],
    [
      "next last",
      '<http://example.com/api/data?page=1>; rel="first", <http://example.com/api/data?page=3>; rel="last", ' +
        '<http://example.com/api/data?page=2>; rel="next"',
    ],
    ["unquoted rel", "<http://example.com/api/data?page=2>; rel=next"],
  ])("follows the rel=\"next\" link regardless of entry order (%s)", async (_label, link) => {
    fetchMock.mockResolvedValueOnce(okPage([{ id: 1 }], link)).mockResolvedValueOnce(okPage([{ id: 2 }]));

    const results = await getPagedData("http://example.com/api/data");

    expect(results.map((r) => r.id)).toEqual([1, 2]);
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://example.com/api/data?page=2", undefined);
  });

  it("stops when the Link header has no next entry", async () => {
    fetchMock.mockResolvedValueOnce(
      okPage([{ id: 1 }], '<http://example.com/api/data?page=1>; rel="current",<http://example.com/api/data?page=1>; rel="last"')
    );

    const results = await getPagedData("http://example.com/api/data");

    expect(results).toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("joins queryParams with & when the URL already has a query string", async () => {
    fetchMock.mockResolvedValueOnce(okPage([{ id: 1 }]));

    await getPagedData("http://example.com/api/data?per_page=50", { queryParams: { include: ["a", "b"] } });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://example.com/api/data?per_page=50&include%5B%5D=a&include%5B%5D=b",
      undefined
    );
  });
});

describe("fetchJson query encoding", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });
  });

  it("encodes a multi-element include the same way as the pager", async () => {
    await fetchJson("/api/v1/courses/1/rubrics/2", { queryParams: { include: ["assessments", "associations"] } });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/courses/1/rubrics/2?include%5B%5D=assessments&include%5B%5D=associations",
      undefined
    );
  });

  it("joins queryParams with & when the URL already has a query string", async () => {
    await fetchJson("/api/v1/courses/1?per_page=10", { queryParams: { search_term: "x" } });

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/courses/1?per_page=10&search_term=x", undefined);
  });
});
