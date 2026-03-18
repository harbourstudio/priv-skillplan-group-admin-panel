type DebouncedInputOptions = {
    delay: number;
};
/**
 * Helper hook for input fields that need to debounce the value before using it.
 *
 * @param {string}                defaultValue The default value to use.
 * @param {DebouncedInputOptions} options      Set of options for useDebounce, 350ms is the default
 *
 * @returns The input value, the setter and the debounced input value.
 */
export declare function useDebouncedInput(defaultValue?: string, options?: DebouncedInputOptions): [string, (value: string) => void, string];
export {};
//# sourceMappingURL=index.d.ts.map