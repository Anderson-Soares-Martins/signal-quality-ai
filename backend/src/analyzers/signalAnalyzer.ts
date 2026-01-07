import { calculateRecencyScore, getTimeContext, determineUrgency, Velocity } from '../utils/temporal.js';
import { logger } from '../utils/logger.js';
import { Signal, AnalyzedSignal, QualitativeContext, TemporalFactors } from '../utils/schemas.js';

/**
 * Analyze individual signals to extract quantitative scores
 * and prepare data for qualitative LLM analysis
 */

interface SignalMetadata {
  postTopic?: string;
  tier_viewed?: string;
  seniorityIncrease?: boolean;
  companyStage?: string;
  topic?: string;
  linkType?: string;
  department?: string;
  rolesCount?: number;
  category?: string;
  action?: string;
  intent?: string;
}

/**
 * Calculate quantitative score for a signal based on objective metrics
 */
export function calculateQuantitativeScore(signal: Signal): number {
  const { type } = signal;

  switch (type) {
    case 'linkedin_engagement':
      return scoreLinkedInEngagement(signal);
    case 'website_visit':
      return scoreWebsiteVisit(signal);
    case 'job_change':
      return scoreJobChange(signal);
    case 'content_download':
      return scoreContentDownload(signal);
    case 'email_interaction':
      return scoreEmailInteraction(signal);
    case 'company_news':
      return scoreCompanyNews(signal);
    case 'hiring_signals':
      return scoreHiringSignals(signal);
    case 'tech_stack_change':
      return scoreTechStackChange(signal);
    case 'intent_data':
      return scoreIntentData(signal);
    default:
      logger.warn(`Unknown signal type: ${type}`);
      return 50; // Default neutral score
  }
}

/**
 * Score LinkedIn engagement signals
 */
function scoreLinkedInEngagement(signal: Signal): number {
  const { action, content, metadata } = signal;
  const meta = metadata as SignalMetadata | undefined;

  let baseScore = 0;

  // Action type scoring
  switch (action) {
    case 'commented':
      baseScore = 85; // High value - they invested time
      break;
    case 'connection_request':
      baseScore = 70;
      break;
    case 'share':
      baseScore = 75;
      break;
    case 'like':
    case 'liked': // Accept both 'like' and 'liked'
      baseScore = 30; // Low value - minimal effort
      break;
    case 'follow':
      baseScore = 40;
      break;
    default:
      baseScore = 50;
  }

  // Boost for content length (if comment)
  if (action === 'commented' && content) {
    if (content.length > 200) {
      baseScore += 10; // Thoughtful, detailed comment
    } else if (content.length < 30) {
      // Only penalize very short comments (< 30 chars), not medium ones
      baseScore -= 15; // Very short, possibly generic comment
    }
  }

  // Boost for relevant post topics
  if (meta?.postTopic) {
    const relevantTopics = ['sales', 'automation', 'productivity', 'crm', 'revenue'];
    const topic = meta.postTopic.toLowerCase();
    if (relevantTopics.some(t => topic.includes(t))) {
      baseScore += 5;
    }
  }

  return Math.max(0, Math.min(100, baseScore));
}

/**
 * Score website visit signals
 */
function scoreWebsiteVisit(signal: Signal): number {
  const { page, duration, visitNumber, bounceRate, metadata } = signal;
  const meta = metadata as SignalMetadata | undefined;

  let baseScore = 40; // Start with low-medium base

  // Page value scoring
  const highValuePages = ['/pricing', '/demo', '/enterprise', '/contact', '/request-trial'];
  const mediumValuePages = ['/features', '/case-studies', '/customers', '/integrations'];
  const lowValuePages = ['/blog', '/about', '/careers'];

  const pageLower = (page || '').toLowerCase();

  if (highValuePages.some(p => pageLower.includes(p))) {
    baseScore = 75;
  } else if (mediumValuePages.some(p => pageLower.includes(p))) {
    baseScore = 55;
  } else if (lowValuePages.some(p => pageLower.includes(p))) {
    baseScore = 25;
  }

  // Duration scoring (in seconds)
  if (duration) {
    if (duration > 300) { // 5+ minutes
      baseScore += 15;
    } else if (duration > 120) { // 2-5 minutes
      baseScore += 10;
    } else if (duration > 60) { // 1-2 minutes
      baseScore += 5;
    } else if (duration < 30) { // Less than 30 seconds
      baseScore -= 10;
    }
  }

  // Repeat visit bonus
  if (visitNumber && visitNumber > 1) {
    baseScore += Math.min(20, visitNumber * 5); // Cap at 20 bonus points
  }

  // Bounce rate penalty
  if (bounceRate !== undefined && bounceRate > 0.8) {
    baseScore -= 20; // High bounce = low quality
  }

  // Enterprise tier viewed
  if (meta?.tier_viewed === 'enterprise') {
    baseScore += 10;
  }

  return Math.max(0, Math.min(100, baseScore));
}

/**
 * Score job change signals
 */
function scoreJobChange(signal: Signal): number {
  const { toRole, daysInRole, metadata } = signal;
  const meta = metadata as SignalMetadata | undefined;

  let baseScore = 50;

  // Seniority increase
  if (meta?.seniorityIncrease === true) {
    baseScore = 65;
  }

  // New decision-maker roles
  const decisionMakerRoles = ['vp', 'director', 'head of', 'chief', 'cxo'];
  const roleLower = (toRole || '').toLowerCase();

  if (decisionMakerRoles.some(r => roleLower.includes(r))) {
    baseScore += 15;
  }

  // Optimal evaluation window (30-90 days in role)
  if (daysInRole !== undefined) {
    if (daysInRole >= 15 && daysInRole <= 90) {
      baseScore += 20; // Sweet spot for stack evaluation
    } else if (daysInRole < 15) {
      baseScore += 5; // Very new, might evaluate soon
    } else if (daysInRole > 180) {
      baseScore -= 10; // Likely already established their stack
    }
  }

  // Company stage
  if (meta?.companyStage) {
    const growthStages = ['series_a', 'series_b', 'series_c'];
    if (growthStages.includes(meta.companyStage)) {
      baseScore += 10;
    }
  }

  return Math.max(0, Math.min(100, baseScore));
}

/**
 * Score content download signals
 */
function scoreContentDownload(signal: Signal): number {
  const { asset, metadata } = signal;
  const meta = metadata as SignalMetadata | undefined;

  let baseScore = 60;

  // Bottom-of-funnel content = higher score
  const bofuContent = ['implementation', 'enterprise', 'security', 'compliance', 'migration'];
  const mofuContent = ['case study', 'whitepaper', 'guide', 'playbook'];
  const tofuContent = ['ebook', 'report', 'infographic'];

  const assetLower = (asset || '').toLowerCase();

  if (bofuContent.some(c => assetLower.includes(c))) {
    baseScore = 85;
  } else if (mofuContent.some(c => assetLower.includes(c))) {
    baseScore = 70;
  } else if (tofuContent.some(c => assetLower.includes(c))) {
    baseScore = 50;
  }

  // Topic relevance
  if (meta?.topic) {
    const relevantTopics = ['roi', 'integration', 'automation', 'productivity'];
    if (relevantTopics.some(t => meta.topic!.toLowerCase().includes(t))) {
      baseScore += 5;
    }
  }

  return Math.max(0, Math.min(100, baseScore));
}

/**
 * Score email interaction signals
 */
function scoreEmailInteraction(signal: Signal): number {
  const { action, clickedLink, metadata } = signal;
  const meta = metadata as SignalMetadata | undefined;

  let baseScore = 0;

  switch (action) {
    case 'reply':
      baseScore = 95; // Extremely high value
      break;
    case 'clicked':
      baseScore = 70;
      break;
    case 'opened':
      baseScore = clickedLink ? 70 : 25; // Open+click vs open-only
      break;
    default:
      baseScore = 20;
  }

  // Clicked specific links
  if (meta?.linkType === 'calendar') {
    baseScore = 90;
  } else if (meta?.linkType === 'pricing') {
    baseScore += 10;
  }

  return Math.max(0, Math.min(100, baseScore));
}

/**
 * Score company news signals
 */
function scoreCompanyNews(signal: Signal): number {
  const { newsType, details } = signal;

  let baseScore = 45;

  switch (newsType) {
    case 'funding':
      baseScore = 75; // Strong buying signal
      if (details && details.includes('Series')) {
        baseScore += 10;
      }
      break;
    case 'expansion':
      baseScore = 70;
      break;
    case 'leadership_change':
      baseScore = 60;
      break;
    case 'acquisition':
      baseScore = 55;
      break;
    case 'product_launch':
      baseScore = 50;
      break;
    default:
      baseScore = 40;
  }

  return Math.max(0, Math.min(100, baseScore));
}

/**
 * Score hiring signals
 */
function scoreHiringSignals(signal: Signal): number {
  const { metadata } = signal;
  const meta = metadata as SignalMetadata | undefined;

  let baseScore = 60;

  // Department relevance
  const relevantDepts = ['sales', 'revenue', 'business development', 'customer success'];
  if (meta?.department && relevantDepts.includes(meta.department.toLowerCase())) {
    baseScore = 70;
  }

  // Volume of hiring
  if (meta?.rolesCount) {
    if (meta.rolesCount >= 5) {
      baseScore += 20; // Significant expansion
    } else if (meta.rolesCount >= 2) {
      baseScore += 10;
    }
  }

  return Math.max(0, Math.min(100, baseScore));
}

/**
 * Score tech stack change signals
 */
function scoreTechStackChange(signal: Signal): number {
  const { metadata } = signal;
  const meta = metadata as SignalMetadata | undefined;

  let baseScore = 55;

  if (meta?.category === 'CRM' || meta?.category === 'sales') {
    baseScore = 75; // Highly relevant
  }

  if (meta?.action === 'evaluation') {
    baseScore += 15;
  } else if (meta?.action === 'removed') {
    baseScore += 20; // Looking for replacement
  }

  return Math.max(0, Math.min(100, baseScore));
}

/**
 * Score intent data signals
 */
function scoreIntentData(signal: Signal): number {
  const { metadata } = signal;
  const meta = metadata as SignalMetadata | undefined;

  let baseScore = 50;

  if (meta?.intent === 'competitor_comparison') {
    baseScore = 80;
  } else if (meta?.intent === 'pricing_research') {
    baseScore = 75;
  } else if (meta?.intent === 'general_research') {
    baseScore = 55;
  }

  return Math.max(0, Math.min(100, baseScore));
}

/**
 * Analyze a signal and return structured analysis
 */
export function analyzeSignal(signal: Signal, allSignals: Signal[] = []): AnalyzedSignal {
  logger.debug(`Analyzing signal: ${signal.type}`);

  // Calculate quantitative score
  const quantitativeScore = calculateQuantitativeScore(signal);

  // Calculate temporal factors
  const recency = calculateRecencyScore(signal.timestamp);
  const timeContext = getTimeContext(signal.timestamp);

  // Calculate frequency (how many signals of this type)
  const similarSignals = allSignals.filter(s => s.type === signal.type);
  const frequency = similarSignals.length;

  // Determine velocity (if multiple similar signals)
  let velocity: Velocity = 'stable';
  if (similarSignals.length > 1) {
    const timestamps = similarSignals.map(s => s.timestamp).filter((t): t is string => !!t);
    // Simple velocity: are signals getting more frequent?
    const sortedTimestamps = timestamps.map(t => new Date(t)).sort((a, b) => a.getTime() - b.getTime());
    if (sortedTimestamps.length >= 3) {
      const firstGap = sortedTimestamps[1].getTime() - sortedTimestamps[0].getTime();
      const lastGap = sortedTimestamps[sortedTimestamps.length - 1].getTime() - sortedTimestamps[sortedTimestamps.length - 2].getTime();
      if (lastGap < firstGap * 0.7) {
        velocity = 'increasing';
      } else if (lastGap > firstGap * 1.3) {
        velocity = 'decreasing';
      }
    }
  }

  const qualitativeContext: Partial<QualitativeContext> = {
    // Will be populated by LLM extractor
    urgency: determineUrgency(signal)
  };

  const temporalFactors: TemporalFactors = {
    recency,
    frequency,
    velocity,
    ...timeContext
  };

  const analyzedSignal: AnalyzedSignal = {
    type: signal.type,
    rawData: signal,
    quantitativeScore,
    qualitativeContext: qualitativeContext as QualitativeContext,
    temporalFactors
  };

  logger.debug(`Signal analysis complete`, {
    type: signal.type,
    score: quantitativeScore,
    recency,
    frequency
  });

  return analyzedSignal;
}

/**
 * Analyze multiple signals for a prospect
 */
export function analyzeSignals(signals: Signal[]): AnalyzedSignal[] {
  logger.info(`Analyzing ${signals.length} signals`);

  return signals.map(signal => analyzeSignal(signal, signals));
}


