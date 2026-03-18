import type { FC } from 'react';
interface PopoverComponentProps {
    children: React.ReactNode;
}
export declare const usePopover: () => {
    setPopoverAnchor: import("react").Dispatch<import("react").SetStateAction<undefined>>;
    toggleVisible: () => void;
    toggleProps: {
        onClick: () => void;
        'aria-expanded': boolean;
        ref: import("react").Dispatch<import("react").SetStateAction<undefined>>;
    };
    Popover: FC<PopoverComponentProps>;
};
export {};
//# sourceMappingURL=index.d.ts.map