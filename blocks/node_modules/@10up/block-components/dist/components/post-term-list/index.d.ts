import { WP_REST_API_Term } from 'wp-types';
interface PostTermListProps {
    /**
     * The HTML tag to use for the list element.
     */
    tagName?: keyof JSX.IntrinsicElements;
    /**
     * The taxonomy name to fetch terms from.
     */
    taxonomyName?: string;
    /**
     * The message to display when no terms are selected.
     */
    noResultsMessage?: string;
    /**
     * The children to render for each term.
     */
    children?: React.ReactNode | ((props: {
        selectedTerms: Array<WP_REST_API_Term> | null | undefined;
        isEditable: boolean;
    }) => React.ReactNode);
}
export declare const PostTermList: {
    ({ tagName: TagName, taxonomyName, children, noResultsMessage, ...rest }: PostTermListProps): string | number | boolean | import("react").JSX.Element | Iterable<import("react").ReactNode> | null | undefined;
    ListItem: ({ tagName: TagName, children, ...rest }: import("./item").ListItemProps) => import("react").JSX.Element;
    TermLink: (props: Omit<HTMLAnchorElement, "href" | "inert">) => import("react").JSX.Element;
};
export {};
//# sourceMappingURL=index.d.ts.map