import { deepObjectMerge, ICanvasCallConfig, queryStringify, range, renderAsyncGen } from "../canvasUtils";
import { describe, expect } from "@jest/globals";
import { CanvasData } from "../canvasDataDefs";
import { getPagedDataGenerator } from "@/fetch/getPagedDataGenerator";
import { fetchGetConfig } from "@/fetch/utils";
import { fetchJson } from "@/fetch/fetchJson";
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
    fetchMock.mockResolvedValue({ json: async () => testData });
    expect(await fetchJson("/apple/dumpling/gang")).toEqual(testData);
  });
  it("accepts paths starting with http, http, ftp", async () => {
    fetchMock.mockResolvedValue({ json: async () => testData });
    expect(await fetchJson("http://localhost:8080/apple/dumpling/gang")).toEqual(testData);
    fetchMock.mockResolvedValue({ json: async () => testData });
    expect(await fetchJson("https://localhost:8080/apple/dumpling/gang")).toEqual(testData);
    fetchMock.mockResolvedValue({ json: async () => testData });
    expect(await fetchJson("ftp://localhost:8080/apple/dumpling/gang")).toEqual(testData);
  });

  it("incorporatesQueryParams", async () => {
    fetchMock.mockReturnValue({ json: async () => testData });
    const fetchInit: RequestInit = { method: "PUT" };
    await fetchJson("/url", {
      queryParams: {
        query: "test",
      },
      fetchInit,
    });
    expect(fetchMock).toHaveBeenCalledWith("/url?query=test", fetchInit);
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
