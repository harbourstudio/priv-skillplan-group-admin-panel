import { BaseControl } from '@wordpress/components';
export type IconPickerProps = Omit<React.ComponentProps<typeof BaseControl>, 'children'> & {
    /**
     * Value of the selected icon
     */
    value: {
        name: string;
        iconSet: string;
    };
    /**
     * Change handler for when a new icon is selected
     */
    onChange: (icon: {
        name: string;
        iconSet: string;
    }) => void;
    /**
     * Optionally specify the icon set to use
     * If not specified, all icon sets will be used
     */
    iconSet?: string;
};
export declare const IconPicker: React.FC<IconPickerProps>;
//# sourceMappingURL=icon-picker.d.ts.map