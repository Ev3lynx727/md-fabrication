export interface FrontmatterResult {
    metadata: Record<string, string> | null;
    content: string;
    raw: string;
}
export interface FabricationSummary {
    sentencesRestructured: number;
    transitionsAdded: number;
    contractionsApplied: number;
    passiveToActive: number;
    conjunctionSoftened: number;
    pacingAdjusted: number;
    vocabularyDiversified: number;
    hedgePhrasesInjected: number;
    conjunctionStartsAdded: number;
    sentenceOpeningsVaried: number;
}
export interface FabricationResult {
    file: string;
    fileName: string;
    voice: string;
    totalChanges: number;
    changesApplied: boolean;
    summary: FabricationSummary;
    tokensUsed: number;
    error?: string;
}
export interface SessionStats {
    sessionId: string;
    calls: number;
    totalTokens: number;
    filesProcessed: number;
    startTime: string;
}
export interface RunLog {
    timestamp: string;
    sessionId: string;
    file: string;
    voice: string;
    changes: number;
    changesApplied: boolean;
    tokensUsed: number;
    durationMs: number;
    mode: string;
}
export interface VoiceProfile {
    contractions: boolean;
    transitions: boolean;
    passiveToActive: boolean;
    conjunctionSoftening: boolean;
    pacing: boolean;
    repetitivePhrases: boolean;
    vocabularyDiversity: boolean;
    hedgePhrases: boolean;
    conjunctionStarts: boolean;
    sentenceVariety: boolean;
}
export interface VoiceConfig {
    default: string;
    profiles: Record<string, VoiceProfile>;
}
export interface LinkRef {
    text: string;
    url: string;
    type: 'internal' | 'external' | 'image';
    fileName: string | null;
}
export interface ImageRef {
    alt: string;
    url: string;
    type: 'local' | 'remote' | 'bucket';
    bucketName: string | null;
    exists: boolean | null;
}
export interface GraphNode {
    inbound: string[];
    outbound: string[];
    images: ImageRef[];
}
export interface Graph {
    nodes: Record<string, GraphNode>;
    edges: {
        source: string;
        target: string;
        type: string;
    }[];
}
export interface ImageMap {
    local: ImageRef[];
    remote: ImageRef[];
    bucket: ImageRef[];
    broken: ImageRef[];
}
export interface FragmentMetadata {
    title: string;
    author: string | null;
    tags: string[];
    depends_on: string[];
    order: number | null;
    status: string | null;
    source: string | null;
    date_iso: string | null;
    description: string | null;
}
export interface Fragment {
    file: string;
    fileName: string;
    metadata: FragmentMetadata;
    content: string;
    raw: string;
}
export interface GraphFileResult {
    file: string;
    fileName: string;
    links: LinkRef[];
    images: ImageRef[];
    metadata: Record<string, string> | null;
}
export interface LintEntry {
    file: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
}
export interface Mode {
    name: string;
    transforms: Transform[];
}
export interface Transform {
    type: 'regex' | 'llm' | 'structural';
    priority: number;
    apply(content: string): string;
}
