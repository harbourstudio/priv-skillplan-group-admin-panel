import { IconSet } from './types';
type IconStoreState = {
    iconSets: {
        [key: string]: IconSet;
    };
};
/**
 * Returns all icons sets
 *
 * @param {object} state Data state.
 *
 * @returns {Array?} Icon Sets.
 */
export declare function getIconSets(state: IconStoreState): IconSet[];
/**
 * Returns an Icon Set by its name
 *
 * @param {object} state Data state.
 * @param {string} name Name of the Icon Set.
 *
 * @returns {object?} Icon Set.
 */
export declare function getIconSet(state: IconStoreState, name: string): IconSet;
/**
 * Returns an icon of an icon set by its name
 *
 * @param {object} state Data state.
 * @param {string} name Name of the Icon Set.
 *
 * @returns {Array?} List of Icons.
 */
export declare function getIcons(state: IconStoreState, name: string): import("./types").Icon[];
/**
 * Returns an icon of an icon set by its name
 *
 * @param {object} state Data state.
 * @param {string} name Name of the Icon Set.
 * @param {string} iconName Name of the iconName.
 *
 * @returns {object?} Icon.
 */
export declare function getIcon(state: IconStoreState, name: string, iconName: string): import("./types").Icon | never[] | undefined;
export {};
//# sourceMappingURL=selectors.d.ts.map