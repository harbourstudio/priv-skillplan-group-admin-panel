import { IconPickerProps } from './icon-picker';
interface InlineIconPickerProps extends IconPickerProps {
    /**
     * Render function for the toggle button
     * @param props
     */
    renderToggle: (props: {
        onToggle: () => void;
    }) => React.JSX.Element;
    /**
     * Optionally specify the icon set to use
     * If not specified, all icon sets will be used
     */
    iconSet?: string;
}
export declare const IconPickerDropdown: React.FC<InlineIconPickerProps>;
export declare const InlineIconPicker: React.FC<IconPickerProps>;
export {};
//# sourceMappingURL=inline-icon-picker.d.ts.map