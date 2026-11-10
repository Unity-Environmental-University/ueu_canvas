/**
 * Prefix a root-relative url ("/api/v1/...") with an origin.
 * Absolute urls and a missing origin leave the url unchanged.
 */
export function withOrigin(url: string, origin?: string | null): string {
    if (!origin || !url.startsWith('/') || url.startsWith('//')) return url;
    return origin.replace(/\/+$/, '') + url;
}
