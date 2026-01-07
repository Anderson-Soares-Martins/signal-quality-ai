import { z } from 'zod';

// Signal type enum
export const SignalType = z.enum([
  'linkedin_engagement',
  'website_visit',
  'job_change',
  'content_download',
  'email_interaction',
  'tech_stack_change',
  'hiring_signals',
  'company_news',
  'intent_data'
]);

// Individual signal schema
export const SignalSchema = z.object({
  type: SignalType,
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
  // Type-specific fields
  action: z.string().optional(),
  content: z.string().optional(),
  page: z.string().optional(),
  duration: z.number().optional(),
  visitNumber: z.number().optional(),
  fromCompany: z.string().optional(),
  toCompany: z.string().optional(),
  fromRole: z.string().optional(),
  toRole: z.string().optional(),
  startDate: z.string().optional(),
  daysInRole: z.number().optional(),
  asset: z.string().optional(),
  newsType: z.string().optional(),
  details: z.string().optional(),
  bounceRate: z.number().optional(),
  clickedLink: z.boolean().optional()
});

// Prospect schema
export const ProspectSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  company: z.string(),
  role: z.string(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  location: z.string().optional()
});

// Request options schema
export const RequestOptionsSchema = z.object({
  includeHistoricalComparison: z.boolean().optional().default(true),
  generateMessage: z.boolean().optional().default(true),
  llmProvider: z.enum(['anthropic']).optional().default('anthropic')
});

// Analysis request schema
export const AnalysisRequestSchema = z.object({
  signals: z.array(SignalSchema).min(1),
  prospect: ProspectSchema,
  options: RequestOptionsSchema.optional().default({})
});

// Qualitative context schema
export const QualitativeContextSchema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  painPoints: z.array(z.string()).optional(),
  urgency: z.enum(['low', 'medium', 'high']).optional(),
  specificity: z.enum(['low', 'medium', 'high']).optional(),
  buyingStage: z.enum(['awareness', 'consideration', 'decision', 'unknown']).optional(),
  falsePositiveRisk: z.enum(['low', 'medium', 'high']).optional(),
  confidence: z.number().min(0).max(1).optional()
});

// Temporal factors schema
export const TemporalFactorsSchema = z.object({
  recency: z.number().min(0).max(1),
  frequency: z.number().min(1),
  velocity: z.enum(['increasing', 'stable', 'decreasing']).optional()
});

// Analyzed signal schema
export const AnalyzedSignalSchema = z.object({
  type: SignalType,
  rawData: z.any(),
  quantitativeScore: z.number().min(0).max(100),
  qualitativeContext: QualitativeContextSchema,
  temporalFactors: TemporalFactorsSchema
});

// Pattern schema
export const PatternSchema = z.object({
  pattern: z.string(),
  signals: z.array(z.any()),
  historicalConversion: z.number().min(0).max(100),
  avgDaysToClose: z.number().optional(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1).optional()
});

// Signal breakdown item schema
export const SignalBreakdownSchema = z.object({
  signal: z.string(),
  weight: z.number(),
  score: z.number().min(0).max(100),
  reasoning: z.string(),
  extractedContext: z.record(z.any()).optional()
});

// Recommended action schema
export const RecommendedActionSchema = z.object({
  type: z.string(),
  channel: z.string().optional(),
  timing: z.string().optional(),
  priority: z.string().optional(),
  messagingAngle: z.string().optional(),
  suggestedMessage: z.string().optional(),
  reasoning: z.record(z.any()).optional(),
  doNotMention: z.array(z.string()).optional()
});

// Historical win schema
export const HistoricalWinSchema = z.object({
  dealId: z.string().optional(),
  company: z.string(),
  similarityScore: z.number().min(0).max(1),
  signalPattern: z.string(),
  outcome: z.string(),
  daysToClose: z.number().optional(),
  dealValue: z.string().optional()
});

// Analysis response schema
export const AnalysisResponseSchema = z.object({
  qualityScore: z.number().min(0).max(100),
  confidence: z.enum(['low', 'medium', 'high']),
  priorityLevel: z.enum(['ignore', 'low', 'medium', 'high', 'urgent']),
  analysis: z.object({
    summary: z.string(),
    keyInsights: z.array(z.string()).optional(),
    redFlags: z.array(z.string()).optional(),
    dataGaps: z.array(z.string()).optional()
  }).optional(),
  signalBreakdown: z.array(SignalBreakdownSchema),
  matchedPatterns: z.array(PatternSchema).optional(),
  recommendedAction: RecommendedActionSchema,
  similarHistoricalWins: z.array(HistoricalWinSchema).optional(),
  estimatedOutcome: z.object({
    conversionProbability: z.number().min(0).max(1),
    estimatedDaysToClose: z.number().optional(),
    estimatedDealValue: z.string().optional(),
    confidence: z.enum(['low', 'medium', 'high']),
    reasoning: z.string().optional()
  }).optional(),
  metadata: z.object({
    generatedAt: z.string().datetime(),
    analysisVersion: z.string(),
    llmModel: z.string().optional(),
    signalSources: z.array(z.string()).optional()
  })
});

// Feedback schema (for learning loop)
export const FeedbackSchema = z.object({
  analysisId: z.string(),
  outcome: z.enum(['won', 'lost', 'in_progress', 'disqualified']),
  actualDaysToClose: z.number().optional(),
  actualDealValue: z.number().optional(),
  notes: z.string().optional()
});

// Type exports inferred from Zod schemas
export type Signal = z.infer<typeof SignalSchema>;
export type Prospect = z.infer<typeof ProspectSchema>;
export type RequestOptions = z.infer<typeof RequestOptionsSchema>;
export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;
export type QualitativeContext = z.infer<typeof QualitativeContextSchema>;
export type TemporalFactors = z.infer<typeof TemporalFactorsSchema>;
export type AnalyzedSignal = z.infer<typeof AnalyzedSignalSchema>;
export type Pattern = z.infer<typeof PatternSchema>;
export type SignalBreakdown = z.infer<typeof SignalBreakdownSchema>;
export type RecommendedAction = z.infer<typeof RecommendedActionSchema>;
export type HistoricalWin = z.infer<typeof HistoricalWinSchema>;
export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;
export type Feedback = z.infer<typeof FeedbackSchema>;
export type SignalTypeEnum = z.infer<typeof SignalType>;

