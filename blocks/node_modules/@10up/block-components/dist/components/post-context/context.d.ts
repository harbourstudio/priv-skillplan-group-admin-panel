interface PostContextProps {
    /**
     * The ID of the post.
     */
    postId?: number;
    /**
     * The type of the post.
     */
    postType?: string;
    /**
     * Whether the post is editable.
     */
    isEditable?: boolean;
}
export declare const DEFAULT_POST_CONTEXT: {
    postId: undefined;
    postType: undefined;
    isEditable: undefined;
};
export declare const PostContext: import("react").Context<PostContextProps>;
export declare const usePostContext: () => PostContextProps;
export {};
//# sourceMappingURL=context.d.ts.map