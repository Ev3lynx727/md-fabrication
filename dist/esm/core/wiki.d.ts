export declare function editDocs(dir: string): {
    changed: number;
    errors: string[];
};
export declare function updateIndex(dir: string): string | null;
export declare function updateLog(dir: string, action: string, description: string): string;
export declare function linkUp(dir: string): {
    linksRewired: number;
    headingsDeduped: number;
    filesChanged: number;
    depsAutoWired: number;
};
export declare function ingest(rawFile: string, targetDir: string): {
    fragment: string;
    index: string;
    log: string;
} | null;
