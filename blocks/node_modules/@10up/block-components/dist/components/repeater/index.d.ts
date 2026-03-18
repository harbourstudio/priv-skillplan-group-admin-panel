export function AbstractRepeater({ children, addButton, allowReordering, onChange, value, defaultValue, }: {
    children: Function;
    addButton: Function | null;
    allowReordering: boolean;
    onChange: Function;
    value: Array<IndexedItem>;
    defaultValue: Array<IndexedItem>;
}): any;
export function AttributeRepeater({ children, attribute, addButton, allowReordering, }: {
    children: Function;
    addButton: Function | null;
    allowReordering: boolean;
    attribute: string | null;
}): any;
export function Repeater({ children, addButton, allowReordering, onChange, value, defaultValue, attribute, }: {
    children: Function;
    addButton: Function | null;
    allowReordering: boolean;
    onChange: Function;
    value: Array<IndexedItem>;
    defaultValue: Array<IndexedItem>;
    attribute: string | null;
}): any;
export type IndexedItem = {
    /**
     * Identifier of the item
     */
    id: string;
};
//# sourceMappingURL=index.d.ts.map