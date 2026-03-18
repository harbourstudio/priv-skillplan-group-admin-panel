import { FC } from 'react';
interface ImageProps {
    id: number;
    size?: string;
    onSelect: (media: any) => void;
    focalPoint?: {
        x: number;
        y: number;
    };
    onChangeFocalPoint?: (focalPoint: {
        x: number;
        y: number;
    }) => void;
    labels?: {
        [key: string]: string;
    };
    canEditImage?: boolean;
    allowedTypes?: string[];
    [key: string]: any;
}
export declare const Image: FC<ImageProps>;
export {};
//# sourceMappingURL=index.d.ts.map