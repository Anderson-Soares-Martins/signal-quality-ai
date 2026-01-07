import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';
import { AnalyzedSignal, Prospect, Signal } from '../utils/schemas.js';

/**
 * LLM Context Extractor
 * Extracts qualitative insights from unstructured signal data using Claude Sonnet 4
 */

interface LLMExtractionResult {
  painPoints: string[];
  urgency: 'low' | 'medium' | 'high';
  urgencyReasoning?: string;
  specificity: 'low' | 'medium' | 'high';
  specificityReasoning?: string;
  buyingStage: 'awareness' | 'consideration' | 'decision' | 'unknown';
  sentiment: 'positive' | 'negative' | 'neutral';
  falsePositiveRisk: 'low' | 'medium' | 'high';
  falsePositiveReasons?: string[];
  confidence: number;
  keyInsights?: string[];
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is required. Please set it in your .env file.');
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY
});

/**
 * Build signal-specific analysis guidelines
 */
function getSignalSpecificGuidelines(signal: Signal): string {
  const type = signal.type;
  const metadata = signal.metadata || {};
  const hasContent = 'content' in signal || 'text' in signal;
  const content = (signal as any).content || (signal as any).text || '';

  let guidelines = '\n### SIGNAL-SPECIFIC ANALYSIS:\n';

  if (type.includes('linkedin') || type.includes('social')) {
    guidelines += `
This is a SOCIAL MEDIA signal. Pay special attention to:
- If there's text/comment content, analyze it deeply for pain points, urgency words, and buying intent
- Look for specific problems mentioned (e.g., "we're struggling with X", "need solution for Y")
- Detect urgency indicators: "ASAP", "yesterday", "urgent", "deadline", time pressure
- Identify decision-making authority hints: "my team", "we're evaluating", "I'm responsible for"
- Assess public commitment level (commenting publicly = higher intent than private viewing)
${hasContent ? `\nCOMMENT/POST TEXT TO ANALYZE:\n"${content}"\n` : ''}
Engagement type: ${metadata.action || 'unknown'}
Topic context: ${metadata.postTopic || metadata.topic || 'unknown'}`;
  }

  else if (type.includes('pricing') || type.includes('demo')) {
    guidelines += `
This is a HIGH-INTENT signal (pricing/demo). Deep dive into:
- Visit duration (longer = higher intent): ${(signal as any).duration || 'unknown'}s
- Repeat visits (shows persistence): Visit #${(signal as any).visitNumber || 1}
- Tier/plan viewed: ${metadata.tier_viewed || metadata.plan || 'unknown'}
- Form fields filled (if demo request): Look for budget, timeline, team size mentions
- Page sequence: Did they come from case studies or direct? (Referrer: ${metadata.referrer || 'unknown'})
- CRITICAL: Pricing page + demo request within 24h = extremely high intent`;
  }

  else if (type.includes('website') || type.includes('visit')) {
    guidelines += `
This is a WEBSITE VISIT signal. Evaluate:
- Page topic and depth: ${(signal as any).page || 'unknown'}
- Time spent (indicates genuine interest vs bounce): ${(signal as any).duration || 'unknown'}s
- Visit frequency: ${(signal as any).visitNumber || 1}
- Path analysis: What did they view before/after?
- Content depth: Case study = mid-funnel, pricing = bottom-funnel, blog = top-funnel
Referrer source: ${metadata.referrer || 'direct'}`;
  }

  else if (type.includes('email')) {
    guidelines += `
This is an EMAIL ENGAGEMENT signal. Analyze:
- Open count (1 = curiosity, 3+ = real interest): ${metadata.opens || 1}
- Time spent reading: ${metadata.timeSpent || 'unknown'}
- Links clicked (which ones and how many): ${metadata.linksClicked || 'unknown'}
- Reply behavior: ${metadata.replied ? 'YES - very high intent' : 'No reply'}
- Forward/share behavior: ${metadata.forwarded ? 'YES - involving others' : 'Not forwarded'}`;
  }

  else if (type.includes('content') || type.includes('download')) {
    guidelines += `
This is a CONTENT DOWNLOAD signal. Consider:
- Asset type: ${(signal as any).asset || metadata.assetType || 'unknown'}
- Topic relevance: ${metadata.topic || 'unknown'}
- Funnel stage: Whitepaper/Guide = consideration, ROI Calculator = decision stage
- Gating level: Did they provide work email, phone, company size?`;
  }

  else if (type.includes('job') || type.includes('role')) {
    guidelines += `
This is a JOB CHANGE signal. Critical factors:
- Seniority change: ${metadata.seniorityIncrease ? 'PROMOTED - likely has budget' : 'Lateral move'}
- Days in new role: ${(signal as any).daysInRole || 'unknown'} (30-90 days = buying window)
- Company context: ${metadata.companyStage || 'unknown'}
- New problems to solve: New VP = need to prove value quickly = high buying intent`;
  }

  else if (type.includes('trial') || type.includes('product')) {
    guidelines += `
This is a PRODUCT TRIAL signal. VERY HIGH INTENT. Analyze:
- Trial length and usage: ${metadata.trialDuration || 'unknown'}
- Features used (power users = qualified): ${metadata.featuresUsed || 'unknown'}
- Team invites (involving others = buying committee forming): ${metadata.teamSize || 'unknown'}
- Upgrade path clicked: ${metadata.upgradePath ? 'YES - ready to buy' : 'Not yet'}`;
  }

  return guidelines;
}

/**
 * Build enhanced prompt for LLM context extraction with signal-specific analysis
 */
function buildExtractionPrompt(signal: Signal, prospect: Prospect): string {
  const signalDescription = JSON.stringify(signal, null, 2);
  const prospectDescription = JSON.stringify(prospect, null, 2);
  const specificGuidelines = getSignalSpecificGuidelines(signal);

  return `You are an expert B2B sales intelligence analyst specializing in buyer intent signal analysis.

Your job is to extract DEEP qualitative insights from this signal, going beyond surface-level analysis.

SIGNAL DATA:
${signalDescription}

PROSPECT CONTEXT:
${prospectDescription}
${specificGuidelines}

### ANALYSIS INSTRUCTIONS:

1. **Pain Points**: Extract specific, actionable pain points
   - Look for explicit problems mentioned in text
   - Infer implicit needs from behavior patterns
   - Quantify impact when mentioned (e.g., "50 reps spending 4+ hours")

2. **Urgency Indicators**: Detect time pressure
   - Words: "ASAP", "urgent", "yesterday", "deadline", "quickly"
   - Behavioral: Multiple visits in short timeframe, weekend/evening activity
   - Contextual: New in role, funding event, competitor mention

3. **Specificity**: How targeted is this signal?
   - Generic research (low) vs specific solution evaluation (high)
   - Product-specific pages/content vs general awareness

4. **Buying Stage**: Where are they in the journey?
   - Awareness: Blog, general content
   - Consideration: Case studies, comparison pages, features
   - Decision: Pricing, demo, ROI calculator, trials

5. **Sentiment**: Emotional tone (if text available)
   - Frustration = pain (good)
   - Enthusiasm = interest (good)
   - Skepticism = needs nurturing

6. **False Positive Risk**: Red flags
   - Student email, competitor, wrong industry
   - Bot-like behavior (< 10s on page)
   - No decision-making authority hints

7. **Key Insights**: Actionable intelligence for SDRs
   - What to mention in outreach
   - Timing recommendations
   - Objection handling prep

Respond ONLY with valid JSON (no markdown):
{
  "painPoints": ["specific pain 1 with quantification if available", "pain 2"],
  "urgency": "low|medium|high",
  "urgencyReasoning": "detailed explanation with evidence",
  "specificity": "low|medium|high",
  "specificityReasoning": "why this level",
  "buyingStage": "awareness|consideration|decision|unknown",
  "sentiment": "positive|negative|neutral",
  "falsePositiveRisk": "low|medium|high",
  "falsePositiveReasons": ["reason 1", "reason 2"],
  "confidence": 0.85,
  "keyInsights": ["actionable insight 1", "insight 2", "insight 3"]
}`;
}

/**
 * Extract context using Anthropic Claude API
 */
async function extractWithClaude(signal: Signal, prospect: Prospect): Promise<LLMExtractionResult> {
  const prompt = buildExtractionPrompt(signal, prospect);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    
    // Extract JSON from markdown code blocks if present
    let jsonText = responseText.trim();
    if (jsonText.includes('```json')) {
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
    } else if (jsonText.includes('```')) {
      const jsonMatch = jsonText.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
    }
    
    const extracted = JSON.parse(jsonText) as LLMExtractionResult;

    logger.debug('LLM extraction successful', { signal: signal.type });

    return extracted;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('LLM extraction failed', { error: errorMessage, signal: signal.type });
    throw new Error(`Failed to extract context from signal: ${errorMessage}`);
  }
}

/**
 * Enrich analyzed signals with LLM-extracted context
 */
export async function enrichSignalsWithContext(
  analyzedSignals: AnalyzedSignal[],
  prospect: Prospect
): Promise<AnalyzedSignal[]> {
  logger.info(`Enriching ${analyzedSignals.length} signals with Claude Sonnet 4`);

  const enrichedSignals: AnalyzedSignal[] = [];

  for (const signal of analyzedSignals) {
    try {
      const qualitativeContext = await extractWithClaude(signal.rawData as Signal, prospect);

      // Merge LLM context with existing analysis
      enrichedSignals.push({
        ...signal,
        qualitativeContext: {
          ...signal.qualitativeContext,
          ...qualitativeContext
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to enrich signal ${signal.type}`, { error: errorMessage });
      // Continue with signal as-is if enrichment fails
      enrichedSignals.push(signal);
    }
  }

  logger.info('Signal enrichment complete');
  return enrichedSignals;
}

/**
 * Extract context from a single signal (convenience method)
 */
export async function extractContextFromSignal(
  signal: Signal,
  prospect: Prospect
): Promise<LLMExtractionResult> {
  return await extractWithClaude(signal, prospect);
}
