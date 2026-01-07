import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, AlertTriangle, Activity } from "lucide-react";

interface Scenario {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  expectedScore: string;
}

interface ScenarioSelectorProps {
  onSelect: (scenarioId: string) => void;
  loading?: boolean;
}

const scenarios: Scenario[] = [
  {
    id: "high-quality",
    name: "Hot Lead",
    description: "Multiple strong buying signals. High intent, ready to engage.",
    icon: <TrendingUp className="h-8 w-8 text-green-600" />,
    expectedScore: "85-95",
  },
  {
    id: "false-positive",
    name: "False Positive",
    description: "Low quality signals. Likely not a good fit or low intent.",
    icon: <AlertTriangle className="h-8 w-8 text-red-600" />,
    expectedScore: "15-30",
  },
  {
    id: "mixed-signals",
    name: "Mixed Signals",
    description: "Some positive signals but needs nurturing. Medium priority.",
    icon: <Activity className="h-8 w-8 text-yellow-600" />,
    expectedScore: "50-65",
  },
];

export function ScenarioSelector({ onSelect, loading }: ScenarioSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Signal Quality Score AI</h2>
        <p className="text-muted-foreground">
          Analyze buyer intent signals and get AI-powered recommendations
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {scenarios.map((scenario) => (
          <Card
            key={scenario.id}
            className="hover:border-primary cursor-pointer transition-colors"
            onClick={() => !loading && onSelect(scenario.id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                {scenario.icon}
                <span className="text-sm font-medium text-muted-foreground">
                  Score: {scenario.expectedScore}
                </span>
              </div>
              <CardTitle>{scenario.name}</CardTitle>
              <CardDescription>{scenario.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                variant={scenario.id === "high-quality" ? "default" : "outline"}
                disabled={loading}
              >
                {loading ? "Analyzing..." : "Analyze Scenario"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
