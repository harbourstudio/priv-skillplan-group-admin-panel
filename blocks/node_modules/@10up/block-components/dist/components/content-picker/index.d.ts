import { Post, User } from '@wordpress/core-data';
import { ContentSearchMode, QueryFilter, QueryFieldsFilter, RenderItemComponentProps, SearchResultFilter } from '../content-search/types';
import { NormalizedSuggestion } from '../content-search/utils';
import { PickedItemType } from './PickedItem';
import { Term } from './types';
export type PickedItemFilter = (item: Partial<PickedItemType>, originalResult: Post | Term | User) => Partial<PickedItemType>;
export type ContentPickerOptions = {
    inputDelay: number;
};
export interface ContentPickerProps {
    label?: string;
    hideLabelFromVision?: boolean;
    mode?: ContentSearchMode;
    contentTypes?: string[];
    placeholder?: string;
    onPickChange?: (ids: any[]) => void;
    queryFilter?: QueryFilter;
    queryFieldsFilter?: QueryFieldsFilter;
    searchResultFilter?: SearchResultFilter;
    pickedItemFilter?: PickedItemFilter;
    maxContentItems?: number;
    isOrderable?: boolean;
    singlePickedLabel?: string;
    multiPickedLabel?: string;
    content?: any[];
    uniqueContentItems?: boolean;
    excludeCurrentPost?: boolean;
    perPage?: number;
    fetchInitialResults?: boolean;
    renderItemType?: (props: NormalizedSuggestion) => string;
    renderItem?: (props: RenderItemComponentProps) => JSX.Element;
    PickedItemPreviewComponent?: React.ComponentType<{
        item: PickedItemType;
    }>;
    options?: ContentPickerOptions;
}
export declare const ContentPicker: React.FC<ContentPickerProps>;
//# sourceMappingURL=index.d.ts.map