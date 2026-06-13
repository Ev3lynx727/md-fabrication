import { Mode } from '../core/types.js';
declare const registry: Record<string, Mode>;
export declare function getMode(name: string): Mode;
export declare function listModes(): string[];
export { registry };
