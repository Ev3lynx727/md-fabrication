"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSession = loadSession;
exports.saveSession = saveSession;
exports.getTokenBudgetReport = getTokenBudgetReport;
exports.writeRunLog = writeRunLog;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const resolve_root_js_1 = require("./resolve-root.js");
const SESSION_FILE = '/tmp/md-fabrication-session.json';
const LOG_DIR = path.join(resolve_root_js_1.PROJECT_ROOT, 'log');
function loadSession() {
    try {
        return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    }
    catch {
        return { sessionId: `session-${Date.now()}`, calls: 0, totalTokens: 0, filesProcessed: 0, startTime: new Date().toISOString() };
    }
}
function saveSession(session) {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
}
function getTokenBudgetReport(session, budget) {
    const remaining = budget - session.totalTokens;
    const percentUsed = Math.round((session.totalTokens / budget) * 100);
    return { sessionId: session.sessionId, totalCalls: session.calls, totalTokens: session.totalTokens, budget, remaining,
        percentUsed: percentUsed + '%', status: percentUsed >= 100 ? 'EXCEEDED' : percentUsed >= 80 ? 'WARNING' : 'OK' };
}
function writeRunLog(log) {
    try {
        if (!fs.existsSync(LOG_DIR))
            fs.mkdirSync(LOG_DIR, { recursive: true });
        const logFile = path.join(LOG_DIR, `${log.sessionId}.json`);
        const existing = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf-8')) : [];
        existing.push(log);
        fs.writeFileSync(logFile, JSON.stringify(existing, null, 2));
    }
    catch { }
}
//# sourceMappingURL=session.js.map