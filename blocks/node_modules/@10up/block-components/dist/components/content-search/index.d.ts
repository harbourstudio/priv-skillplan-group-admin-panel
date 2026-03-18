import type { ContentSearchMode, IdentifiableObject, QueryFilter, QueryFieldsFilter, RenderItemComponentProps, SearchResultFilter } from './types';
import { NormalizedSuggestion } from './utils';
export type ContentSearchOptions = {
    inputDelay: number;
};
export interface ContentSearchProps {
    onSelectItem: (item: NormalizedSuggestion) => void;
    placeholder?: string;
    label?: string;
    hideLabelFromVision?: boolean;
    contentTypes?: Array<string>;
    mode?: ContentSearchMode;
    perPage?: number;
    queryFilter?: QueryFilter;
    queryFieldsFilter?: QueryFieldsFilter;
    searchResultFilter?: SearchResultFilter;
    excludeItems?: Array<IdentifiableObject>;
    renderItemType?: (props: NormalizedSuggestion) => string;
    renderItem?: (props: RenderItemComponentProps) => JSX.Element;
    fetchInitialResults?: boolean;
    options?: ContentSearchOptions;
}
declare const ContentSearchWrapper: React.FC<ContentSearchProps>;
export { ContentSearchWrapper as ContentSearch };
//# sourceMappingURL=index.d.ts.map