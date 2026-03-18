/**
 * Add a script tag to body
 *
 * @param {string} scriptSource Source URL of the script to be loaded.
 * @returns {HTMLScriptElement} The script tag.
 */
export declare const useScript: (scriptSource: string) => {
    hasLoaded: boolean;
    scriptElement: HTMLScriptElement | null;
};
//# sourceMappingURL=index.d.ts.map