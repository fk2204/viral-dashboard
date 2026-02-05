import * as fs from 'fs';
import * as path from 'path';
import { ViralConcept, TrendData } from '@/types';

// ============================================================
// DAILY STORE — Server-side JSON storage for cron outputs
// ============================================================

export interface DailyOutput {
  id: string;
  date: string;                    // ISO date string
  generatedAt: string;             // ISO timestamp
  concepts: ViralConcept[];
  trends: TrendData[];
  stats: {
    totalConcepts: number;
    categoryCounts: Record<string, number>;
    topTrend: string;
    avgScore: number;
  };
}

const STORE_DIR = path.join(process.cwd(), '.daily-outputs');
const MAX_DAYS = 7;

/**
 * Ensure the store directory exists
 */
function ensureStoreDir(): void {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

/**
 * Get the file path for a specific date
 */
function getFilePath(date: string): string {
  // date format: YYYY-MM-DD
  return path.join(STORE_DIR, `${date}.json`);
}

/**
 * Save daily output
 */
export function saveDailyOutput(output: DailyOutput): void {
  ensureStoreDir();
  const dateKey = output.date.split('T')[0];
  const filePath = getFilePath(dateKey);
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf-8');

  // Cleanup old files
  cleanupOldOutputs();
}

/**
 * Get today's output
 */
export function getTodayOutput(): DailyOutput | null {
  const today = new Date().toISOString().split('T')[0];
  return getDailyOutput(today);
}

/**
 * Get output for a specific date
 */
export function getDailyOutput(date: string): DailyOutput | null {
  ensureStoreDir();
  const filePath = getFilePath(date);

  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as DailyOutput;
    }
  } catch {
    // File corrupt or missing
  }

  return null;
}

/**
 * Get outputs for the last N days
 */
export function getRecentOutputs(days: number = 7): DailyOutput[] {
  ensureStoreDir();
  const outputs: DailyOutput[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    const output = getDailyOutput(dateKey);
    if (output) {
      outputs.push(output);
    }
  }

  return outputs;
}

/**
 * Remove outputs older than MAX_DAYS
 */
function cleanupOldOutputs(): void {
  try {
    const files = fs.readdirSync(STORE_DIR);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_DAYS);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    files.forEach(file => {
      if (file.endsWith('.json')) {
        const dateStr = file.replace('.json', '');
        if (dateStr < cutoffStr) {
          fs.unlinkSync(path.join(STORE_DIR, file));
        }
      }
    });
  } catch {
    // Cleanup failure is non-critical
  }
}

/**
 * Check if today's output already exists
 */
export function hasTodayOutput(): boolean {
  const today = new Date().toISOString().split('T')[0];
  const filePath = getFilePath(today);
  return fs.existsSync(filePath);
}
