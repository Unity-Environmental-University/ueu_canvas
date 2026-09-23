import { canvasUrl, getInstance, isCanvasUrl, resetInstance, setInstance } from "@/instance";
import { getTemplateCourseId, getReferencesPageSlug } from "@/consts";
import { getExternalLinks } from "@/content/getContentFuncs";

afterEach(() => resetInstance());

describe("instance defaults", () => {
  test("default instance is Unity production", () => {
    expect(getInstance().baseUrl).toBe("https://unity.instructure.com");
    expect(getInstance().hostname).toBe("unity.instructure.com");
    expect(getTemplateCourseId()).toBe(3850558);
    expect(getReferencesPageSlug()).toBe("learning-materials-reference-page");
  });
});

describe("setInstance", () => {
  test("derives hostname from baseUrl when hostname is not given", () => {
    setInstance({ baseUrl: "https://other.instructure.com" });
    expect(getInstance().hostname).toBe("other.instructure.com");
  });

  test("explicit hostname wins over baseUrl", () => {
    setInstance({ baseUrl: "https://other.instructure.com", hostname: "canvas.other.edu" });
    expect(getInstance().hostname).toBe("canvas.other.edu");
  });

  test("keeps default hostname when baseUrl is unparseable", () => {
    setInstance({ baseUrl: "not a url" });
    expect(getInstance().hostname).toBe("unity.instructure.com");
  });

  test("overrides start from defaults, not from the previous instance", () => {
    setInstance({ templateCourseId: 1 });
    setInstance({ referencesPageSlug: "refs" });
    expect(getTemplateCourseId()).toBe(3850558);
    expect(getReferencesPageSlug()).toBe("refs");
  });

  test("resetInstance restores defaults", () => {
    setInstance({ baseUrl: "https://other.instructure.com", templateCourseId: 1 });
    resetInstance();
    expect(getInstance().hostname).toBe("unity.instructure.com");
    expect(getTemplateCourseId()).toBe(3850558);
  });
});

describe("isCanvasUrl", () => {
  test("matches absolute URLs on the active host, case-insensitively", () => {
    expect(isCanvasUrl("https://unity.instructure.com/courses/1/pages/x")).toBe(true);
    expect(isCanvasUrl("https://UNITY.instructure.com/courses/1")).toBe(true);
  });

  test("does not match other hosts, including lookalikes", () => {
    expect(isCanvasUrl("https://unity.test.instructure.com/courses/1")).toBe(false);
    expect(isCanvasUrl("https://example.com/?next=https://unity.instructure.com/")).toBe(false);
    expect(isCanvasUrl("https://unity.instructure.com.evil.com/")).toBe(false);
  });

  test("follows the active instance", () => {
    setInstance({ baseUrl: "https://other.instructure.com" });
    expect(isCanvasUrl("https://other.instructure.com/courses/1")).toBe(true);
    expect(isCanvasUrl("https://unity.instructure.com/courses/1")).toBe(false);
  });

  test("relative URLs are not treated as Canvas URLs", () => {
    expect(isCanvasUrl("/courses/1/pages/x")).toBe(false);
  });
});

describe("canvasUrl", () => {
  test("prefixes relative paths with the active baseUrl", () => {
    expect(canvasUrl("/api/v1/courses/1")).toBe("https://unity.instructure.com/api/v1/courses/1");
    expect(canvasUrl("api/v1/courses/1")).toBe("https://unity.instructure.com/api/v1/courses/1");
  });

  test("leaves absolute URLs alone", () => {
    expect(canvasUrl("https://example.com/x")).toBe("https://example.com/x");
  });

  test("follows the active instance", () => {
    setInstance({ baseUrl: "https://other.instructure.com" });
    expect(canvasUrl("/courses/1")).toBe("https://other.instructure.com/courses/1");
  });
});

describe("getExternalLinks", () => {
  const body = `
    <a href="https://unity.instructure.com/courses/1/pages/x">internal</a>
    <a href="https://www.example.com/article">external</a>
    <a href="https://other.instructure.com/courses/2">other canvas</a>`;

  test("excludes links on the active Canvas host", () => {
    expect(getExternalLinks(body, 1)).toEqual([
      "https://www.example.com/article",
      "https://other.instructure.com/courses/2",
    ]);
  });

  test("follows the active instance", () => {
    setInstance({ baseUrl: "https://other.instructure.com" });
    expect(getExternalLinks(body, 1)).toEqual([
      "https://unity.instructure.com/courses/1/pages/x",
      "https://www.example.com/article",
    ]);
  });
});
