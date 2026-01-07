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
 * Build prompt for LLM context extraction
 */
function buildExtractionPrompt(signal: Signal, prospect: Prospect): string {
  const signalDescription = JSON.stringify(signal, null, 2);
  const prospectDescription = JSON.stringify(prospect, null, 2);

  return `You are analyzing a buyer intent signal to extract qualitative insights.

SIGNAL DATA:
${signalDescription}

PROSPECT CONTEXT:
${prospectDescription}

Analyze this signal and extract the following insights:

1. Pain Points: What explicit problems or needs are mentioned or implied?
2. Urgency: How urgent is this need? (low/medium/high)
3. Specificity: How specific is this signal? (low/medium/high)
4. Buying Stage: What stage of the buying journey? (awareness/consideration/decision/unknown)
5. Sentiment: What is the sentiment? (positive/negative/neutral)
6. False Positive Risk: How likely is this a false positive? (low/medium/high)
7. Confidence: How confident are you in this analysis? (0-1)

Respond ONLY with a valid JSON object in this exact format (no markdown, just JSON):
{
  "painPoints": ["pain point 1", "pain point 2"],
  "urgency": "low|medium|high",
  "urgencyReasoning": "why this urgency level",
  "specificity": "low|medium|high",
  "specificityReasoning": "why this specificity level",
  "buyingStage": "awareness|consideration|decision|unknown",
  "sentiment": "positive|negative|neutral",
  "falsePositiveRisk": "low|medium|high",
  "falsePositiveReasons": ["reason 1", "reason 2"],
  "confidence": 0.85,
  "keyInsights": ["insight 1", "insight 2"]
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
