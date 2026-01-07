export interface Signal {
  type: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  source?: string;
  content?: string;
}

export interface Prospect {
  name?: string;
  company: string;
  role?: string;
  industry?: string;
  companySize?: string;
  location?: string;
}

export interface SignalBreakdownItem {
  signal: string;
  weight: number;
  score: number;
  reasoning: string;
}

export interface MatchedPattern {
  name: string;
  historicalConversion: number;
  avgDaysToClose: number | null;
  confidence?: number;
}

export interface RecommendedAction {
  type: string;
  channel?: string;
  timing?: string;
  messagingAngle?: string;
  suggestedMessage?: string;
  nextSteps?: Array<{
    action: string;
    timing: string;
  }>;
}

export interface EstimatedOutcome {
  conversionProbability: number;
  estimatedDaysToClose?: number;
  estimatedDealValue?: string;
}

export interface Analysis {
  summary: string;
  keyInsights?: string[];
}

export interface AnalysisResult {
  qualityScore: number;
  confidence: string;
  priorityLevel: string;
  analysis?: Analysis;
  signalBreakdown: SignalBreakdownItem[];
  matchedPatterns?: MatchedPattern[];
  recommendedAction?: RecommendedAction;
  estimatedOutcome?: EstimatedOutcome;
}

export interface ExampleScenario {
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
