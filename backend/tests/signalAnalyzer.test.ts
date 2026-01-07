import { test } from 'node:test';
import assert from 'node:assert';
import { calculateQuantitativeScore, analyzeSignal } from '../src/analyzers/signalAnalyzer.js';
import { Signal } from '../src/utils/schemas.js';

/**
 * Unit tests for Signal Analyzer
 * Run with: npm test
 */

test('LinkedIn comment should score higher than like', () => {
  const comment: Signal = {
    type: 'linkedin_engagement',
    action: 'commented',
    content: 'Great post about sales automation',
    timestamp: new Date().toISOString()
  };

  const like: Signal = {
    type: 'linkedin_engagement',
    action: 'liked',
    timestamp: new Date().toISOString()
  };

  const commentScore = calculateQuantitativeScore(comment);
  const likeScore = calculateQuantitativeScore(like);

  assert.ok(commentScore > likeScore,
    `Comment score (${commentScore}) should be higher than like score (${likeScore})`);
  assert.ok(commentScore >= 80, 'Comment should score at least 80');
  assert.ok(likeScore <= 40, 'Like should score at most 40');
});

test('Pricing page visit should score higher than blog visit', () => {
  const pricingVisit: Signal = {
    type: 'website_visit',
    page: '/pricing',
    duration: 120,
    timestamp: new Date().toISOString()
  };

  const blogVisit: Signal = {
    type: 'website_visit',
    page: '/blog/post',
    duration: 120,
    timestamp: new Date().toISOString()
  };

  const pricingScore = calculateQuantitativeScore(pricingVisit);
  const blogScore = calculateQuantitativeScore(blogVisit);

  assert.ok(pricingScore > blogScore,
    `Pricing visit (${pricingScore}) should score higher than blog (${blogScore})`);
  assert.ok(pricingScore >= 70, 'Pricing page should be high value');
});

test('Long LinkedIn comment should get bonus points', () => {
  const shortComment: Signal = {
    type: 'linkedin_engagement',
    action: 'commented',
    content: 'Great!',
    timestamp: new Date().toISOString()
  };

  const longComment: Signal = {
    type: 'linkedin_engagement',
    action: 'commented',
    content: 'This is exactly the challenge we face at our company. We have 50 sales reps spending hours on manual data entry when they should be selling. We need a solution that integrates with Salesforce and can scale with our team.',
    timestamp: new Date().toISOString()
  };

  const shortScore = calculateQuantitativeScore(shortComment);
  const longScore = calculateQuantitativeScore(longComment);

  assert.ok(longScore > shortScore,
    'Long detailed comment should score higher than short one');
});

test('High bounce rate should penalize website visit', () => {
  const normalVisit: Signal = {
    type: 'website_visit',
    page: '/features',
    duration: 60,
    bounceRate: 0.3,
    timestamp: new Date().toISOString()
  };

  const bouncedVisit: Signal = {
    type: 'website_visit',
    page: '/features',
    duration: 60,
    bounceRate: 0.9,
    timestamp: new Date().toISOString()
  };

  const normalScore = calculateQuantitativeScore(normalVisit);
  const bouncedScore = calculateQuantitativeScore(bouncedVisit);

  assert.ok(normalScore > bouncedScore,
    'Normal visit should score higher than high-bounce visit');
});

test('Repeat visits should increase score', () => {
  const firstVisit: Signal = {
    type: 'website_visit',
    page: '/pricing',
    duration: 120,
    visitNumber: 1,
    timestamp: new Date().toISOString()
  };

  const thirdVisit: Signal = {
    type: 'website_visit',
    page: '/pricing',
    duration: 120,
    visitNumber: 3,
    timestamp: new Date().toISOString()
  };

  const firstScore = calculateQuantitativeScore(firstVisit);
  const thirdScore = calculateQuantitativeScore(thirdVisit);

  assert.ok(thirdScore > firstScore,
    '3rd visit should score higher than 1st visit');
});

test('New VP in evaluation window should score well', () => {
  const newVP: Signal = {
    type: 'job_change',
    toRole: 'VP Sales',
    daysInRole: 45, // Sweet spot: 15-90 days
    metadata: {
      seniorityIncrease: true,
      companyStage: 'series_b'
    },
    timestamp: new Date().toISOString()
  };

  const score = calculateQuantitativeScore(newVP);

  assert.ok(score >= 70, 'New VP in eval window should score high');
});

test('analyzeSignal should include temporal factors', () => {
  const recentSignal: Signal = {
    type: 'linkedin_engagement',
    action: 'commented',
    content: 'Looking for solutions',
    timestamp: new Date().toISOString() // Now
  };

  const analyzed = analyzeSignal(recentSignal, [recentSignal]);

  assert.ok(analyzed.temporalFactors, 'Should have temporal factors');
  assert.ok(analyzed.temporalFactors.recency > 0.9, 'Recent signal should have high recency');
  assert.strictEqual(analyzed.temporalFactors.frequency, 1, 'Should count frequency');
});

test('Multiple similar signals should increase frequency', () => {
  const signal1: Signal = {
    type: 'website_visit',
    page: '/pricing',
    timestamp: '2026-01-01T10:00:00Z'
  };

  const signal2: Signal = {
    type: 'website_visit',
    page: '/features',
    timestamp: '2026-01-02T10:00:00Z'
  };

  const signal3: Signal = {
    type: 'website_visit',
    page: '/pricing',
    timestamp: '2026-01-03T10:00:00Z'
  };

  const allSignals = [signal1, signal2, signal3];
  const analyzed = analyzeSignal(signal3, allSignals);

  assert.ok(analyzed.temporalFactors.frequency >= 2,
    'Should detect multiple website visits');
});

