import * as fs from 'fs'
import * as path from 'path'
import { SessionStats, RunLog } from './types.js'
import { PROJECT_ROOT } from './resolve-root.js'

const SESSION_FILE = '/tmp/md-fabrication-session.json'
const LOG_DIR = path.join(PROJECT_ROOT, 'log')

export function loadSession(): SessionStats {
  try { return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8')) }
  catch { return { sessionId: `session-${Date.now()}`, calls: 0, totalTokens: 0, filesProcessed: 0, startTime: new Date().toISOString() } }
}

export function saveSession(session: SessionStats): void {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2))
}

export function getTokenBudgetReport(session: SessionStats, budget: number): object {
  const remaining = budget - session.totalTokens
  const percentUsed = Math.round((session.totalTokens / budget) * 100)
  return { sessionId: session.sessionId, totalCalls: session.calls, totalTokens: session.totalTokens, budget, remaining,
    percentUsed: percentUsed + '%', status: percentUsed >= 100 ? 'EXCEEDED' : percentUsed >= 80 ? 'WARNING' : 'OK' }
}

export function writeRunLog(log: RunLog): void {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
    const logFile = path.join(LOG_DIR, `${log.sessionId}.json`)
    const existing: RunLog[] = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf-8')) : []
    existing.push(log)
    fs.writeFileSync(logFile, JSON.stringify(existing, null, 2))
  } catch {}
}
