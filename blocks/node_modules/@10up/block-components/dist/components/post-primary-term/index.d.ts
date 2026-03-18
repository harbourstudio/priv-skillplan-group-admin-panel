interface PostPrimaryTermProps {
    /**
     * The taxonomy name to get the primary term for.
     */
    taxonomyName?: string;
    /**
     * The placeholder to show when no term is set.
     */
    placeholder?: string;
    /**
     * Whether the term should be a link.
     */
    isLink?: boolean;
    /**
     * Remaining props to pass to the element.
     */
    [key: string]: unknown;
}
export declare const PostPrimaryTerm: ({ taxonomyName, placeholder, isLink, ...rest }: PostPrimaryTermProps) => import("react").JSX.Element | null;
export {};
//# sourceMappingURL=index.d.ts.map