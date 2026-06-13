import { SessionStats, RunLog } from './types.js';
export declare function loadSession(): SessionStats;
export declare function saveSession(session: SessionStats): void;
export declare function getTokenBudgetReport(session: SessionStats, budget: number): object;
export declare function writeRunLog(log: RunLog): void;
