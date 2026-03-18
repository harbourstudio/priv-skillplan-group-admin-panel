/**
 * External dependencies
 */
import type { WP_REST_API_User, WP_REST_API_Search_Result } from 'wp-types';
/**
 * Types
 */
import type { ContentSearchMode, QueryFilter, QueryFieldsFilter, SearchResultFilter } from './types';
interface IdentifiableObject extends Object {
    id: number;
}
interface FilterResultsArgs {
    results: WP_REST_API_User[] | WP_REST_API_Search_Result[];
    excludeItems: Array<IdentifiableObject>;
}
export declare const filterOutExcludedItems: ({ results, excludeItems }: FilterResultsArgs) => (WP_REST_API_User | WP_REST_API_Search_Result)[];
interface PrepareSearchQueryArgs {
    keyword: string;
    page: number;
    mode: ContentSearchMode;
    perPage: number;
    contentTypes: Array<string>;
    queryFilter: QueryFilter;
    queryFieldsFilter?: QueryFieldsFilter;
}
export declare const prepareSearchQuery: ({ keyword, page, mode, perPage, contentTypes, queryFilter, queryFieldsFilter, }: PrepareSearchQueryArgs) => string;
interface NormalizeResultsArgs {
    mode: ContentSearchMode;
    results: WP_REST_API_Search_Result[] | WP_REST_API_User[];
    excludeItems: Array<IdentifiableObject>;
    searchResultFilter?: SearchResultFilter;
}
/**
 * Convert a WP "rendered" title (which can contain HTML + entities) into plain text.
 * - Strips any HTML tags.
 * - Decodes HTML entities.
 * - Normalizes NBSP and trims.
 */
export declare const toPlainTextTitle: (input: string | undefined | null) => string;
export declare const normalizeResults: ({ mode, results, excludeItems, searchResultFilter, }: NormalizeResultsArgs) => Array<{
    id: number;
    subtype: ContentSearchMode | string;
    title: string;
    type: ContentSearchMode | string;
    url: string;
    info?: string;
}>;
export type NormalizedSuggestions = ReturnType<typeof normalizeResults>;
export type NormalizedSuggestion = NormalizedSuggestions[number];
interface FetchSearchResultsArgs {
    keyword: string;
    page: number;
    mode: ContentSearchMode;
    perPage: number;
    contentTypes: Array<string>;
    queryFilter: QueryFilter;
    queryFieldsFilter?: QueryFieldsFilter;
    searchResultFilter?: SearchResultFilter;
    excludeItems: Array<IdentifiableObject>;
    signal?: AbortSignal;
}
export declare function fetchSearchResults({ keyword, page, mode, perPage, contentTypes, queryFilter, queryFieldsFilter, searchResultFilter, excludeItems, signal, }: FetchSearchResultsArgs): Promise<{
    results: {
        id: number;
        subtype: ContentSearchMode | string;
        title: string;
        type: ContentSearchMode | string;
        url: string;
        info?: string;
    }[];
    nextPage: number | undefined;
    previousPage: number | undefined;
}>;
export {};
//# sourceMappingURL=utils.d.ts.map