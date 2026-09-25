/**
 * Canvas instance configuration. Every hardcoded URL, account ID, and
 * template course ID lives here. The default matches Unity's production
 * Canvas instance; a second instance overrides what it needs.
 *
 * The active instance is set once at startup (setInstance) and read
 * everywhere else (getInstance). This avoids threading config through
 * every function signature while keeping it swappable.
 */

export interface CanvasInstanceConfig {
  /** Base URL of the Canvas instance, no trailing slash. */
  baseUrl: string;

  /** Hostname for URL matching (derived from baseUrl if not set). */
  hostname: string;

  /** Template course ID for dev/reference pages. */
  templateCourseId: number;

  /** References page slug in the template course. */
  referencesPageSlug: string;

  /** External API endpoints that may vary by deployment. */
  externalApis: {
    citeas: string;
  };
}

const UNITY_DEFAULTS: CanvasInstanceConfig = {
  baseUrl: "https://unity.instructure.com",
  hostname: "unity.instructure.com",
  templateCourseId: 3850558,
  referencesPageSlug: "learning-materials-reference-page",
  externalApis: {
    citeas: "https://api.citeas.org/product",
  },
};

let active: CanvasInstanceConfig = { ...UNITY_DEFAULTS };

export function getInstance(): CanvasInstanceConfig {
  return active;
}

export function setInstance(config: Partial<CanvasInstanceConfig>): void {
  active = { ...UNITY_DEFAULTS, ...config };
  if (config.baseUrl && !config.hostname) {
    try {
      active.hostname = new URL(config.baseUrl).hostname;
    } catch {
      // keep the default if baseUrl is unparseable
    }
  }
}

export function resetInstance(): void {
  active = { ...UNITY_DEFAULTS };
}

/** Check whether a URL belongs to the active Canvas instance. */
export function isCanvasUrl(url: string): boolean {
  try {
    return new URL(url).hostname === active.hostname;
  } catch {
    return url.includes(active.hostname);
  }
}

/**
 * Build an absolute Canvas URL from a relative path.
 * If already absolute, returns as-is.
 */
export function canvasUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${active.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}
