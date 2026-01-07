import { logger } from '../utils/logger.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { AnalyzedSignal, Prospect } from '../utils/schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface WeightsConfig {
  signalTypeWeights: Record<string, { baseWeight: number }>;
  contextMultipliers: {
    urgency: { high: number; medium: number; low: number };
    specificity: { high: number; medium: number; low: number };
    buyingStage: { decision: number; consideration: number; awareness: number; unknown: number };
    falsePositiveRisk: { low: number; medium: number; high: number };
  };
  temporalMultipliers: {
    velocity: { increasing: number; stable: number; decreasing: number };
  };
  scoringWeights: {
    individualSignals: number;
    patternMatching: number;
    prospectFit: number;
  };
  prospectFitMultipliers?: {
    companySize?: Record<string, number>;
    industry?: Record<string, number>;
  };
}

interface SignalScoreData {
  signal: string;
  baseScore: number;
  contextBoost: number;
  finalScore: number;
  weight: number;
  multipliers: {
    urgency: number;
    specificity: number;
    buyingStage: number;
    falsePositiveRisk: number;
    recency: number;
    velocity: number;
  };
}

interface PatternScoreResult {
  score: number;
  confidence: number;
}

export interface QualityScoreResult {
  qualityScore: number;
  confidence: 'low' | 'medium' | 'high';
  priorityLevel: 'ignore' | 'low' | 'medium' | 'high' | 'urgent';
  breakdown: Array<{
    signal: string;
    weight: number;
    score: number;
    reasoning: string;
    extractedContext: {
      painPoints: string[];
      urgency?: string;
      specificity?: string;
      buyingStage?: string;
    };
  }>;
  patterns: unknown[];
  reasoning: string;
  components: {
    signalScore: number;
    patternScore: number;
    fitScore: number;
  };
  weights: {
    signals: number;
    patterns: number;
    fit: number;
  };
}

interface MatchedPattern {
  name: string;
  historicalConversion: number;
  isFalsePositive?: boolean;
}

// Load signal weights configuration
let weightsConfig: WeightsConfig | null = null;

function loadWeights(): WeightsConfig {
  if (weightsConfig) return weightsConfig;

  try {
    const weightsPath = join(__dirname, '../../data/weights/signal-weights.json');
    const weightsData = readFileSync(weightsPath, 'utf-8');
    weightsConfig = JSON.parse(weightsData) as WeightsConfig;
    logger.info('Loaded signal weights configuration');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('Could not load weights config, using defaults', { error: errorMessage });
    weightsConfig = getDefaultWeights();
  }

  return weightsConfig;
}

function getDefaultWeights(): WeightsConfig {
  return {
    signalTypeWeights: {
      linkedin_engagement: { baseWeight: 0.25 },
      website_visit: { baseWeight: 0.22 },
      content_download: { baseWeight: 0.18 },
      email_interaction: { baseWeight: 0.15 },
      job_change: { baseWeight: 0.1 },
      company_news: { baseWeight: 0.08 },
      hiring_signals: { baseWeight: 0.07 },
      tech_stack_change: { baseWeight: 0.12 },
      intent_data: { baseWeight: 0.1 }
    },
    contextMultipliers: {
      urgency: { high: 1.3, medium: 1.0, low: 0.7 },
      specificity: { high: 1.25, medium: 1.0, low: 0.8 },
      buyingStage: { decision: 1.4, consideration: 1.15, awareness: 0.9, unknown: 0.85 },
      falsePositiveRisk: { low: 1.2, medium: 1.0, high: 0.6 }
    },
    temporalMultipliers: {
      velocity: { increasing: 1.2, stable: 1.0, decreasing: 0.8 }
    },
    scoringWeights: {
      individualSignals: 0.4,
      patternMatching: 0.4,
      prospectFit: 0.2
    }
  };
}

/**
 * Calculate weighted score for an individual signal
 */
function calculateSignalWeight(signal: AnalyzedSignal, weights: WeightsConfig): SignalScoreData {
  const { type, quantitativeScore, qualitativeContext, temporalFactors } = signal;

  // Base weight for signal type
  const baseWeight = weights.signalTypeWeights[type]?.baseWeight || 0.1;

  // Context multipliers
  const urgencyMultiplier = qualitativeContext.urgency
    ? weights.contextMultipliers.urgency[qualitativeContext.urgency]
    : 1.0;

  const specificityMultiplier = qualitativeContext.specificity
    ? weights.contextMultipliers.specificity[qualitativeContext.specificity]
    : 1.0;

  const buyingStageMultiplier = qualitativeContext.buyingStage
    ? weights.contextMultipliers.buyingStage[qualitativeContext.buyingStage]
    : 1.0;

  const falsePositiveMultiplier = qualitativeContext.falsePositiveRisk
    ? weights.contextMultipliers.falsePositiveRisk[qualitativeContext.falsePositiveRisk]
    : 1.0;

  // Temporal multipliers
  const recencyMultiplier = 1 + (temporalFactors.recency - 0.5) * 0.4; // Range: 0.8 to 1.2

  const velocityMultiplier = temporalFactors.velocity
    ? weights.temporalMultipliers.velocity[temporalFactors.velocity]
    : 1.0;

  // Calculate final weighted score
  const contextualScore = quantitativeScore *
    urgencyMultiplier *
    specificityMultiplier *
    buyingStageMultiplier *
    falsePositiveMultiplier *
    recencyMultiplier *
    velocityMultiplier;

  const weight = baseWeight * 100; // Convert to percentage

  return {
    signal: type,
    baseScore: quantitativeScore,
    contextBoost: (contextualScore - quantitativeScore),
    finalScore: Math.round(contextualScore),
    weight: Math.round(weight),
    multipliers: {
      urgency: urgencyMultiplier,
      specificity: specificityMultiplier,
      buyingStage: buyingStageMultiplier,
      falsePositiveRisk: falsePositiveMultiplier,
      recency: recencyMultiplier,
      velocity: velocityMultiplier
    }
  };
}

/**
 * Calculate average signal score
 */
function calculateSignalScores(enrichedSignals: AnalyzedSignal[], weights: WeightsConfig): { scores: SignalScoreData[]; averageScore: number } {
  const signalScores = enrichedSignals.map(signal =>
    calculateSignalWeight(signal, weights)
  );

  // Calculate weighted average
  const totalWeight = signalScores.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = signalScores.reduce((sum, s) => sum + (s.finalScore * s.weight), 0);
  const averageScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    scores: signalScores,
    averageScore: Math.round(averageScore)
  };
}

/**
 * Calculate pattern-based score
 */
function calculatePatternScore(patterns: MatchedPattern[]): PatternScoreResult {
  if (patterns.length === 0) {
    return {
      score: 50, // Neutral score if no patterns
      confidence: 0.5
    };
  }

  // Weight patterns by their confidence and conversion rate
  const weightedScores = patterns.map(pattern => {
    const score = pattern.historicalConversion;
    const weight = (pattern as unknown as { confidence?: number; weight?: number }).confidence || 0.5;
    const patternWeight = (pattern as unknown as { weight?: number }).weight || 100;
    return score * weight * (patternWeight / 100);
  });

  const totalWeight = patterns.reduce((sum, p) => {
    const conf = (p as unknown as { confidence?: number }).confidence || 0.5;
    return sum + conf;
  }, 0);
  const patternScore = weightedScores.reduce((sum, s) => sum + s, 0) / totalWeight;

  // Average confidence of matched patterns
  const avgConfidence = totalWeight / patterns.length;

  return {
    score: Math.round(patternScore),
    confidence: avgConfidence
  };
}

/**
 * Calculate prospect fit score
 */
function calculateProspectFit(prospect: Prospect, weights: WeightsConfig): number {
  let fitScore = 50; // Base neutral score

  // Company size fit
  if (prospect.companySize) {
    const sizeMap: Record<string, string> = {
      '1-10': 'smb',
      '11-50': 'smb',
      '51-200': 'midmarket',
      '201-1000': 'midmarket',
      '1000+': 'enterprise',
      '50-200': 'midmarket',
      '100-250': 'midmarket'
    };

    const sizeCategory = sizeMap[prospect.companySize] || 'other';
    const multiplier = weights.prospectFitMultipliers?.companySize?.[sizeCategory] || 1.0;
    fitScore *= multiplier;
  }

  // Industry fit
  if (prospect.industry) {
    const industryLower = prospect.industry.toLowerCase();
    let industryMultiplier = 1.0;

    if (industryLower.includes('saas') || industryLower.includes('software')) {
      industryMultiplier = weights.prospectFitMultipliers?.industry?.saas || 1.15;
    } else if (industryLower.includes('tech') || industryLower.includes('technology')) {
      industryMultiplier = weights.prospectFitMultipliers?.industry?.technology || 1.1;
    }

    fitScore *= industryMultiplier;
  }

  // Role fit (decision maker check)
  if (prospect.role) {
    const roleLower = prospect.role.toLowerCase();
    const decisionMakerRoles = ['vp', 'director', 'head of', 'chief', 'cxo', 'ceo', 'cto', 'cro'];

    if (decisionMakerRoles.some(r => roleLower.includes(r))) {
      fitScore *= 1.2; // 20% boost for decision makers
    } else if (roleLower.includes('manager')) {
      fitScore *= 1.05; // Small boost for managers
    }
  }

  return Math.min(100, Math.round(fitScore));
}

/**
 * Determine confidence level based on data completeness
 */
function calculateConfidence(signalCount: number, patternCount: number, dataCompleteness: number = 0.7): 'low' | 'medium' | 'high' {
  let confidence: 'low' | 'medium' | 'high' = 'medium';

  // More signals = higher confidence
  // High confidence: 5+ signals OR (3+ signals with patterns) OR (6+ signals even without patterns)
  if (signalCount >= 6 || (signalCount >= 5 && patternCount >= 1) || (signalCount >= 3 && patternCount >= 1 && dataCompleteness >= 0.8)) {
    confidence = 'high';
  } else if (signalCount < 3 && patternCount === 0) {
    // Low confidence: very few signals and no patterns
    confidence = 'low';
  } else if (signalCount >= 2 && patternCount >= 1) {
    // Medium confidence: 2+ signals with patterns, or 3-4 signals
    confidence = 'medium';
  } else if (signalCount < 3) {
    confidence = 'low';
  }

  return confidence;
}

/**
 * Determine priority level based on quality score
 */
function determinePriority(qualityScore: number, falsePositiveDetected: boolean): 'ignore' | 'low' | 'medium' | 'high' | 'urgent' {
  if (falsePositiveDetected) {
    return 'ignore';
  }

  if (qualityScore >= 85) {
    return 'urgent';
  } else if (qualityScore >= 70) {
    return 'high';
  } else if (qualityScore >= 50) {
    return 'medium';
  } else if (qualityScore >= 30) {
    return 'low';
  } else {
    return 'ignore';
  }
}

/**
 * Generate reasoning for the quality score
 */
function generateReasoning(signalScores: { scores: SignalScoreData[] }, patterns: MatchedPattern[], qualityScore: number): string {
  const reasoning: string[] = [];

  // Top contributing signals
  const topSignals = signalScores.scores
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 3);

  if (topSignals.length > 0) {
    reasoning.push(`Top signals: ${topSignals.map(s => s.signal).join(', ')}`);
  }

  // Pattern contributions
  if (patterns.length > 0) {
    const topPattern = patterns[0];
    reasoning.push(
      `Matched pattern: "${topPattern.name}" (${topPattern.historicalConversion}% historical conversion)`
    );
  }

  // Overall assessment
  if (qualityScore >= 85) {
    reasoning.push('Exceptionally high-quality signal cluster indicating strong buying intent');
  } else if (qualityScore >= 70) {
    reasoning.push('Strong signals with good context and conversion potential');
  } else if (qualityScore >= 50) {
    reasoning.push('Moderate quality signals - monitor for additional confirmation');
  } else {
    reasoning.push('Weak signals or high false positive risk - low priority');
  }

  return reasoning.join('. ');
}

/**
 * Main quality scoring function
 */
export function calculateQualityScore(
  enrichedSignals: AnalyzedSignal[],
  patterns: MatchedPattern[],
  prospect: Prospect
): QualityScoreResult {
  logger.info('Calculating quality score');

  const weights = loadWeights();

  // 1. Calculate individual signal scores (40% weight)
  const { scores: signalScores, averageScore } = calculateSignalScores(enrichedSignals, weights);

  // 2. Calculate pattern-based score (40% weight)
  const { score: patternScore } = calculatePatternScore(patterns);

  // 3. Calculate prospect fit (20% weight)
  const fitScore = calculateProspectFit(prospect, weights);

  // 4. Combine into final quality score
  const scoringWeights = weights.scoringWeights;
  const qualityScore = Math.round(
    (averageScore * scoringWeights.individualSignals) +
    (patternScore * scoringWeights.patternMatching) +
    (fitScore * scoringWeights.prospectFit)
  );

  // 5. Determine confidence level
  const dataCompleteness = Math.min(1, enrichedSignals.length / 5);
  const confidence = calculateConfidence(
    enrichedSignals.length,
    patterns.length,
    dataCompleteness
  );

  // 6. Check for false positives
  const falsePositivePattern = patterns.find(p => p.isFalsePositive);
  const isFalsePositive = falsePositivePattern !== undefined;

  // 7. Determine priority level
  const priorityLevel = determinePriority(qualityScore, isFalsePositive);

  // 8. Generate reasoning
  const reasoning = generateReasoning({ scores: signalScores }, patterns, qualityScore);

  // 9. Build detailed breakdown
  const breakdown = signalScores.map((scoreData, index) => {
    const signal = enrichedSignals[index];
    return {
      signal: signal.type,
      weight: scoreData.weight,
      score: scoreData.finalScore,
      reasoning: generateSignalReasoning(signal, scoreData),
      extractedContext: {
        painPoints: signal.qualitativeContext.painPoints || [],
        urgency: signal.qualitativeContext.urgency,
        specificity: signal.qualitativeContext.specificity,
        buyingStage: signal.qualitativeContext.buyingStage
      }
    };
  });

  const result: QualityScoreResult = {
    qualityScore: Math.max(0, Math.min(100, qualityScore)),
    confidence,
    priorityLevel,
    breakdown,
    patterns,
    reasoning,
    components: {
      signalScore: averageScore,
      patternScore: patternScore,
      fitScore: fitScore
    },
    weights: {
      signals: scoringWeights.individualSignals,
      patterns: scoringWeights.patternMatching,
      fit: scoringWeights.prospectFit
    }
  };

  logger.info('Quality score calculated', {
    score: result.qualityScore,
    confidence,
    priority: priorityLevel
  });

  return result;
}

/**
 * Generate reasoning for individual signal
 */
function generateSignalReasoning(signal: AnalyzedSignal, scoreData: SignalScoreData): string {
  const reasons: string[] = [];

  // Base assessment
  if (scoreData.baseScore >= 80) {
    reasons.push('High-value signal type');
  } else if (scoreData.baseScore >= 60) {
    reasons.push('Moderate-value signal');
  } else {
    reasons.push('Low-value signal type');
  }

  // Context boosts
  const context = signal.qualitativeContext;

  if (context.painPoints && context.painPoints.length > 0) {
    reasons.push(`Explicit pain points: ${context.painPoints.slice(0, 2).join(', ')}`);
  }

  if (context.urgency === 'high') {
    reasons.push('High urgency indicators');
  }

  if (context.specificity === 'high') {
    reasons.push('Highly specific requirements mentioned');
  }

  if (context.buyingStage === 'decision' || context.buyingStage === 'consideration') {
    reasons.push(`Buyer is in ${context.buyingStage} stage`);
  }

  // Temporal factors
  if (signal.temporalFactors.recency > 0.8) {
    reasons.push('Very recent signal');
  }

  if (signal.temporalFactors.velocity === 'increasing') {
    reasons.push('Increasing engagement velocity');
  }

  if (signal.temporalFactors.frequency > 2) {
    reasons.push(`Repeated signal (${signal.temporalFactors.frequency}x)`);
  }

  return reasons.join('. ');
}

/**
 * Get score interpretation
 */
export function getScoreInterpretation(score: number): {
  level: string;
  description: string;
  recommendation: string;
} {
  if (score >= 85) {
    return {
      level: 'Exceptional',
      description: 'High-quality signal cluster. Immediate action recommended.',
      recommendation: 'Drop everything and reach out within 24 hours'
    };
  } else if (score >= 70) {
    return {
      level: 'Strong',
      description: 'Strong signals with good context. High priority follow-up.',
      recommendation: 'Prioritize personalized outreach within 48 hours'
    };
  } else if (score >= 50) {
    return {
      level: 'Moderate',
      description: 'Moderate quality. Monitor for additional signals.',
      recommendation: 'Add to watchlist, wait for confirming signals'
    };
  } else if (score >= 30) {
    return {
      level: 'Weak',
      description: 'Weak signals or high false positive risk. Low priority.',
      recommendation: 'Add to nurture campaign, do not pursue actively'
    };
  } else {
    return {
      level: 'Poor',
      description: 'Likely noise. Do not pursue unless new signals emerge.',
      recommendation: 'Ignore or remove from active prospecting'
    };
  }
}

