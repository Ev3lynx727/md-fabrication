import { LintEntry } from './types.js';
export declare function lintDirectory(dir: string): {
    entries: LintEntry[];
    errors: number;
    warnings: number;
    infos: number;
};
