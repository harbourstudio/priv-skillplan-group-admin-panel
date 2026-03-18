export interface ListItemProps extends Omit<HTMLElement, 'tagName' | 'children'> {
    /**
     * The HTML tag to use for the list item.
     */
    tagName?: keyof JSX.IntrinsicElements | React.ComponentType<any>;
    /**
     * The children to render inside the list item.
     */
    children: React.ReactNode;
}
export declare const ListItem: ({ tagName: TagName, children, ...rest }: ListItemProps) => import("react").JSX.Element;
export declare const TermLink: (props: Omit<HTMLAnchorElement, "href" | "inert">) => import("react").JSX.Element;
//# sourceMappingURL=item.d.ts.map