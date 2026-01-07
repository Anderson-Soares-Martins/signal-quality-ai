import { AnalyzedSignal, Prospect } from '../utils/schemas.js';

interface MatchedPattern {
  pattern?: string;
  name?: string;
  historicalConversion?: number;
  avgDaysToClose?: number | null;
}

/**
 * Message Generator
 * Creates personalized outreach messages based on signals and context
 */

/**
 * Generate personalized message
 */
export function generatePersonalizedMessage(
  prospect: Prospect,
  enrichedSignals: AnalyzedSignal[],
  angle: string,
  painPointFocus: string | null,
  _patterns: MatchedPattern[]
): string {
  const name = prospect.name || 'there';
  const company = prospect.company;
  const role = prospect.role || '';

  // Find the trigger signal (most significant)
  const triggerSignal = findTriggerSignal(enrichedSignals);

  // Generate message based on angle and trigger
  let message = '';

  if (angle === 'scaling_productivity' && painPointFocus) {
    message = generateScalingMessage(name, company, triggerSignal, painPointFocus);
  } else if (angle === 'time_savings' && painPointFocus) {
    message = generateTimeSavingsMessage(name, company, triggerSignal, painPointFocus);
  } else if (angle === 'integration_solution' && painPointFocus) {
    message = generateIntegrationMessage(name, company, triggerSignal, painPointFocus);
  } else if (angle === 'new_role_stack_evaluation') {
    message = generateNewRoleMessage(name, company, role);
  } else if (angle === 'quick_roi') {
    message = generateQuickROIMessage(name, company, triggerSignal);
  } else {
    message = generateGenericMessage(name, company, role, triggerSignal);
  }

  return message;
}

/**
 * Find the most significant trigger signal
 */
function findTriggerSignal(enrichedSignals: AnalyzedSignal[]): AnalyzedSignal {
  // Prioritize LinkedIn comments (most personal)
  const linkedinComment = enrichedSignals.find(s => {
    const rawData = s.rawData as Record<string, unknown>;
    return s.type === 'linkedin_engagement' && rawData.action === 'commented';
  });
  if (linkedinComment) return linkedinComment;

  // Then content downloads
  const contentDownload = enrichedSignals.find(s => s.type === 'content_download');
  if (contentDownload) return contentDownload;

  // Then website visits to pricing
  const pricingVisit = enrichedSignals.find(s => {
    const rawData = s.rawData as Record<string, unknown>;
    return s.type === 'website_visit' && String(rawData.page || '').includes('pricing');
  });
  if (pricingVisit) return pricingVisit;

  // Default to first signal
  return enrichedSignals[0];
}

/**
 * Generate scaling/productivity message
 */
function generateScalingMessage(
  name: string,
  company: string,
  triggerSignal: AnalyzedSignal,
  painPoint: string
): string {
  let hook = '';

  if (triggerSignal.type === 'linkedin_engagement') {
    hook = `Saw your comment about ${painPoint} - that's exactly the challenge we help companies solve at scale.`;
  } else {
    hook = `I noticed ${company} is growing rapidly. Most teams at your stage struggle with ${painPoint}.`;
  }

  return `Hi ${name},

${hook}

[Similar Company] was in a similar spot and cut their admin time by 65% while scaling from 50 to 150 reps.

Worth a 15-min conversation? I can show you their exact playbook.

Best,
[Your Name]`;
}

/**
 * Generate time savings message
 */
function generateTimeSavingsMessage(
  name: string,
  company: string,
  triggerSignal: AnalyzedSignal,
  painPoint: string
): string {
  let hook = '';

  if (triggerSignal.type === 'linkedin_engagement') {
    hook = `Saw your comment about ${painPoint}.`;
  } else {
    hook = `Most ${company} teams tell us they're losing hours daily to ${painPoint}.`;
  }

  return `Hi ${name},

${hook}

Quick question: if you could give your team back 10+ hours per week, what would they focus on instead?

That's what we delivered for [Similar Company] - their reps now spend 70% more time actually selling.

15 minutes to walk you through how? I can share their metrics.

Best,
[Your Name]`;
}

/**
 * Generate integration message
 */
function generateIntegrationMessage(
  name: string,
  _company: string,
  _triggerSignal: AnalyzedSignal,
  painPoint: string
): string {
  return `Hi ${name},

Saw you're exploring ${painPoint} solutions.

[Similar Company] had the same challenge - they needed something that actually worked with their Salesforce setup, not another tool that created more work.

Our integration took them 2 weeks to deploy (not months) and cut data entry by 80%.

Worth a quick look at their implementation?

Best,
[Your Name]`;
}

/**
 * Generate new role message
 */
function generateNewRoleMessage(name: string, company: string, role: string): string {
  return `Hi ${name},

Congrats on the ${role} role at ${company}!

Most new ${role}s we talk to spend their first 90 days evaluating their tech stack - especially sales automation.

[Similar Company]'s new VP made the switch in month 2 and hasn't looked back. Their team's now 2x more productive.

Quick 15-min overview of what they implemented?

Best,
[Your Name]`;
}

/**
 * Generate quick ROI message
 */
function generateQuickROIMessage(name: string, company: string, _triggerSignal: AnalyzedSignal): string {
  return `Hi ${name},

I'll keep this short.

${company} profile = companies that typically see 3-4x ROI in first quarter with us.

[Similar Company] got to positive ROI in 6 weeks. Literally paid for itself in saved rep time.

15 minutes to see if you'd see similar results?

Best,
[Your Name]`;
}

/**
 * Generate generic value prop message
 */
function generateGenericMessage(
  name: string,
  company: string,
  role: string,
  triggerSignal: AnalyzedSignal
): string {
  let hook = `I noticed ${company} is in [industry]`;

  if (triggerSignal.type === 'linkedin_engagement') {
    hook = 'Saw you engaging with content about sales productivity';
  } else if (triggerSignal.type === 'website_visit') {
    hook = 'Noticed you checking out our solutions';
  } else if (triggerSignal.type === 'content_download') {
    hook = 'Thanks for downloading our case study';
  }

  return `Hi ${name},

${hook} - most ${role}s in your space face similar challenges around scaling their sales operations.

[Similar Company] cut their sales cycle by 40% and increased rep productivity by 65% with our platform.

Worth a quick conversation to see if there's a fit?

Best,
[Your Name]`;
}

/**
 * Generate follow-up message (for use in next steps)
 */
export function generateFollowUpMessage(prospect: Prospect, _initialMessage: string): string {
  const name = prospect.name || 'there';

  return `Hi ${name},

Following up on my last message - wanted to share a quick case study that might be relevant.

[Similar Company] faced [specific challenge] and solved it in [timeframe] with [specific result].

Here's the 2-page case study: [link]

Let me know if you'd like to discuss how they did it.

Best,
[Your Name]`;
}

interface MessageTemplate {
  subject: string;
  approach: string;
  tone: string;
}

/**
 * Generate message templates based on pattern
 */
export function getMessageTemplate(patternId: string): MessageTemplate {
  const templates: Record<string, MessageTemplate> = {
    engaged_evaluator: {
      subject: 'Re: [Topic they commented on]',
      approach: 'Reference their LinkedIn engagement, provide social proof, low-friction CTA',
      tone: 'Conversational and helpful'
    },
    new_role_evaluator: {
      subject: 'Congrats on the new role',
      approach: 'Acknowledge career move, focus on quick wins in first 90 days',
      tone: 'Professional but warm'
    },
    active_evaluator_with_budget: {
      subject: 'Quick ROI check',
      approach: 'Lead with metrics and speed to value',
      tone: 'Direct and results-focused'
    },
    ready_to_buy: {
      subject: 'Implementation timeline',
      approach: 'Assume they\'re ready, focus on next steps',
      tone: 'Consultative and action-oriented'
    }
  };

  return templates[patternId] || templates.engaged_evaluator;
}

