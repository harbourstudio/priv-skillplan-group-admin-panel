/**
 * Internal dependencies
 */
import { PickedItemType } from './PickedItem';
import { ContentSearchMode, QueryFieldsFilter } from '../content-search/types';
import type { PickedItemFilter } from './index';
interface SortableListProps {
    posts: Array<PickedItemType>;
    isOrderable: boolean;
    handleItemDelete: (post: PickedItemType) => void;
    mode: ContentSearchMode;
    setPosts: (posts: Array<PickedItemType>) => void;
    PickedItemPreviewComponent?: React.ComponentType<{
        item: PickedItemType;
    }>;
    queryFieldsFilter?: QueryFieldsFilter;
    pickedItemFilter?: PickedItemFilter;
}
declare const SortableList: React.FC<SortableListProps>;
export default SortableList;
//# sourceMappingURL=SortableList.d.ts.map