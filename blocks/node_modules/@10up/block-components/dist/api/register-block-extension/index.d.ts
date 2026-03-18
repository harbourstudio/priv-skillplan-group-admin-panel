import { FC } from 'react';
interface BlockEditProps {
    name: string;
    isSelected: boolean;
    attributes: Record<string, any>;
    setAttributes: (attributes: Record<string, any>) => void;
    className: string;
    style: Record<string, any>;
    wrapperProps: {
        [key: string]: any;
    };
    [key: string]: unknown;
}
interface BlockOptionOptions {
    attributes: Record<string, any>;
    classNameGenerator: (attributes: Record<string, unknown>) => string;
    inlineStyleGenerator: (attributes: Record<string, unknown>) => Record<string, any>;
    Edit: FC<BlockEditProps>;
    extensionName: string;
    order?: 'before' | 'after';
}
declare function registerBlockExtension(blockName: string | string[], { attributes, classNameGenerator, inlineStyleGenerator, Edit, extensionName, order, }: BlockOptionOptions): void;
/**
 * Unregister a block extension that was previously registered using registerBlockExtension.
 *
 * @param {string|string[]} blockName - The name of the block or an array of block names to unregister the extension from.
 * @param {string} extensionName - The name of the extension to unregister.
 */
declare function unregisterBlockExtension(blockName: string | string[], extensionName: string): void;
export { registerBlockExtension, unregisterBlockExtension };
//# sourceMappingURL=index.d.ts.map