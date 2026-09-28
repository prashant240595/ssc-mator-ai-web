/** Spaced-repetition schedule helpers (shared by client + server). */

/** Scientific forgetting-curve intervals, in days. */
export const REVISION_INTERVALS = [1, 3, 7, 21, 30, 60] as const;

export type Difficulty = "easy" | "medium" | "hard";

/** Today's date (YYYY-MM-DD) in IST. */
export function istToday(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86400000,
  );
}

/**
 * Adaptive next-step calculation.
 * easy   → move to the next (longer) interval
 * medium → repeat the current interval
 * hard   → step back and revise again tomorrow
 */
export function nextSchedule(stage: number, difficulty: Difficulty) {
  let nextStage = stage;
  let days: number;

  if (difficulty === "easy") {
    nextStage = stage + 1;
    days = REVISION_INTERVALS[Math.min(nextStage, REVISION_INTERVALS.length - 1)]!;
  } else if (difficulty === "medium") {
    days = REVISION_INTERVALS[Math.min(stage, REVISION_INTERVALS.length - 1)]!;
  } else {
    nextStage = Math.max(0, stage - 1);
    days = 1;
  }

  const status = nextStage >= REVISION_INTERVALS.length ? "completed" : "active";
  return {
    stage: nextStage,
    days,
    status,
    nextDate: addDays(istToday(), days),
  };
}

/** Human label for the current progress of a topic. */
export function stageLabel(stage: number) {
  const total = REVISION_INTERVALS.length;
  return `Step ${Math.min(stage + 1, total)} of ${total}`;
}

/** Percent mastery for progress bars. */
export function masteryPercent(stage: number, status: string) {
  if (status === "completed") return 100;
  return Math.round((Math.min(stage, REVISION_INTERVALS.length) / REVISION_INTERVALS.length) * 100);
}
