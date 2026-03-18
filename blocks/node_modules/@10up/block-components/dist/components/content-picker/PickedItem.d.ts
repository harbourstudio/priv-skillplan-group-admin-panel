import { ContentSearchMode } from '../content-search/types';
export type PickedItemType = {
    id: number;
    type: string;
    uuid: string;
    title: string;
    url?: string;
    status?: string;
    info?: string;
};
interface PickedItemProps {
    item: PickedItemType;
    isOrderable?: boolean;
    handleItemDelete: (deletedItem: PickedItemType) => void;
    mode: ContentSearchMode;
    id: number | string;
    isDragging?: boolean;
    positionInSet?: number;
    setSize?: number;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    PickedItemPreviewComponent?: React.ComponentType<{
        item: PickedItemType;
    }>;
    isDeleted?: boolean;
}
/**
 * Component to render a preview of a picked item.
 *
 * @component
 * @param {object} props - The component props.
 * @param {PickedItemType} props.item - The picked item to display.
 * @param {boolean} props.isDeleted - Whether the item has been deleted.
 * @returns {*} React JSX
 */
export declare const PickedItemPreview: React.FC<{
    item: PickedItemType;
    isDeleted?: boolean;
}>;
/**
 * PickedItem
 *
 * @param {PickedItemProps} props react props
 * @returns {*} React JSX
 */
declare const PickedItem: React.FC<PickedItemProps>;
export default PickedItem;
//# sourceMappingURL=PickedItem.d.ts.map