interface PostContextProps {
    /**
     * The ID of the post.
     */
    postId: number;
    /**
     * The type of the post.
     */
    postType: string;
    /**
     * Whether the post is editable.
     */
    isEditable?: boolean;
    /**
     * The children to render.
     */
    children: React.ReactNode;
}
export declare const PostContext: ({ children, postId, postType, isEditable, }: PostContextProps) => import("react").JSX.Element;
export {};
//# sourceMappingURL=index.d.ts.map