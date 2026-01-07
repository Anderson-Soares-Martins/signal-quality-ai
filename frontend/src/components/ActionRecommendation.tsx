import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Clock, Target, TrendingUp, DollarSign } from "lucide-react";
import type { RecommendedAction, EstimatedOutcome, MatchedPattern } from "@/types";

interface ActionRecommendationProps {
  action?: RecommendedAction;
  outcome?: EstimatedOutcome;
  patterns?: MatchedPattern[];
}

export function ActionRecommendation({ action, outcome, patterns }: ActionRecommendationProps) {
  if (!action) return null;

  return (
    <div className="space-y-4">
      {/* Matched Patterns */}
      {patterns && patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Matched Patterns
            </CardTitle>
            <CardDescription>Historical patterns found in similar scenarios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {patterns.map((pattern, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <h4 className="font-medium">{pattern.name}</h4>
                  {pattern.confidence && (
                    <p className="text-sm text-muted-foreground">
                      Confidence: {Math.round(pattern.confidence * 100)}%
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">
                    {pattern.historicalConversion}% conversion
                  </p>
                  {pattern.avgDaysToClose && (
                    <p className="text-xs text-muted-foreground">
                      ~{pattern.avgDaysToClose} days to close
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommended Action */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recommended Action
          </CardTitle>
          <CardDescription>Next steps to maximize conversion probability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Action Type</p>
              <p className="font-medium">{action.type}</p>
            </div>
            {action.channel && (
              <div>
                <p className="text-sm text-muted-foreground">Channel</p>
                <Badge variant="outline">{action.channel}</Badge>
              </div>
            )}
            {action.timing && (
              <div>
                <p className="text-sm text-muted-foreground">Timing</p>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {action.timing}
                </p>
              </div>
            )}
            {action.messagingAngle && (
              <div>
                <p className="text-sm text-muted-foreground">Messaging Angle</p>
                <p className="font-medium">{action.messagingAngle}</p>
              </div>
            )}
          </div>

          {action.suggestedMessage && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Suggested Message
                </h4>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{action.suggestedMessage}</p>
                </div>
              </div>
            </>
          )}

          {action.nextSteps && action.nextSteps.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium">Next Steps</h4>
                <ol className="space-y-2">
                  {action.nextSteps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-primary text-primary-foreground rounded-full text-xs font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{step.action}</p>
                        <p className="text-xs text-muted-foreground">{step.timing}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Estimated Outcome */}
      {outcome && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Estimated Outcome
            </CardTitle>
            <CardDescription>Predicted results based on historical data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {Math.round(outcome.conversionProbability * 100)}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">Conversion Probability</p>
              </div>
              {outcome.estimatedDaysToClose && (
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">
                    {outcome.estimatedDaysToClose}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Days to Close</p>
                </div>
              )}
              {outcome.estimatedDealValue && (
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600 flex items-center justify-center gap-1">
                    <DollarSign className="h-6 w-6" />
                    {outcome.estimatedDealValue}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Deal Value</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
