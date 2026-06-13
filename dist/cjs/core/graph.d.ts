import { LinkRef, ImageRef, GraphFileResult, Graph, ImageMap } from './types.js';
export declare function extractLinks(content: string): LinkRef[];
export declare function extractImages(content: string): ImageRef[];
export declare function scanMarkdownFiles(dir: string): {
    files: string[];
    errors: string[];
};
export declare function analyzeGraphFile(filePath: string): GraphFileResult;
export declare function buildGraph(results: GraphFileResult[]): Graph;
export declare function findOrphans(graph: Graph): string[];
export declare function findBacklinks(results: GraphFileResult[], targetFileName: string): GraphFileResult[];
export declare function buildImageMap(results: GraphFileResult[]): ImageMap;
