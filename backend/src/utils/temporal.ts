import { differenceInDays, differenceInHours, parseISO } from 'date-fns';

export type Velocity = 'increasing' | 'stable' | 'decreasing';
export type Urgency = 'low' | 'medium' | 'high';

export interface TimeContext {
  timeframe: string;
  hoursAgo: number;
  daysAgo: number;
  isRecent: boolean;
  isVeryRecent: boolean;
}

/**
 * Calculate recency score (0-1) based on how recent the signal is
 * More recent signals get higher scores
 * Uses exponential decay with half-life: score = 0.5^(days/halfLife)
 * This ensures score = 0.5 when daysAgo = halfLifeDays
 */
export function calculateRecencyScore(timestamp: string | undefined, halfLifeDays: number = 7): number {
  if (!timestamp) {
    // No timestamp provided, return neutral score
    return 0.5;
  }

  const signalDate = parseISO(timestamp);
  const now = new Date();
  const daysAgo = differenceInDays(now, signalDate);

  if (daysAgo < 0) {
    // Future date, treat as today
    return 1.0;
  }

  // Exponential decay with half-life: score = 0.5^(days/halfLife)
  // This ensures score = 0.5 when daysAgo = halfLifeDays
  // For halfLife = 7: at 7 days, score = 0.5^1 = 0.5
  const recencyScore = Math.pow(0.5, daysAgo / halfLifeDays);

  return Math.max(0, Math.min(1, recencyScore));
}

/**
 * Determine velocity trend based on signal timestamps
 */
export function calculateVelocity(timestamps: string[]): Velocity {
  if (timestamps.length < 2) {
    return 'stable';
  }

  // Sort timestamps chronologically
  const sorted = timestamps.map(t => parseISO(t)).sort((a, b) => a.getTime() - b.getTime());

  // Calculate intervals between consecutive signals
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const interval = differenceInHours(sorted[i], sorted[i - 1]);
    intervals.push(interval);
  }

  // Compare first half to second half of intervals
  const midpoint = Math.floor(intervals.length / 2);
  const firstHalfAvg = intervals.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
  const secondHalfAvg = intervals.slice(midpoint).reduce((a, b) => a + b, 0) / (intervals.length - midpoint);

  // If second half has shorter intervals (more frequent), velocity is increasing
  if (secondHalfAvg < firstHalfAvg * 0.7) {
    return 'increasing';
  } else if (secondHalfAvg > firstHalfAvg * 1.3) {
    return 'decreasing';
  } else {
    return 'stable';
  }
}

/**
 * Calculate frequency of signals within a time window
 */
export function calculateFrequency(timestamps: string[], windowDays: number = 30): number {
  const now = new Date();
  const cutoff = new Date(now.getTime() - (windowDays * 24 * 60 * 60 * 1000));

  return timestamps.filter(ts => {
    const date = parseISO(ts);
    return date >= cutoff;
  }).length;
}

/**
 * Get time-based context for a signal
 */
export function getTimeContext(timestamp: string | undefined): TimeContext {
  if (!timestamp) {
    return {
      timeframe: 'unknown',
      hoursAgo: 0,
      daysAgo: 0,
      isRecent: false,
      isVeryRecent: false
    };
  }

  const signalDate = parseISO(timestamp);
  const now = new Date();
  const hoursAgo = differenceInHours(now, signalDate);
  const daysAgo = differenceInDays(now, signalDate);

  let timeframe: string;
  if (hoursAgo < 1) {
    timeframe = 'within the hour';
  } else if (hoursAgo < 24) {
    timeframe = `${hoursAgo} hours ago`;
  } else if (daysAgo === 1) {
    timeframe = 'yesterday';
  } else if (daysAgo < 7) {
    timeframe = `${daysAgo} days ago`;
  } else if (daysAgo < 30) {
    const weeks = Math.floor(daysAgo / 7);
    timeframe = `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    const months = Math.floor(daysAgo / 30);
    timeframe = `${months} month${months > 1 ? 's' : ''} ago`;
  }

  return {
    timeframe,
    hoursAgo,
    daysAgo,
    isRecent: daysAgo < 7,
    isVeryRecent: hoursAgo < 48
  };
}

/**
 * Determine urgency level based on signal timing and content
 */
export function determineUrgency(signal: { timestamp?: string }): Urgency {
  const { daysAgo } = getTimeContext(signal.timestamp);

  // Very recent signals are more urgent
  if (daysAgo < 2) {
    return 'high';
  } else if (daysAgo < 7) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Calculate days in role for job change signals
 */
export function calculateDaysInRole(startDate: string | undefined): number {
  if (!startDate) {
    return 0;
  }
  const start = parseISO(startDate);
  const now = new Date();
  return differenceInDays(now, start);
}


