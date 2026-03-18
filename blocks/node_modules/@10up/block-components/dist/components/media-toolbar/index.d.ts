import type { Attachment } from '@wordpress/core-data';
interface MediaToolbarProps {
    /**
     * Callback to handle the selection of a media.
     */
    onSelect: (media: Attachment) => void;
    /**
     * Callback to handle the removal of a media.
     */
    onRemove: (event: React.MouseEvent<HTMLButtonElement>) => void;
    /**
     * Whether or not the Remove Image button should be shown.
     */
    isOptional?: boolean;
    /**
     * The ID of the media, in this case the image.
     */
    id: number;
    /**
     * Labels for the buttons.
     */
    labels?: {
        replace?: string;
        remove?: string;
        add?: string;
    };
}
export declare const MediaToolbar: React.FC<MediaToolbarProps>;
export {};
//# sourceMappingURL=index.d.ts.map