import { logger } from '../utils/logger.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { AnalyzedSignal } from '../utils/schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Pattern Matcher
 * Identifies high-value signal combinations that historically lead to conversions
 */

interface PatternCriteria {
  type: string;
  action?: string;
  page_includes?: string;
  minScore?: number;
  minVisits?: number;
  duration_max?: number;
  bounceRate_min?: number;
  daysInRole_min?: number;
  daysInRole_max?: number;
  painPoint?: boolean;
  newsType?: string;
  department?: string;
  bofu?: boolean;
  noComment?: boolean;
  clickedLink?: boolean;
  category?: string;
}

interface Pattern {
  id: string;
  name: string;
  description: string;
  requiredSignals: PatternCriteria[];
  optionalSignals?: PatternCriteria[];
  historicalConversion: number;
  avgDaysToClose: number | null;
  confidence: number;
  weight: number;
  isFalsePositive?: boolean;
}

interface MatchedPattern {
  pattern: string;
  name: string;
  signals: Array<{ type: string; score: number }>;
  historicalConversion: number;
  avgDaysToClose: number | null;
  reasoning: string;
  confidence: number;
  matchScore: number;
  weight: number;
  isFalsePositive: boolean;
}

// Known high-converting patterns (will be loaded from data/patterns/known-patterns.json)
let knownPatterns: Pattern[] = [];

/**
 * Load known patterns from configuration
 */
export function loadKnownPatterns(): void {
  try {
    const patternsPath = join(__dirname, '../../data/patterns/known-patterns.json');
    const patternsData = readFileSync(patternsPath, 'utf-8');
    knownPatterns = JSON.parse(patternsData) as Pattern[];
    logger.info(`Loaded ${knownPatterns.length} known patterns`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('Could not load known patterns, using defaults', { error: errorMessage });
    knownPatterns = getDefaultPatterns();
  }
}

/**
 * Default patterns (used if file doesn't exist)
 */
function getDefaultPatterns(): Pattern[] {
  return [
    {
      id: 'engaged_evaluator',
      name: 'Engaged Evaluator',
      description: 'Combination of public engagement + private research + educational content consumption',
      requiredSignals: [
        { type: 'linkedin_engagement', action: 'commented', minScore: 70 },
        { type: 'website_visit', page_includes: 'pricing', minVisits: 2 }
      ],
      optionalSignals: [
        { type: 'content_download', category: 'case_study' }
      ],
      historicalConversion: 73,
      avgDaysToClose: 14,
      confidence: 0.85,
      weight: 100
    },
    {
      id: 'new_role_evaluator',
      name: 'New Role Evaluator',
      description: 'New decision-maker + company growth + team expansion signals',
      requiredSignals: [
        { type: 'job_change', daysInRole_min: 15, daysInRole_max: 90 }
      ],
      optionalSignals: [
        { type: 'company_news', newsType: 'funding' },
        { type: 'hiring_signals', department: 'sales' },
        { type: 'website_visit', page_includes: 'pricing' }
      ],
      historicalConversion: 58,
      avgDaysToClose: 45,
      confidence: 0.75,
      weight: 85
    },
    {
      id: 'active_evaluator_with_budget',
      name: 'Active Evaluator with Budget',
      description: 'Public pain point + pricing research + technical validation + recent funding',
      requiredSignals: [
        { type: 'linkedin_engagement', painPoint: true },
        { type: 'website_visit', page_includes: 'pricing' }
      ],
      optionalSignals: [
        { type: 'content_download', bofu: true },
        { type: 'company_news', newsType: 'funding' }
      ],
      historicalConversion: 81,
      avgDaysToClose: 12,
      confidence: 0.9,
      weight: 120
    },
    {
      id: 'competitor_researcher',
      name: 'Competitor Researcher (False Positive)',
      description: 'Shallow engagement across channels, likely competitor or student',
      requiredSignals: [
        { type: 'website_visit', duration_max: 60, bounceRate_min: 0.8 }
      ],
      optionalSignals: [
        { type: 'linkedin_engagement', action: 'liked', noComment: true },
        { type: 'email_interaction', action: 'opened', clickedLink: false }
      ],
      historicalConversion: 4,
      avgDaysToClose: null,
      confidence: 0.78,
      weight: -50, // Negative weight - indicates false positive
      isFalsePositive: true
    },
    {
      id: 'ready_to_buy',
      name: 'Ready to Buy',
      description: 'Multiple bottom-of-funnel signals indicating imminent purchase',
      requiredSignals: [
        { type: 'website_visit', page_includes: 'pricing', minVisits: 3 },
        { type: 'content_download', bofu: true }
      ],
      optionalSignals: [
        { type: 'email_interaction', action: 'reply' },
        { type: 'website_visit', page_includes: 'demo' }
      ],
      historicalConversion: 87,
      avgDaysToClose: 7,
      confidence: 0.92,
      weight: 150
    }
  ];
}

/**
 * Check if a signal matches pattern criteria
 */
function signalMatchesCriteria(signal: AnalyzedSignal, criteria: PatternCriteria): boolean {
  // Type must match
  if (signal.type !== criteria.type) {
    return false;
  }

  const rawData = signal.rawData as Record<string, unknown>;
  const context = signal.qualitativeContext || {};

  // Check action if specified
  if (criteria.action && rawData.action !== criteria.action) {
    return false;
  }

  // Check page includes
  if (criteria.page_includes && (!rawData.page || !String(rawData.page).includes(criteria.page_includes))) {
    return false;
  }

  // Check minimum score
  if (criteria.minScore && signal.quantitativeScore < criteria.minScore) {
    return false;
  }

  // Check duration constraints
  if (criteria.duration_max && typeof rawData.duration === 'number' && rawData.duration > criteria.duration_max) {
    return false;
  }

  // Check bounce rate
  if (criteria.bounceRate_min && (typeof rawData.bounceRate !== 'number' || rawData.bounceRate < criteria.bounceRate_min)) {
    return false;
  }

  // Check days in role
  if (criteria.daysInRole_min && (typeof rawData.daysInRole !== 'number' || rawData.daysInRole < criteria.daysInRole_min)) {
    return false;
  }
  if (criteria.daysInRole_max && typeof rawData.daysInRole === 'number' && rawData.daysInRole > criteria.daysInRole_max) {
    return false;
  }

  // Check for pain point
  if (criteria.painPoint && (!context.painPoints || context.painPoints.length === 0)) {
    return false;
  }

  // Check news type
  if (criteria.newsType && rawData.newsType !== criteria.newsType) {
    return false;
  }

  // Check department
  if (criteria.department) {
    const metadata = rawData.metadata as Record<string, unknown> | undefined;
    if (metadata?.department !== criteria.department) {
      return false;
    }
  }

  // Check BOFU content
  if (criteria.bofu) {
    const asset = String(rawData.asset || '').toLowerCase();
    const isBofu = asset.includes('implementation') ||
                   asset.includes('enterprise') ||
                   asset.includes('security') ||
                   asset.includes('compliance');
    if (!isBofu) {
      return false;
    }
  }

  // Check no comment (for likes without comments)
  if (criteria.noComment && rawData.content) {
    return false;
  }

  // Check clicked link
  if (criteria.clickedLink === false && rawData.clickedLink === true) {
    return false;
  }

  return true;
}

/**
 * Count how many signals of a type match pattern criteria
 */
function countMatchingSignals(signals: AnalyzedSignal[], criteria: PatternCriteria): number {
  return signals.filter(signal => signalMatchesCriteria(signal, criteria)).length;
}

/**
 * Calculate pattern match score
 */
function calculatePatternMatch(pattern: Pattern, enrichedSignals: AnalyzedSignal[]): MatchedPattern | null {
  let matchScore = 0;
  const matchedSignals: AnalyzedSignal[] = [];
  const reasoning: string[] = [];

  // Check required signals
  let requiredMatched = 0;
  for (const criteria of pattern.requiredSignals) {
    const matchingSignals = enrichedSignals.filter(s => signalMatchesCriteria(s, criteria));

    if (criteria.minVisits) {
      const count = countMatchingSignals(enrichedSignals, criteria);
      if (count >= criteria.minVisits) {
        requiredMatched++;
        matchedSignals.push(...matchingSignals);
        reasoning.push(`Found ${count} ${criteria.type} signals matching criteria`);
      }
    } else if (matchingSignals.length > 0) {
      requiredMatched++;
      matchedSignals.push(...matchingSignals);
      reasoning.push(`Found ${criteria.type} signal matching criteria`);
    }
  }

  // Must match ALL required signals
  if (requiredMatched < pattern.requiredSignals.length) {
    return null; // Pattern doesn't match
  }

  matchScore = 50; // Base score for matching required signals

  // Check optional signals (bonus points)
  if (pattern.optionalSignals) {
    for (const criteria of pattern.optionalSignals) {
      const matchingSignals = enrichedSignals.filter(s => signalMatchesCriteria(s, criteria));
      if (matchingSignals.length > 0) {
        matchScore += 10;
        matchedSignals.push(...matchingSignals);
        reasoning.push(`Bonus: ${criteria.type} signal found`);
      }
    }
  }

  // Calculate confidence based on number of signals and pattern confidence
  const signalStrength = Math.min(1, matchedSignals.length / 4); // 4+ signals = max strength
  const confidence = pattern.confidence * signalStrength;

  return {
    pattern: pattern.id,
    name: pattern.name,
    signals: matchedSignals.map(s => ({
      type: s.type,
      score: s.quantitativeScore
    })),
    historicalConversion: pattern.historicalConversion,
    avgDaysToClose: pattern.avgDaysToClose,
    reasoning: `${pattern.description}. ${reasoning.join('. ')}.`,
    confidence: Math.round(confidence * 100) / 100,
    matchScore,
    weight: pattern.weight,
    isFalsePositive: pattern.isFalsePositive || false
  };
}

/**
 * Identify patterns in enriched signals
 */
export function identifyPatterns(enrichedSignals: AnalyzedSignal[]): MatchedPattern[] {
  logger.info('Identifying signal patterns');

  if (knownPatterns.length === 0) {
    loadKnownPatterns();
  }

  const matchedPatterns: MatchedPattern[] = [];

  for (const pattern of knownPatterns) {
    const match = calculatePatternMatch(pattern, enrichedSignals);
    if (match) {
      matchedPatterns.push(match);
      logger.debug(`Pattern matched: ${pattern.name}`, {
        confidence: match.confidence,
        conversion: match.historicalConversion
      });
    }
  }

  // Sort by confidence * conversion rate
  matchedPatterns.sort((a, b) => {
    const scoreA = a.confidence * a.historicalConversion;
    const scoreB = b.confidence * b.historicalConversion;
    return scoreB - scoreA;
  });

  logger.info(`Identified ${matchedPatterns.length} patterns`);

  return matchedPatterns;
}

/**
 * Get the primary pattern (highest confidence)
 */
export function getPrimaryPattern(patterns: MatchedPattern[]): MatchedPattern | null {
  if (patterns.length === 0) {
    return null;
  }

  return patterns[0];
}

/**
 * Check if signals indicate a false positive
 */
export function detectFalsePositive(patterns: MatchedPattern[]): { isFalsePositive: boolean; pattern?: MatchedPattern; confidence: number } {
  const falsePositivePatterns = patterns.filter(p => p.isFalsePositive);

  if (falsePositivePatterns.length > 0) {
    return {
      isFalsePositive: true,
      pattern: falsePositivePatterns[0],
      confidence: falsePositivePatterns[0].confidence
    };
  }

  return {
    isFalsePositive: false,
    confidence: 0
  };
}


