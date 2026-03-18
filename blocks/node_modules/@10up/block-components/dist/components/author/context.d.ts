export type Author = {
    avatar_urls: Record<string, string>;
    description: string;
    email: string;
    first_name: string;
    id: number;
    last_name: string;
    link: string;
    name: string;
    nickname: string;
    registered_date: string;
    slug: string;
    url: string;
};
export declare const AuthorContext: import("react").Context<Author>;
export declare const useAuthor: () => Author;
//# sourceMappingURL=context.d.ts.map