import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { SignalBreakdownItem } from "@/types";

interface SignalBreakdownProps {
  breakdown: SignalBreakdownItem[];
}

export function SignalBreakdown({ breakdown }: SignalBreakdownProps) {
  const topSignals = breakdown.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signal Breakdown</CardTitle>
        <CardDescription>Top contributing signals to the quality score</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {topSignals.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{item.signal}</h4>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Weight: {item.weight}%</span>
                <span className="font-semibold text-sm">Score: {item.score}</span>
              </div>
            </div>
            <Progress value={item.score} className="h-2" />
            <p className="text-sm text-muted-foreground">{item.reasoning}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
