import { DepGraph } from 'dependency-graph';
import { Fragment, FragmentMetadata } from './types.js';
export declare function parseFragment(content: string): {
    metadata: FragmentMetadata | null;
    content: string;
    raw: string;
};
export declare function gatherFragments(dir: string): Fragment[];
export declare function buildDepGraph(fragments: Fragment[]): DepGraph<Fragment>;
export declare function computeDagLevels(graph: DepGraph<Fragment>): Map<string, number>;
export declare function splitTrilogy(fragments: Fragment[], order: string[], graph: DepGraph<Fragment>): Fragment[][];
export declare function generateToc(content: string): string[];
export declare function collectReferences(fragments: Fragment[]): string[];
export declare function extractTags(body: string, existingTags: string[]): string[];
export declare function extractDescription(content: string): string;
export declare function generateAssembledFrontmatter(fragments: Fragment[], assembledBody: string): string;
export declare function assembleFragments(fragments: Fragment[], order: string[]): {
    content: string;
    actualOrder: string[];
};
export declare function enhanceTrilogy(parts: Fragment[][], labels: string[], filenames: string[], contents: string[]): string[];
export declare function assembleTrilogy(fragments: Fragment[], order: string[], graph: DepGraph<Fragment>, targetDir: string, hasExplicitVoice: boolean, profile: any, jsonOnly: boolean, dryRun: boolean, enhanceMode: boolean): boolean;
