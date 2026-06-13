import { VoiceProfile, FabricationSummary } from '../core/types.js';
export declare function fabricateText(content: string, profile: VoiceProfile): {
    transformed: string;
    summary: FabricationSummary;
};
