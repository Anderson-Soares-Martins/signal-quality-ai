import express, { Request, Response, NextFunction } from 'express';
import { analyzeSignals } from '../analyzers/signalAnalyzer.js';
import { enrichSignalsWithContext } from '../analyzers/llmExtractor.js';
import { identifyPatterns, loadKnownPatterns } from '../analyzers/patternMatcher.js';
import { calculateQualityScore } from '../scoring/qualityScorer.js';
import { generateActionRecommendation } from '../recommendations/actionEngine.js';
import { validateAnalysisRequest } from './middleware.js';
import { logger } from '../utils/logger.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * Main analysis endpoint
 * POST /api/analyze
 */
router.post('/analyze', validateAnalysisRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { signals, prospect, options } = req.body;

    logger.info('Starting signal analysis', {
      signalCount: signals.length,
      prospect: prospect.company
    });

    // Step 1: Analyze individual signals (quantitative)
    const analyzedSignals = analyzeSignals(signals);

    // Step 2: Enrich with LLM context (qualitative)
    const enrichedSignals = await enrichSignalsWithContext(analyzedSignals, prospect);

    // Step 3: Identify patterns
    const patterns = identifyPatterns(enrichedSignals);

    // Step 4: Calculate quality score
    const scoringResult = calculateQualityScore(enrichedSignals, patterns, prospect);

    // Step 5: Generate action recommendation
    const recommendation = generateActionRecommendation(
      scoringResult,
      enrichedSignals,
      prospect,
      options
    );

    logger.info('Analysis complete', {
      score: recommendation.qualityScore,
      priority: recommendation.priorityLevel
    });

    res.json(recommendation);
  } catch (error) {
    next(error);
  }
});

/**
 * Get known patterns
 * GET /api/patterns
 */
router.get('/patterns', (_req: Request, res: Response) => {
  try {
    loadKnownPatterns();
    res.json({
      patterns: [
        {
          id: 'engaged_evaluator',
          name: 'Engaged Evaluator',
          conversionRate: 0.73,
          avgDaysToClose: 14,
          description: 'Public engagement + private research + educational content'
        },
        {
          id: 'new_role_evaluator',
          name: 'New Role Evaluator',
          conversionRate: 0.58,
          avgDaysToClose: 45,
          description: 'New decision-maker + company growth + team expansion'
        },
        {
          id: 'active_evaluator_with_budget',
          name: 'Active Evaluator with Budget',
          conversionRate: 0.81,
          avgDaysToClose: 12,
          description: 'Public pain point + pricing research + funding'
        },
        {
          id: 'ready_to_buy',
          name: 'Ready to Buy',
          conversionRate: 0.87,
          avgDaysToClose: 7,
          description: 'Multiple BOFU signals indicating imminent purchase'
        }
      ]
    });
  } catch (error) {
    logger.error('Error loading patterns', { error });
    res.status(500).json({ error: 'Failed to load patterns' });
  }
});

/**
 * Feedback endpoint (for learning loop)
 * POST /api/feedback
 */
router.post('/feedback', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { analysisId, outcome, actualDaysToClose } = req.body;

    // In a real implementation, this would update the learning system
    logger.info('Feedback received', {
      analysisId,
      outcome,
      actualDaysToClose
    });

    res.json({
      success: true,
      message: 'Feedback recorded successfully',
      note: 'Learning loop not yet implemented in MVP'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get example scenarios
 * GET /api/examples/:type
 */
router.get('/examples/:type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.params;
    const validTypes = ['high-quality', 'false-positive', 'mixed-signals'];

    if (!validTypes.includes(type)) {
      res.status(400).json({
        error: 'Invalid example type',
        validTypes
      });
      return;
    }

    // Load example from file
    const examplePath = join(__dirname, `../../data/examples/${type}.json`);
    const exampleData = JSON.parse(readFileSync(examplePath, 'utf-8'));

    res.json(exampleData);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      res.status(404).json({
        error: 'Example not found',
        message: `Example file for type '${req.params.type}' does not exist`
      });
    } else {
      next(error);
    }
  }
});

export default router;

