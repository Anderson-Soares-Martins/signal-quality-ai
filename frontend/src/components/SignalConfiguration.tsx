import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, RotateCcw } from "lucide-react";

interface SignalConfig {
  type: string;
  label: string;
  weight: number;
  defaultWeight: number;
  description: string;
  category: string;
}

const DEFAULT_CONFIGS: SignalConfig[] = [
  {
    type: "pricing_page_visit",
    label: "Pricing Page Visit",
    weight: 25,
    defaultWeight: 25,
    description: "High intent - actively evaluating cost",
    category: "High Intent",
  },
  {
    type: "demo_request",
    label: "Demo Request",
    weight: 30,
    defaultWeight: 30,
    description: "Extremely high intent - ready to see product",
    category: "High Intent",
  },
  {
    type: "product_trial",
    label: "Product Trial",
    weight: 28,
    defaultWeight: 28,
    description: "Hands-on evaluation phase",
    category: "High Intent",
  },
  {
    type: "linkedin_interaction",
    label: "LinkedIn Interaction",
    weight: 15,
    defaultWeight: 15,
    description: "Engaged with content publicly",
    category: "Engagement",
  },
  {
    type: "content_download",
    label: "Content Download",
    weight: 18,
    defaultWeight: 18,
    description: "Educational phase, building knowledge",
    category: "Engagement",
  },
  {
    type: "website_visit",
    label: "Website Visit",
    weight: 10,
    defaultWeight: 10,
    description: "General awareness and research",
    category: "Awareness",
  },
  {
    type: "email_open",
    label: "Email Open",
    weight: 8,
    defaultWeight: 8,
    description: "Basic engagement with outreach",
    category: "Awareness",
  },
];

export function SignalConfiguration() {
  const [configs, setConfigs] = useState<SignalConfig[]>(DEFAULT_CONFIGS);
  const [hasChanges, setHasChanges] = useState(false);

  const updateWeight = (type: string, newWeight: number) => {
    setConfigs(
      configs.map((config) =>
        config.type === type ? { ...config, weight: newWeight } : config
      )
    );
    setHasChanges(true);
  };

  const resetToDefaults = () => {
    setConfigs(
      configs.map((config) => ({
        ...config,
        weight: config.defaultWeight,
      }))
    );
    setHasChanges(false);
  };

  const saveChanges = () => {
    // In a real app, this would save to backend
    console.log("Saving configuration:", configs);
    alert("Configuration saved! (Demo: would persist to backend)");
    setHasChanges(false);
  };

  const totalWeight = configs.reduce((sum, config) => sum + config.weight, 0);
  const isBalanced = totalWeight === 100;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "High Intent":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "Engagement":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "Awareness":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Signal Weight Configuration
              </CardTitle>
              <CardDescription className="mt-2">
                Adjust how much each signal type impacts the quality score
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {totalWeight}
                <span className="text-sm font-normal text-muted-foreground ml-1">/ 100</span>
              </p>
              {!isBalanced && (
                <Badge variant="destructive" className="mt-1">
                  Weights must total 100%
                </Badge>
              )}
              {isBalanced && (
                <Badge variant="default" className="mt-1">
                  Balanced
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Signal Configurations */}
      <div className="grid gap-4">
        {configs.map((config) => (
          <Card key={config.type}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{config.label}</h4>
                      <Badge className={getCategoryColor(config.category)} variant="outline">
                        {config.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{config.weight}%</p>
                    {config.weight !== config.defaultWeight && (
                      <p className="text-xs text-muted-foreground">
                        (default: {config.defaultWeight}%)
                      </p>
                    )}
                  </div>
                </div>

                {/* Slider */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={config.weight}
                    onChange={(e) => updateWeight(config.type, parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center gap-4 sticky bottom-4 bg-background p-4 border rounded-lg shadow-lg">
        <Button
          onClick={resetToDefaults}
          variant="outline"
          className="gap-2"
          disabled={!hasChanges}
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
        <div className="flex gap-2">
          {hasChanges && (
            <Badge variant="secondary">Unsaved changes</Badge>
          )}
          <Button
            onClick={saveChanges}
            disabled={!hasChanges || !isBalanced}
          >
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
