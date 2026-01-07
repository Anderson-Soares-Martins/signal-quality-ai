#!/usr/bin/env node

import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { analyzeSignals } from '../src/analyzers/signalAnalyzer.js';
import { enrichSignalsWithContext } from '../src/analyzers/llmExtractor.js';
import { identifyPatterns } from '../src/analyzers/patternMatcher.js';
import { calculateQualityScore } from '../src/scoring/qualityScorer.js';
import { generateActionRecommendation } from '../src/recommendations/actionEngine.js';
import { Signal, Prospect } from '../src/utils/schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for better CLI output
interface Colors {
  reset: string;
  bright: string;
  green: string;
  yellow: string;
  red: string;
  cyan: string;
  magenta: string;
}

const colors: Colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function printHeader(text: string): void {
  console.log('\n' + colors.bright + colors.cyan + '═'.repeat(80) + colors.reset);
  console.log(colors.bright + colors.cyan + text + colors.reset);
  console.log(colors.bright + colors.cyan + '═'.repeat(80) + colors.reset + '\n');
}

function printSection(title: string): void {
  console.log('\n' + colors.bright + colors.magenta + '▶ ' + title + colors.reset);
  console.log(colors.magenta + '─'.repeat(60) + colors.reset);
}

function printScore(score: number): string {
  let color: string;
  if (score >= 85) color = colors.green;
  else if (score >= 70) color = colors.cyan;
  else if (score >= 50) color = colors.yellow;
  else color = colors.red;

  return color + colors.bright + score + colors.reset;
}

function printPriority(priority: string): string {
  const priorityColors: Record<string, string> = {
    'urgent': colors.red,
    'high': colors.green,
    'medium': colors.yellow,
    'low': colors.yellow,
    'ignore': colors.red
  };

  const color = priorityColors[priority] || colors.reset;
  return color + colors.bright + priority.toUpperCase() + colors.reset;
}

interface ExampleData {
  description: string;
  signals: Signal[];
  prospect: Prospect;
  expectedOutcome?: {
    qualityScore?: string;
    priorityLevel?: string;
    conversionProbability?: string;
    reasoning?: string;
  };
}

async function analyzeExample(examplePath: string, exampleName: string): Promise<void> {
  printHeader(`Analyzing: ${exampleName}`);

  // Load example data
  const exampleData = JSON.parse(readFileSync(examplePath, 'utf-8')) as ExampleData;
  const { signals, prospect, description, expectedOutcome } = exampleData;

  console.log(colors.bright + 'Description: ' + colors.reset + description);
  console.log(colors.bright + 'Prospect: ' + colors.reset + `${prospect.name || prospect.company} - ${prospect.role || ''}`);
  console.log(colors.bright + 'Signals: ' + colors.reset + `${signals.length} signals detected\n`);

  // Run analysis
  console.log('Running analysis...\n');

  // Step 1: Analyze signals
  const analyzedSignals = analyzeSignals(signals);

  // Step 2: Enrich with LLM context
  const enrichedSignals = await enrichSignalsWithContext(analyzedSignals, prospect);

  // Step 3: Identify patterns
  const patterns = identifyPatterns(enrichedSignals);

  // Step 4: Calculate quality score
  const scoringResult = calculateQualityScore(enrichedSignals, patterns, prospect);

  // Step 5: Generate recommendations
  const recommendation = generateActionRecommendation(
    scoringResult,
    enrichedSignals,
    prospect,
    { generateMessage: true }
  );

  // Display results
  printSection('QUALITY SCORE');
  console.log('Score: ' + printScore(recommendation.qualityScore) + ' / 100');
  console.log('Confidence: ' + colors.bright + recommendation.confidence.toUpperCase() + colors.reset);
  console.log('Priority: ' + printPriority(recommendation.priorityLevel));

  if (recommendation.analysis) {
    printSection('ANALYSIS SUMMARY');
    console.log(recommendation.analysis.summary);

    if (recommendation.analysis.keyInsights && recommendation.analysis.keyInsights.length > 0) {
      console.log('\n' + colors.bright + 'Key Insights:' + colors.reset);
      recommendation.analysis.keyInsights.forEach(insight => {
        console.log('  • ' + insight);
      });
    }
  }

  printSection('SIGNAL BREAKDOWN');
  (recommendation.signalBreakdown as Array<{ signal: string; weight: number; score: number; reasoning: string }>).slice(0, 3).forEach((signal, index) => {
    console.log(`\n${index + 1}. ${colors.bright}${signal.signal}${colors.reset} (Weight: ${signal.weight}%, Score: ${signal.score})`);
    console.log(`   ${signal.reasoning}`);
  });

  if (recommendation.matchedPatterns && recommendation.matchedPatterns.length > 0) {
    printSection('MATCHED PATTERNS');
    recommendation.matchedPatterns.forEach((pattern: { name: string; historicalConversion: number; avgDaysToClose: number | null; confidence?: number }) => {
      console.log(`\n${colors.bright}${pattern.name}${colors.reset}`);
      console.log(`  Conversion Rate: ${colors.green}${pattern.historicalConversion}%${colors.reset}`);
      console.log(`  Avg Days to Close: ${pattern.avgDaysToClose || 'N/A'}`);
      if (pattern.confidence !== undefined) {
        console.log(`  Confidence: ${Math.round(pattern.confidence * 100)}%`);
      }
    });
  }

  if (recommendation.recommendedAction) {
    printSection('RECOMMENDED ACTION');
    const action = recommendation.recommendedAction;

    console.log(`Type: ${colors.bright}${action.type}${colors.reset}`);
    if (action.channel) {
      console.log(`Channel: ${colors.bright}${action.channel}${colors.reset}`);
    }
    if (action.timing) {
      console.log(`Timing: ${colors.bright}${action.timing}${colors.reset}`);
    }
    if (action.messagingAngle) {
      console.log(`Angle: ${colors.bright}${action.messagingAngle}${colors.reset}`);
    }

    if (action.suggestedMessage) {
      printSection('SUGGESTED MESSAGE');
      console.log(colors.cyan + action.suggestedMessage + colors.reset);
    }

    if (action.nextSteps && action.nextSteps.length > 0) {
      printSection('NEXT STEPS');
      action.nextSteps.forEach((step, index) => {
        console.log(`${index + 1}. ${step.action} (${step.timing})`);
      });
    }
  }

  if (recommendation.estimatedOutcome) {
    printSection('ESTIMATED OUTCOME');
    const outcome = recommendation.estimatedOutcome;
    console.log(`Conversion Probability: ${colors.green}${Math.round(outcome.conversionProbability * 100)}%${colors.reset}`);
    if (outcome.estimatedDaysToClose) {
      console.log(`Estimated Days to Close: ${outcome.estimatedDaysToClose}`);
    }
    if (outcome.estimatedDealValue) {
      console.log(`Estimated Deal Value: ${outcome.estimatedDealValue}`);
    }
  }

  if (expectedOutcome) {
    printSection('EXPECTED vs ACTUAL');
    console.log(`Expected Score: ${expectedOutcome.qualityScore || 'N/A'}`);
    console.log(`Actual Score: ${printScore(recommendation.qualityScore)}`);
    console.log(`\nExpected Priority: ${expectedOutcome.priorityLevel || 'N/A'}`);
    console.log(`Actual Priority: ${printPriority(recommendation.priorityLevel)}`);
  }

  console.log('\n' + colors.cyan + '═'.repeat(80) + colors.reset + '\n');
}

interface ExampleConfig {
  path: string;
  name: string;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const exampleType = args[0];

  const examples: Record<string, ExampleConfig> = {
    'high': {
      path: join(__dirname, '../data/examples/high-quality.json'),
      name: 'High-Quality Signal Cluster'
    },
    'false': {
      path: join(__dirname, '../data/examples/false-positive.json'),
      name: 'False Positive Detection'
    },
    'mixed': {
      path: join(__dirname, '../data/examples/mixed-signals.json'),
      name: 'Mixed Signals'
    }
  };

  printHeader('Signal Quality Score AI - CLI Demo');

  if (!exampleType || !examples[exampleType]) {
    console.log(colors.bright + 'Usage:' + colors.reset);
    console.log('  npm run demo [type]\n');
    console.log(colors.bright + 'Available types:' + colors.reset);
    console.log('  high  - High-quality signal cluster (score: 90+)');
    console.log('  false - False positive detection (score: 20-30)');
    console.log('  mixed - Mixed signals needing more data (score: 50-60)\n');
    console.log(colors.bright + 'Example:' + colors.reset);
    console.log('  npm run demo high\n');
    return;
  }

  const example = examples[exampleType];

  try {
    await analyzeExample(example.path, example.name);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(colors.red + 'Error running analysis:' + colors.reset, errorMessage);
    if (errorStack) {
      console.error(errorStack);
    }
    process.exit(1);
  }
}

main();

