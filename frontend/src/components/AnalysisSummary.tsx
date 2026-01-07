import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import type { Analysis } from "@/types";

interface AnalysisSummaryProps {
  analysis?: Analysis;
}

export function AnalysisSummary({ analysis }: AnalysisSummaryProps) {
  if (!analysis) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis Summary</CardTitle>
        <CardDescription>AI-powered insights from signal analysis</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed">{analysis.summary}</p>

        {analysis.keyInsights && analysis.keyInsights.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-600" />
              Key Insights
            </h4>
            <ul className="space-y-2">
              {analysis.keyInsights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
