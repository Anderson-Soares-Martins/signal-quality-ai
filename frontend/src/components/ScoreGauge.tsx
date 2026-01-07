import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertCircle, Zap } from "lucide-react";

interface ScoreGaugeProps {
  score: number;
  confidence: string;
  priorityLevel: string;
}

export function ScoreGauge({ score, confidence, priorityLevel }: ScoreGaugeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getPriorityColor = (priority: string) => {
    const lowerPriority = priority.toLowerCase();
    if (lowerPriority === "urgent" || lowerPriority === "high") return "destructive";
    if (lowerPriority === "medium") return "default";
    return "secondary";
  };

  const getPriorityIcon = (priority: string) => {
    const lowerPriority = priority.toLowerCase();
    if (lowerPriority === "urgent") return <Zap className="h-4 w-4" />;
    if (lowerPriority === "high") return <TrendingUp className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <Card className="border-2">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-48 h-48">
            {/* Outer circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(score / 100) * 553} 553`}
                className={getScoreColor(score)}
                strokeLinecap="round"
              />
            </svg>
            {/* Score display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-5xl font-bold ${getScoreColor(score)}`}>
                {score}
              </span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={getPriorityColor(priorityLevel)} className="flex items-center gap-1">
                {getPriorityIcon(priorityLevel)}
                {priorityLevel.toUpperCase()}
              </Badge>
              <Badge variant="outline">{confidence.toUpperCase()}</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
