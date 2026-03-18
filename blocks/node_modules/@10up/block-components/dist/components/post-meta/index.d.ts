import { RichText } from '@wordpress/block-editor';
import type { ToggleControlProps } from '@wordpress/components/src/toggle-control/types';
interface MetaStringProps extends Omit<React.ComponentPropsWithoutRef<typeof RichText>, 'value' | 'onChange' | 'multiline'> {
    /**
     * The meta key to use.
     */
    metaKey: string;
}
interface MetaNumberProps {
    /**
     * The meta key to use.
     */
    metaKey: string;
}
interface MetaBooleanProps extends Pick<ToggleControlProps, 'label'> {
    /**
     * The meta key to use.
     */
    metaKey: string;
}
interface PostMetaProps {
    /**
     * The meta key to use.
     */
    metaKey: string;
    /**
     * The children render prop.
     */
    children?: (metaValue: any, setMetaValue: (value: any) => void) => React.ReactNode | React.ReactNode;
    /**
     * Additional props to pass to the component.
     */
    [key: string]: unknown;
}
export declare const PostMeta: React.FC<PostMetaProps> & {
    String: React.FC<MetaStringProps>;
    Number: React.FC<MetaNumberProps>;
    Boolean: React.FC<MetaBooleanProps>;
};
export {};
//# sourceMappingURL=index.d.ts.map