import { ForwardRefExoticComponent, PropsWithoutRef, RefAttributes, FC } from 'react';
interface CircularProgressBarProps {
    /**
     * Percentage elapsed.
     */
    percentage: number;
}
declare const CircularProgressBar: FC<CircularProgressBarProps>;
interface CounterProps {
    /**
     * Current count.
     */
    count: number;
    /**
     * Max limit.
     */
    limit: number;
    /**
     * Rest of the props.
     */
    [key: string]: unknown;
}
declare const Counter: ForwardRefExoticComponent<PropsWithoutRef<CounterProps> & RefAttributes<HTMLDivElement>>;
export { CircularProgressBar, Counter };
//# sourceMappingURL=index.d.ts.map