import { logger } from '../utils/logger.js';
import { generatePersonalizedMessage } from './messageGenerator.js';
import { AnalyzedSignal, Prospect } from '../utils/schemas.js';
import { QualityScoreResult } from '../scoring/qualityScorer.js';

/**
 * Action Recommender
 * Translates quality score into specific, actionable next steps
 */

interface MatchedPattern {
  pattern?: string;
  name: string;
  historicalConversion: number;
  avgDaysToClose: number | null;
  isFalsePositive?: boolean;
}

interface RequestOptions {
  generateMessage?: boolean;
  includeHistoricalComparison?: boolean;
  llmProvider?: 'anthropic';
}

interface ChannelResult {
  channel: string;
  reasoning: string;
}

interface TimingResult {
  timing: string;
  reasoning: string;
}

interface MessagingAngleResult {
  angle: string;
  painPointFocus: string | null;
}

interface HistoricalWin {
  company: string;
  similarityScore: number;
  signalPattern: string;
  outcome: string;
  daysToClose: number | null;
  dealValue: string;
}

interface RecommendedAction {
  type: string;
  channel?: string;
  timing?: string;
  priority?: string;
  messagingAngle?: string;
  suggestedMessage?: string;
  reasoning?: {
    why_this_channel?: string;
    why_now?: string;
    why_this_angle?: string;
  };
  doNotMention?: string[];
  nextSteps?: Array<{
    action: string;
    timing: string;
    priority: number;
  }>;
  redFlags?: string[];
}

interface ActionRecommendationResult {
  qualityScore: number;
  confidence: 'low' | 'medium' | 'high';
  priorityLevel: 'ignore' | 'low' | 'medium' | 'high' | 'urgent';
  analysis?: {
    summary: string;
    keyInsights: string[];
  };
  signalBreakdown: unknown[];
  matchedPatterns: MatchedPattern[];
  recommendedAction?: RecommendedAction;
  type?: string;
  reasoning?: string;
  similarHistoricalWins?: HistoricalWin[];
  estimatedOutcome: {
    conversionProbability: number;
    estimatedDaysToClose?: number | null;
    estimatedDealValue?: string;
    confidence: 'low' | 'medium' | 'high';
    reasoning: string;
  };
  metadata: {
    generatedAt: string;
    analysisVersion: string;
    llmModel: string;
    signalSources: string[];
  };
}

/**
 * Determine best channel for outreach based on signals
 */
function determineChannel(enrichedSignals: AnalyzedSignal[], _prospect: Prospect): ChannelResult {
  // Check what channels the prospect has engaged with
  const hasLinkedInSignal = enrichedSignals.some(s => s.type === 'linkedin_engagement');
  const hasEmailSignal = enrichedSignals.some(s => s.type === 'email_interaction');
  // const hasWebsiteSignal = enrichedSignals.some(s => s.type === 'website_visit');

  // LinkedIn preferred if they've engaged there
  if (hasLinkedInSignal) {
    return {
      channel: 'linkedin_message',
      reasoning: 'Prospect has engaged on LinkedIn, natural continuation of conversation'
    };
  }

  // Email if they've interacted with emails
  if (hasEmailSignal) {
    return {
      channel: 'email',
      reasoning: 'Prospect has shown email engagement'
    };
  }

  // Default to LinkedIn for B2B
  return {
    channel: 'linkedin_message',
    reasoning: 'Most effective channel for B2B decision makers'
  };
}

/**
 * Determine messaging angle based on signals and context
 */
function determineMessagingAngle(
  enrichedSignals: AnalyzedSignal[],
  patterns: MatchedPattern[]
): MessagingAngleResult {
  // Extract pain points from all signals
  const allPainPoints = enrichedSignals
    .flatMap(s => s.qualitativeContext.painPoints || [])
    .filter((p): p is string => !!p);

  // Find dominant pain point
  let messagingAngle = 'general_value_prop';
  let painPointFocus: string | null = null;

  if (allPainPoints.length > 0) {
    // Categorize pain points
    const scalingKeywords = ['scaling', 'growth', 'team expansion', 'hiring'];
    const productivityKeywords = ['manual', 'time', 'efficiency', 'productivity', 'admin'];
    const integrationKeywords = ['integration', 'salesforce', 'crm', 'tech stack'];

    const painPointText = allPainPoints.join(' ').toLowerCase();

    if (scalingKeywords.some(kw => painPointText.includes(kw))) {
      messagingAngle = 'scaling_productivity';
      painPointFocus = 'team scaling challenges';
    } else if (productivityKeywords.some(kw => painPointText.includes(kw))) {
      messagingAngle = 'time_savings';
      painPointFocus = 'manual process automation';
    } else if (integrationKeywords.some(kw => painPointText.includes(kw))) {
      messagingAngle = 'integration_solution';
      painPointFocus = 'integration and tech stack optimization';
    }
  }

  // Check for pattern-based angles
  if (patterns && patterns.length > 0) {
    const primaryPattern = patterns[0];

    if (primaryPattern.pattern === 'new_role_evaluator') {
      messagingAngle = 'new_role_stack_evaluation';
    } else if (primaryPattern.pattern === 'active_evaluator_with_budget') {
      messagingAngle = 'quick_roi';
    }
  }

  return {
    angle: messagingAngle,
    painPointFocus
  };
}

/**
 * Determine timing for outreach
 */
function determineTiming(qualityScore: number, enrichedSignals: AnalyzedSignal[]): TimingResult {
  // Check recency of signals
  const hasVeryRecentSignal = enrichedSignals.some(s =>
    s.temporalFactors.recency > 0.9
  );

  const hasHighUrgency = enrichedSignals.some(s =>
    s.qualitativeContext.urgency === 'high'
  );

  if (qualityScore >= 85 || (hasVeryRecentSignal && hasHighUrgency)) {
    return {
      timing: 'within_24h',
      reasoning: 'High quality and/or urgent signals require immediate action'
    };
  } else if (qualityScore >= 70) {
    return {
      timing: 'within_48h',
      reasoning: 'Strong signals indicate active evaluation'
    };
  } else if (qualityScore >= 50) {
    return {
      timing: 'within_week',
      reasoning: 'Moderate signals, timely but not urgent'
    };
  } else {
    return {
      timing: 'no_rush',
      reasoning: 'Low priority, can wait for additional signals'
    };
  }
}

/**
 * Generate "do not mention" list
 */
function generateDoNotMention(enrichedSignals: AnalyzedSignal[]): string[] {
  const doNot: string[] = [];

  // Don't mention website tracking (feels invasive)
  if (enrichedSignals.some(s => s.type === 'website_visit')) {
    doNot.push('Specific number of website visits or pages viewed (too creepy)');
  }

  // Don't mention job changes explicitly (too obvious)
  if (enrichedSignals.some(s => s.type === 'job_change')) {
    doNot.push('Their recent job change directly (acknowledge expertise instead)');
  }

  // Don't mention email opens/clicks
  if (enrichedSignals.some(s => s.type === 'email_interaction')) {
    doNot.push('That you tracked their email opens or clicks');
  }

  // Always include these generic items
  doNot.push('Generic pitch or feature dump');
  doNot.push('Your quota or sales targets');

  return doNot;
}

/**
 * Generate similar historical wins (mock for now)
 */
function findSimilarHistoricalWins(patterns: MatchedPattern[], prospect: Prospect): HistoricalWin[] {
  // In a real implementation, this would query a database
  // For now, return mock data based on patterns

  const wins: HistoricalWin[] = [];

  if (patterns && patterns.length > 0) {
    const primaryPattern = patterns[0];

    wins.push({
      company: '[Similar Company]',
      similarityScore: 0.87,
      signalPattern: primaryPattern.name,
      outcome: primaryPattern.avgDaysToClose
        ? `Won in ${primaryPattern.avgDaysToClose} days`
        : 'Won',
      daysToClose: primaryPattern.avgDaysToClose,
      dealValue: prospect.companySize?.includes('50-200') ? '$150k ACV' : '$200k ACV'
    });
  }

  return wins;
}

/**
 * Estimate conversion probability
 */
function estimateConversion(
  qualityScore: number,
  patterns: MatchedPattern[],
  confidence: 'low' | 'medium' | 'high'
): number {
  let baseConversion = qualityScore / 100;

  // Adjust based on pattern matching
  if (patterns && patterns.length > 0) {
    const primaryPattern = patterns[0];
    const patternConversion = primaryPattern.historicalConversion / 100;

    // Weighted average of score-based and pattern-based conversion
    baseConversion = (baseConversion * 0.4) + (patternConversion * 0.6);
  }

  // Adjust for confidence
  const confidenceMultiplier = {
    'high': 1.0,
    'medium': 0.85,
    'low': 0.7
  }[confidence] || 0.85;

  return Math.round(baseConversion * confidenceMultiplier * 100) / 100;
}

/**
 * Generate action recommendation
 */
export function generateActionRecommendation(
  scoringResult: QualityScoreResult,
  enrichedSignals: AnalyzedSignal[],
  prospect: Prospect,
  options: RequestOptions = {}
): ActionRecommendationResult {
  logger.info('Generating action recommendation');

  const {
    qualityScore,
    confidence,
    priorityLevel,
    patterns,
    breakdown
  } = scoringResult;

  const typedPatterns = patterns as MatchedPattern[];

  // If low priority or ignore, return minimal recommendation
  if (priorityLevel === 'ignore' || priorityLevel === 'low') {
    return {
      qualityScore,
      confidence,
      priorityLevel,
      signalBreakdown: breakdown,
      matchedPatterns: typedPatterns,
      type: priorityLevel === 'ignore' ? 'no_action' : 'monitor_only',
      reasoning: 'Quality score too low for active outreach',
      recommendedAction: {
        type: 'monitor_and_enrich',
        nextSteps: [
          {
            action: 'Add to passive nurture campaign',
            timing: 'immediate',
            priority: 1
          },
          {
            action: 'Monitor for additional signals',
            timing: 'continuous',
            priority: 2
          },
          {
            action: 'Wait for 3+ more qualifying signals before outreach',
            timing: 'as signals arrive',
            priority: 3
          }
        ]
      },
      estimatedOutcome: {
        conversionProbability: estimateConversion(qualityScore, typedPatterns, confidence),
        confidence: 'low',
        reasoning: 'Insufficient signal quality for accurate prediction'
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        analysisVersion: '1.0.0',
        llmModel: 'claude-sonnet-4',
        signalSources: [...new Set(enrichedSignals.map(s => s.type))]
      }
    };
  }

  // Determine channel
  const { channel, reasoning: channelReasoning } = determineChannel(enrichedSignals, prospect);

  // Determine timing
  const { timing, reasoning: timingReasoning } = determineTiming(qualityScore, enrichedSignals);

  // Determine messaging angle
  const { angle, painPointFocus } = determineMessagingAngle(enrichedSignals, typedPatterns);

  // Generate do-not-mention list
  const doNotMention = generateDoNotMention(enrichedSignals);

  // Find similar historical wins
  const similarWins = findSimilarHistoricalWins(typedPatterns, prospect);

  // Estimate outcomes
  const conversionProbability = estimateConversion(qualityScore, typedPatterns, confidence);
  const estimatedDaysToClose = typedPatterns && typedPatterns.length > 0
    ? typedPatterns[0].avgDaysToClose
    : Math.round(30 + (100 - qualityScore) * 0.5); // Higher score = faster close

  // Build recommendation
  const recommendation: RecommendedAction = {
    type: 'personalized_outreach',
    channel,
    timing,
    priority: priorityLevel,
    messagingAngle: angle,

    reasoning: {
      why_this_channel: channelReasoning,
      why_now: timingReasoning,
      why_this_angle: painPointFocus
        ? `Lead with their specific pain point: ${painPointFocus}`
        : 'General value proposition with industry relevance'
    },

    doNotMention,

    nextSteps: generateNextSteps(qualityScore, timing, channel),

    redFlags: identifyRedFlags(enrichedSignals, typedPatterns)
  };

  // Generate message if requested
  if (options.generateMessage !== false) {
    recommendation.suggestedMessage = generatePersonalizedMessage(
      prospect,
      enrichedSignals,
      angle,
      painPointFocus,
      typedPatterns
    );
  }

  // Build full response
  const result: ActionRecommendationResult = {
    qualityScore,
    confidence,
    priorityLevel,

    analysis: generateAnalysisSummary(scoringResult, enrichedSignals, typedPatterns),

    signalBreakdown: breakdown,

    matchedPatterns: typedPatterns,

    recommendedAction: recommendation,

    similarHistoricalWins: similarWins,

    estimatedOutcome: {
      conversionProbability,
      estimatedDaysToClose,
      estimatedDealValue: estimateDealValue(prospect, qualityScore),
      confidence,
      reasoning: `Based on ${typedPatterns?.length || 0} pattern matches and ${enrichedSignals.length} signals`
    },

    metadata: {
      generatedAt: new Date().toISOString(),
      analysisVersion: '1.0.0',
        llmModel: 'claude-sonnet-4',
      signalSources: [...new Set(enrichedSignals.map(s => s.type))]
    }
  };

  logger.info('Action recommendation generated', {
    priority: priorityLevel,
    channel,
    timing
  });

  return result;
}

/**
 * Generate analysis summary
 */
function generateAnalysisSummary(
  scoringResult: QualityScoreResult,
  enrichedSignals: AnalyzedSignal[],
  patterns: MatchedPattern[]
): { summary: string; keyInsights: string[] } {
  const { qualityScore } = scoringResult;

  let summary = '';

  if (qualityScore >= 85) {
    summary = 'Exceptionally high-quality signal cluster. Prospect is actively evaluating solutions with clear pain point, budget, and authority.';
  } else if (qualityScore >= 70) {
    summary = 'Strong signal cluster indicating serious buyer interest and active evaluation phase.';
  } else if (qualityScore >= 50) {
    summary = 'Moderate signal quality. Prospect shows some interest but needs additional qualifying signals.';
  } else {
    summary = 'Low-quality signal cluster with high false positive indicators or insufficient context.';
  }

  // Extract key insights
  const keyInsights: string[] = [];

  // Pain points
  const painPoints = enrichedSignals
    .flatMap(s => s.qualitativeContext.painPoints || [])
    .filter((p): p is string => !!p);

  if (painPoints.length > 0) {
    keyInsights.push(`Pain points identified: ${painPoints.slice(0, 3).join(', ')}`);
  }

  // High urgency signals
  const urgentSignals = enrichedSignals.filter(s => s.qualitativeContext.urgency === 'high');
  if (urgentSignals.length > 0) {
    keyInsights.push(`${urgentSignals.length} high-urgency signals detected`);
  }

  // Decision stage
  const decisionStageSignals = enrichedSignals.filter(s =>
    s.qualitativeContext.buyingStage === 'decision' || s.qualitativeContext.buyingStage === 'consideration'
  );
  if (decisionStageSignals.length > 0) {
    keyInsights.push('Prospect in active evaluation stage');
  }

  // Pattern insights
  if (patterns && patterns.length > 0) {
    const primaryPattern = patterns[0];
    keyInsights.push(`Pattern match: "${primaryPattern.name}" (${primaryPattern.historicalConversion}% conversion rate)`);
  }

  return {
    summary,
    keyInsights
  };
}

/**
 * Generate next steps
 */
function generateNextSteps(
  qualityScore: number,
  timing: string,
  channel: string
): Array<{ action: string; timing: string; priority: number }> {
  const steps: Array<{ action: string; timing: string; priority: number }> = [];

  if (qualityScore >= 70) {
    steps.push({
      action: `Send personalized ${channel.replace('_', ' ')}`,
      timing: timing.replace('_', ' '),
      priority: 1
    });

    steps.push({
      action: 'If no response in 48h, send follow-up with case study',
      timing: '48h after first touchpoint',
      priority: 2
    });

    steps.push({
      action: 'If response positive, book discovery call',
      timing: 'immediate upon response',
      priority: 3
    });
  } else {
    steps.push({
      action: 'Monitor for additional signals',
      timing: 'continuous',
      priority: 1
    });

    steps.push({
      action: 'Add to nurture campaign',
      timing: 'immediate',
      priority: 2
    });

    steps.push({
      action: 'Re-evaluate when 2+ new signals appear',
      timing: 'as signals arrive',
      priority: 3
    });
  }

  return steps;
}

/**
 * Identify red flags
 */
function identifyRedFlags(enrichedSignals: AnalyzedSignal[], patterns: MatchedPattern[]): string[] {
  const redFlags: string[] = [];

  // Check for false positive pattern
  const falsePositivePattern = patterns?.find(p => p.isFalsePositive);
  if (falsePositivePattern) {
    redFlags.push(`Matches false positive pattern: ${falsePositivePattern.name}`);
  }

  // Check for high false positive risk in context
  const highRiskSignals = enrichedSignals.filter(s =>
    s.qualitativeContext.falsePositiveRisk === 'high'
  );
  if (highRiskSignals.length > enrichedSignals.length / 2) {
    redFlags.push('Majority of signals have high false positive risk');
  }

  // Check for shallow engagement
  const shallowSignals = enrichedSignals.filter(s =>
    s.quantitativeScore < 40
  );
  if (shallowSignals.length === enrichedSignals.length) {
    redFlags.push('All signals show shallow engagement');
  }

  // Check for competitor indicators
  const hasCompetitorIndicators = enrichedSignals.some(s => {
    const rawData = s.rawData as Record<string, unknown>;
    const metadata = rawData.metadata as Record<string, unknown> | undefined;
    return metadata?.isCompetitor || String(rawData.company || '').toLowerCase().includes('competitor');
  });
  if (hasCompetitorIndicators) {
    redFlags.push('Prospect may be competitor conducting research');
  }

  return redFlags;
}

/**
 * Estimate deal value based on prospect characteristics
 */
function estimateDealValue(prospect: Prospect, _qualityScore: number): string {
  let baseValue = 100000; // $100k base

  // Adjust for company size
  if (prospect.companySize) {
    const sizeMap: Record<string, number> = {
      '1-10': 0.3,
      '11-50': 0.5,
      '51-200': 1.0,
      '50-200': 1.0,
      '100-250': 1.2,
      '201-1000': 1.5,
      '1000+': 2.0
    };

    const multiplier = sizeMap[prospect.companySize] || 1.0;
    baseValue *= multiplier;
  }

  // Adjust for role level
  if (prospect.role) {
    const roleLower = prospect.role.toLowerCase();
    if (roleLower.includes('vp') || roleLower.includes('chief')) {
      baseValue *= 1.3;
    } else if (roleLower.includes('director')) {
      baseValue *= 1.15;
    }
  }

  // Format as range
  const low = Math.round(baseValue * 0.8 / 1000) * 1000;
  const high = Math.round(baseValue * 1.2 / 1000) * 1000;

  return `$${low / 1000}k-${high / 1000}k ACV`;
}

