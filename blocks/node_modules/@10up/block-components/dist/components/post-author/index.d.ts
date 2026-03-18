import { Name, FirstName, LastName, Avatar, Bio, Email } from '../author';
import type { Author } from '../author/context';
interface PostAuthorProps {
    children?: React.ReactNode | ((author: Author) => React.ReactNode);
    [key: string]: unknown;
}
export declare const PostAuthor: React.FC<PostAuthorProps> & {
    Name: typeof Name;
    FirstName: typeof FirstName;
    LastName: typeof LastName;
    Avatar: typeof Avatar;
    Bio: typeof Bio;
    Email: typeof Email;
};
export {};
//# sourceMappingURL=index.d.ts.map