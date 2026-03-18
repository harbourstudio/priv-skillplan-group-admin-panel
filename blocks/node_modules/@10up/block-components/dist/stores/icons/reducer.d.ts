import { IconSetAction } from './actions';
import { IconSet } from './types';
export default function reducer(state: {
    iconSets: {
        [key: string]: IconSet;
    };
} | undefined, action: IconSetAction): {
    iconSets: {
        [key: string]: IconSet;
    };
};
//# sourceMappingURL=reducer.d.ts.map