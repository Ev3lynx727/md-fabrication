import { VoiceConfig } from './types.js';
export declare function loadVoiceConfig(): VoiceConfig;
export declare function getValidVoices(): string[];
export declare function getTimezone(): string | null;
export declare function getTomlConfig(tomlPath: string): Record<string, any>;
