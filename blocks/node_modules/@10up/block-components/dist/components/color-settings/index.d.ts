interface ColorSettingProps {
    /**
     * If this property is added, a label will be generated using label property as the content.
     */
    label?: string;
    /**
     * If true, the label will only be visible to screen readers.
     */
    hideLabelFromVision?: boolean;
    /**
     * If this property is added, a help text will be generated using help property as the content.
     */
    help?: string;
    /**
     * If no className is passed only components-base-control is used.
     */
    className?: string;
    /**
     * Whether to allow custom color or not.
     */
    disableCustomColors?: boolean;
    /**
     * currently active value.
     */
    value?: string;
    /**
     * Whether the palette should have a clearing button or not.
     */
    clearable?: boolean;
    /**
     * Array with the colors to be shown.
     */
    colors: Array<Color>;
    /**
     * Callback called when a color is selected.
     */
    onChange: (newColor?: string | undefined, index?: number | undefined) => void;
}
interface Color {
    /**
     * Color name.
     */
    name: string;
    /**
     * Color hex code.
     */
    color: string;
}
export declare const ColorSetting: React.FC<ColorSettingProps>;
export {};
//# sourceMappingURL=index.d.ts.map