import { FC } from 'react';
interface NewLinkProps {
    url?: string;
    opensInNewTab?: boolean;
    title?: string;
}
interface LinkProps {
    value?: string;
    type?: string;
    opensInNewTab?: boolean;
    url?: string;
    onLinkChange: (value: NewLinkProps) => void;
    onTextChange: (text: string) => void;
    onLinkRemove?: () => void;
    kind?: string;
    placeholder?: string;
    className?: string;
    ariaLabel?: string;
}
export declare const Link: FC<LinkProps>;
export {};
//# sourceMappingURL=index.d.ts.map