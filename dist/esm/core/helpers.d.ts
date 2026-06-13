export declare const COMMON_STOP: Set<string>;
export declare const SKIP_DIRS: Set<string>;
export declare function isInCodeBlock(lines: string[], index: number): boolean;
export declare function getPositionalArg(start: number): string;
export declare function getPositionalArgs(start: number): string[];
export declare function getFlagArg(flag: string): string | null;
export declare function extractFirstHeading(content: string): string | null;
export declare function anchorName(name: string): string;
export declare function countTokens(text: string): number;
