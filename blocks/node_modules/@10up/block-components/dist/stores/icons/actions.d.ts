import { IconSet } from './types';
/**
 * Returns an action object used in signalling that new block styles have been added.
 *
 * @param {object} iconSet icon set.
 *
 * @returns {object} Action object.
 */
export declare function registerIconSet(iconSet: IconSet): {
    readonly type: "REGISTER_ICON_SET";
    readonly iconSet: IconSet;
};
/**
 * Returns an action object used in signalling that block styles have been removed.
 *
 * @param {string} name  Icon Set name.
 *
 * @returns {object} Action object.
 */
export declare function removeIconSet(name: string): {
    readonly type: "REMOVE_ICON_SET";
    readonly name: string;
};
export type IconSetAction = ReturnType<typeof registerIconSet> | ReturnType<typeof removeIconSet>;
//# sourceMappingURL=actions.d.ts.map