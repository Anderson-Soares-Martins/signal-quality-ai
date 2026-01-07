import { test } from 'node:test';
import assert from 'node:assert';
import {
  calculateQualityScore,
  getScoreInterpretation,
} from '../src/scoring/qualityScorer.js';
import { AnalyzedSignal, Prospect } from '../src/utils/schemas.js';

/**
 * Unit tests for Quality Scorer
 * Run with: npm test
 */

interface TestPattern {
  name: string;
  historicalConversion: number;
  isFalsePositive?: boolean;
}

test('High-quality signals should score above 70', () => {
  const enrichedSignals: AnalyzedSignal[] = [
    {
      type: 'linkedin_engagement',
      rawData: { action: 'commented', content: 'We need a solution urgently' },
      quantitativeScore: 85,
      qualitativeContext: {
        painPoints: ['manual processes'],
        urgency: 'high',
        specificity: 'high',
        buyingStage: 'consideration',
        falsePositiveRisk: 'low',
        sentiment: 'positive',
        confidence: 0.85,
      },
      temporalFactors: {
        recency: 0.95,
        frequency: 1,
        velocity: 'stable',
      },
    },
    {
      type: 'website_visit',
      rawData: { page: '/pricing' },
      quantitativeScore: 75,
      qualitativeContext: {
        urgency: 'medium',
        specificity: 'high',
        buyingStage: 'consideration',
        falsePositiveRisk: 'low',
        sentiment: 'positive',
        confidence: 0.75,
      },
      temporalFactors: {
        recency: 0.9,
        frequency: 3,
        velocity: 'increasing',
      },
    },
  ];

  const patterns: TestPattern[] = [
    {
      name: 'Engaged Evaluator',
      historicalConversion: 73,
    },
  ];

  const prospect: Prospect = {
    company: 'TestCo',
    role: 'VP Sales',
    industry: 'SaaS',
    companySize: '50-200',
  };

  const result = calculateQualityScore(enrichedSignals, patterns, prospect);

  assert.ok(
    result.qualityScore >= 70,
    `High-quality signals should score >= 70, got ${result.qualityScore}`
  );
  assert.strictEqual(
    result.confidence,
    'medium',
    'Should have medium confidence with 2 signals'
  );
  assert.ok(
    ['high', 'urgent'].includes(result.priorityLevel),
    'Should be high or urgent priority'
  );
});

test('Low-quality signals should score below 40', () => {
  const enrichedSignals: AnalyzedSignal[] = [
    {
      type: 'website_visit',
      rawData: { page: '/blog', bounceRate: 0.9 },
      quantitativeScore: 25,
      qualitativeContext: {
        urgency: 'low',
        specificity: 'low',
        buyingStage: 'awareness',
        falsePositiveRisk: 'high',
        sentiment: 'neutral',
        confidence: 0.3,
      },
      temporalFactors: {
        recency: 0.3,
        frequency: 1,
        velocity: 'stable',
      },
    },
  ];

  const patterns: TestPattern[] = [
    {
      name: 'Competitor Researcher',
      historicalConversion: 4,
      isFalsePositive: true,
    },
  ];

  const prospect: Prospect = {
    company: 'CompetitorCo',
    role: 'Product Manager',
  };

  const result = calculateQualityScore(enrichedSignals, patterns, prospect);

  assert.ok(
    result.qualityScore <= 40,
    `Low-quality signals should score <= 40, got ${result.qualityScore}`
  );
  assert.ok(
    ['ignore', 'low'].includes(result.priorityLevel),
    'Should be ignore or low priority'
  );
});

test('More signals should increase confidence', () => {
  const createSignal = (score: number): AnalyzedSignal => ({
    type: 'linkedin_engagement',
    rawData: {},
    quantitativeScore: score,
    qualitativeContext: {
      urgency: 'medium',
      specificity: 'medium',
      buyingStage: 'awareness',
      sentiment: 'neutral',
      falsePositiveRisk: 'medium',
      confidence: 0.6,
    },
    temporalFactors: { recency: 0.8, frequency: 1, velocity: 'stable' },
  });

  const prospect: Prospect = { company: 'Test', role: 'Manager' };

  // 2 signals = low confidence
  const twoSignals = [createSignal(60), createSignal(60)];
  const resultTwo = calculateQualityScore(twoSignals, [], prospect);

  // 6 signals = high confidence
  const sixSignals = Array(6)
    .fill(null)
    .map(() => createSignal(60));
  const resultSix = calculateQualityScore(sixSignals, [], prospect);

  assert.strictEqual(
    resultTwo.confidence,
    'low',
    'Few signals should have low confidence'
  );
  assert.strictEqual(
    resultSix.confidence,
    'high',
    'Many signals should have high confidence'
  );
});

test('getScoreInterpretation should categorize scores correctly', () => {
  const exceptional = getScoreInterpretation(92);
  assert.strictEqual(exceptional.level, 'Exceptional');
  assert.ok(exceptional.description.includes('Immediate'));

  const strong = getScoreInterpretation(75);
  assert.strictEqual(strong.level, 'Strong');
  assert.ok(strong.description.includes('High priority'));

  const moderate = getScoreInterpretation(55);
  assert.strictEqual(moderate.level, 'Moderate');
  assert.ok(moderate.description.includes('Monitor'));

  const weak = getScoreInterpretation(35);
  assert.strictEqual(weak.level, 'Weak');

  const poor = getScoreInterpretation(15);
  assert.strictEqual(poor.level, 'Poor');
  assert.ok(poor.description.includes('noise'));
});

test('Pattern with high conversion should boost score', () => {
  const baseSignals: AnalyzedSignal[] = [
    {
      type: 'website_visit',
      rawData: {},
      quantitativeScore: 50,
      qualitativeContext: {
        urgency: 'medium',
        specificity: 'medium',
        buyingStage: 'awareness',
        sentiment: 'neutral',
        falsePositiveRisk: 'medium',
        confidence: 0.5,
      },
      temporalFactors: { recency: 0.8, frequency: 1, velocity: 'stable' },
    },
  ];

  const prospect: Prospect = { company: 'Test', role: 'Manager' };

  // Without pattern
  const withoutPattern = calculateQualityScore(baseSignals, [], prospect);

  // With high-conversion pattern
  const withPattern = calculateQualityScore(
    baseSignals,
    [
      {
        name: 'Ready to Buy',
        historicalConversion: 87,
      },
    ],
    prospect
  );

  assert.ok(
    withPattern.qualityScore > withoutPattern.qualityScore,
    'High-conversion pattern should boost score'
  );
});

test('False positive risk should lower score', () => {
  const lowRisk: AnalyzedSignal = {
    type: 'linkedin_engagement',
    rawData: {},
    quantitativeScore: 80,
    qualitativeContext: {
      urgency: 'high',
      specificity: 'high',
      buyingStage: 'decision',
      falsePositiveRisk: 'low',
      sentiment: 'positive',
      confidence: 0.9,
    },
    temporalFactors: { recency: 0.9, frequency: 1, velocity: 'stable' },
  };

  const highRisk: AnalyzedSignal = {
    ...lowRisk,
    qualitativeContext: {
      ...lowRisk.qualitativeContext,
      falsePositiveRisk: 'high',
    },
  };

  const prospect: Prospect = { company: 'Test', role: 'Manager' };

  const lowRiskResult = calculateQualityScore([lowRisk], [], prospect);
  const highRiskResult = calculateQualityScore([highRisk], [], prospect);

  assert.ok(
    lowRiskResult.qualityScore > highRiskResult.qualityScore,
    'High false positive risk should lower score'
  );
});
