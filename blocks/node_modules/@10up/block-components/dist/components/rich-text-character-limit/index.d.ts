import type { FC } from 'react';
import { RichText } from '@wordpress/block-editor';
declare const getCharacterCount: (str: string) => number;
interface RichTextCharacterLimitProps extends Omit<React.ComponentProps<typeof RichText>, 'value' | 'onChange'> {
    limit?: number;
    enforce?: boolean;
    value: string;
    onChange: (value: string) => void;
}
declare const RichTextCharacterLimit: FC<RichTextCharacterLimitProps>;
export { RichTextCharacterLimit, getCharacterCount };
//# sourceMappingURL=index.d.ts.map