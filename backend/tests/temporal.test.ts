import { test } from 'node:test';
import assert from 'node:assert';
import { calculateRecencyScore, getTimeContext } from '../src/utils/temporal.js';

/**
 * Unit tests for Temporal utilities
 * Run with: npm test
 */

test('Recent signal should have high recency score', () => {
  const now = new Date().toISOString();
  const score = calculateRecencyScore(now);

  assert.ok(score >= 0.95, `Recent signal should score near 1.0, got ${score}`);
});

test('Old signal should have low recency score', () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const score = calculateRecencyScore(thirtyDaysAgo);

  assert.ok(score < 0.3, `30-day old signal should score low, got ${score}`);
});

test('Recency should decay exponentially', () => {
  const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const score1 = calculateRecencyScore(oneDayAgo);
  const score7 = calculateRecencyScore(sevenDaysAgo);
  const score14 = calculateRecencyScore(fourteenDaysAgo);

  // Should decay exponentially (7 days = half-life by default)
  assert.ok(score1 > score7, '1 day should score higher than 7 days');
  assert.ok(score7 > score14, '7 days should score higher than 14 days');
  assert.ok(score7 > score14 * 1.5, 'Decay should be exponential, not linear');
});

test('Undefined timestamp should return neutral score', () => {
  const score = calculateRecencyScore(undefined);
  assert.strictEqual(score, 0.5, 'Undefined timestamp should return 0.5');
});

test('getTimeContext should identify very recent signals', () => {
  const now = new Date().toISOString();
  const context = getTimeContext(now);

  assert.ok(context.isVeryRecent, 'Current time should be very recent');
  assert.ok(context.isRecent, 'Current time should be recent');
  assert.ok(context.daysAgo === 0, 'Should be 0 days ago');
});

test('getTimeContext should identify old signals', () => {
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  const context = getTimeContext(tenDaysAgo);

  assert.ok(!context.isVeryRecent, '10 days ago is not very recent');
  assert.ok(!context.isRecent, '10 days ago is not recent (>7 days)');
  assert.strictEqual(context.daysAgo, 10, 'Should be 10 days ago');
});

test('getTimeContext should handle undefined gracefully', () => {
  const context = getTimeContext(undefined);

  assert.strictEqual(context.timeframe, 'unknown');
  assert.strictEqual(context.daysAgo, 0);
  assert.strictEqual(context.isRecent, false);
});

test('Custom half-life should affect decay rate', () => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const defaultHalfLife = calculateRecencyScore(sevenDaysAgo, 7);   // 7 days
  const shortHalfLife = calculateRecencyScore(sevenDaysAgo, 3);     // 3 days
  const longHalfLife = calculateRecencyScore(sevenDaysAgo, 14);     // 14 days

  // With 7-day half-life, score at 7 days should be ~0.5
  assert.ok(Math.abs(defaultHalfLife - 0.5) < 0.1, 'Default half-life should be ~0.5 at 7 days');

  // Shorter half-life = faster decay
  assert.ok(shortHalfLife < defaultHalfLife, 'Shorter half-life should decay faster');

  // Longer half-life = slower decay
  assert.ok(longHalfLife > defaultHalfLife, 'Longer half-life should decay slower');
});

