/**
 * useFilteredList
 *
 * @param {Array} list list of items to filter
 * @param {string} searchTerm search term string
 * @param {string?} property name of the prop
 * @returns {Array} filtered list
 */
export declare function useFilteredList<TListItem extends {
    [key: string]: string;
}>(list?: TListItem[], searchTerm?: string, property?: keyof TListItem): TListItem[][];
//# sourceMappingURL=index.d.ts.map