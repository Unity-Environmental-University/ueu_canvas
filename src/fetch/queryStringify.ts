/**
 * Query-string encoding. Kept free of imports so the fetch layer can use it without
 * pulling in canvasUtils (which imports fetchJson, a circular dependency).
 */

export interface IQueryParams extends Record<string, any> {
    include?: (string | number)[]
}

export function queryStringify(data: Record<string, any>) {
    const searchParams = new URLSearchParams();
    for (const key in data) {
        addToQuery(searchParams, key, data[key])
    }

    return searchParams;
}

function addToQuery(searchParams: URLSearchParams, key: string, value: any | Record<string, any> | []) {
    if (Array.isArray(value)) {
        for (const item of value) {
            addToQuery(searchParams, `${key}[]`, item);
        }
    } else if (typeof value === 'object') {
        for (const itemKey in value) {
            const itemValue = value[itemKey];
            addToQuery(searchParams, key.length > 0 ? `${key}[${itemKey}]` : itemKey, itemValue);
        }
    } else {
        searchParams.append(key, value)
    }
}
