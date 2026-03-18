/**
 * Hook for retrieving data from the WordPress REST API.
 *
 * @param {string} entity           The entity to retrieve. ie. postType
 * @param {string} kind             The entity kind to retrieve. ie. posts
 * @param {object | number} [query] Optional. Query to pass to the geEntityRecords request. Defaults to an empty object. If a number is passed, it is used as the ID of the entity to retrieve via getEntityRecord.
 * @returns {Array} The data returned from the request.
 */
export declare const useRequestData: (entity: string, kind: string, query?: Record<string, any>) => any[];
//# sourceMappingURL=index.d.ts.map